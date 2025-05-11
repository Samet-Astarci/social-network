// Ağ verilerini yükleyip görselleştirecek 

async function loadAndVisualizeNetwork() {
    try {
        // veri yükleme ksımı 
        const response = await fetch('network_data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Veri doğrulama
        if (!data.nodes || !data.links) {
            throw new Error("Invalid data format: missing nodes or links");
        }

        console.log('Loaded data:', data);

        // SVG Ayarları
        const width = 1200;
        const height = 800;
        const minZoom = 0.1;
        const maxZoom = 4;

        // SVG Container
        const svg = d3.select('#network-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height])
            .call(d3.zoom()
                .extent([[0, 0], [width, height]])
                .scaleExtent([minZoom, maxZoom])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                }));

        // Ana grup
        const g = svg.append('g');

      
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'network-tooltip')
            .style('opacity', 0)
            .style('position', 'fixed'); // 'fixed' for better positioning

        // simülasyon kısmı 
        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links)
                .id(d => d.id)
                .distance(150) // Optimized default distance
            )
            .force('charge', d3.forceManyBody()
                .strength(d => d.isCentral ? -800 : -300) // Dynamic strength
            )
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide()
                .radius(d => (d.size || 5) + 2) // Safety margin
            );

        // links 
        const link = g.append('g')
            .selectAll('line')
            .data(data.links)
            .join('line')
            .attr('class', 'link')
            .attr('stroke', d => d.isImportant ? '#ff4444' : '#999')
            .attr('stroke-width', d => d.weight ? Math.sqrt(d.weight) : 1);

        //nodes 
        const node = g.append('g')
            .selectAll('circle')
            .data(data.nodes)
            .join('circle')
            .attr('r', d => d.size || 5) // Default size if not specified
            .attr('fill', d => d.color || '#69b3a2') // Default color
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        // labels 
        const label = g.append('g')
            .selectAll('text')
            .data(data.nodes)
            .join('text')
            .attr('class', 'node-label')
            .text(d => d.label || d.id) // Use label if available
            .attr('dy', 4)
            .style('font-size', '10px')
            .style('user-select', 'none');

    
        node.on('mouseover', function(event, d) {
                // Highlight connected elements
                link.attr('stroke-opacity', l => 
                    (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);
                
                node.attr('opacity', n => 
                    n.id === d.id || data.links.some(l => 
                        (l.source.id === d.id && l.target.id === n.id) || 
                        (l.source.id === n.id && l.target.id === d.id)
                    ) ? 1 : 0.3);

             
                tooltip.html(`
                    <strong>ID:</strong> ${d.id}<br>
                    <strong>Connections:</strong> ${d.connectionCount || 'N/A'}<br>
                    ${d.group ? `<strong>Group:</strong> ${d.group}` : ''}
                `)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 28}px`)
                .transition().duration(200).style('opacity', 1);
            })
            .on('mouseout', () => {
                // Reset styles
                link.attr('stroke-opacity', 0.6);
                node.attr('opacity', 1);
                tooltip.transition().duration(500).style('opacity', 0);
            });

        // güncelleme kısmı 
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => Math.max(10, Math.min(width - 10, d.x)))
                .attr('cy', d => Math.max(10, Math.min(height - 10, d.y)));

            label
                .attr('x', d => d.x + 12)
                .attr('y', d => d.y);
        });

        // drag fonskiyonları 
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

    } catch (error) {
        console.error('Error loading or visualizing data:', error);
        // Kullanıcı dostu hata mesajı
        d3.select('#network-container')
            .append('div')
            .attr('class', 'error-message')
            .html(`<p>Error loading visualization: ${error.message}</p>`);
    }
}

// Sayfa yüklendiğinde çalıştır
document.addEventListener('DOMContentLoaded', loadAndVisualizeNetwork);
