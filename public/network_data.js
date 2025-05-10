// Ağ verilerini yükle ve görselleştir
async function loadAndVisualizeNetwork() {
    try {
        const response = await fetch('http://localhost:3001/api/network-data');
        const data = await response.json();
        console.log('Yüklenen veri:', data);

        // SVG boyutları
        const width = 1200;
        const height = 800;

        // SVG oluştur
        const svg = d3.select('#network-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .call(d3.zoom()
                .extent([[0, 0], [width, height]])
                .scaleExtent([0.1, 4])
                .on('zoom', zoomed));

        // Tüm grafik öğelerini içerecek grup
        const g = svg.append('g');

        // Zoom fonksiyonu
        function zoomed(event) {
            g.attr('transform', event.transform);
        }

        // Tooltip oluştur
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('pointer-events', 'none');

        // Simülasyon oluştur
        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links)
                .id(d => d.id)
                .distance(d => {
                    // Öne çıkan düğümler arasındaki bağlantılar için daha uzun mesafe
                    if (d.source.isTop5 && d.target.isTop5) {
                        return 250;
                    }
                    // Normal bağlantılar için standart mesafe
                    return 180;
                })
            )
            .force('charge', d3.forceManyBody()
                .strength(d => {
                    // Öne çıkan düğümler için daha güçlü itme
                    if (d.isTop5) {
                        return -400;
                    }
                    // Normal düğümler için standart itme
                    return -250;
                })
            )
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide()
                .radius(d => d.size + 35)
                .strength(0.95)
            )
            .force('x', d3.forceX(width / 2).strength(0.05))
            .force('y', d3.forceY(height / 2).strength(0.05))
            .force('random', d3.forceX().strength(d => (Math.random() - 0.5) * 0.05));

        // Bağlantıları çiz
        const link = g.append('g')
            .selectAll('line')
            .data(data.links)
            .enter()
            .append('line')
            .attr('stroke', d => d.isTop5Connection ? '#ff4444' : '#999')
            .attr('stroke-opacity', d => d.isTop5Connection ? 0.8 : 0.4)
            .attr('stroke-width', d => d.isTop5Connection ? 4 : 2)
            .attr('class', 'link')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .attr('stroke', '#ff0000')
                    .attr('stroke-width', 5);
                
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                tooltip.html(`
                    <strong>Bağlantı:</strong> ${d.source.id} → ${d.target.id}<br/>
                    <strong>Önemli Bağlantı:</strong> ${d.isTop5Connection ? 'Evet' : 'Hayır'}
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function(event, d) {
                d3.select(this)
                    .attr('stroke', d => d.isTop5Connection ? '#ff4444' : '#999')
                    .attr('stroke-width', d => d.isTop5Connection ? 4 : 2);
                
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        // Düğümleri çiz
        const node = g.append('g')
            .selectAll('circle')
            .data(data.nodes)
            .enter()
            .append('circle')
            .attr('r', d => d.size)
            .attr('fill', d => d.color)
            .attr('stroke', d => d.isTop5 ? '#ff0000' : '#fff')
            .attr('stroke-width', d => d.isTop5 ? 3 : 2)
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))
            .on('mouseover', function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                tooltip.html(`
                    <strong>Kullanıcı ID:</strong> ${d.id}<br/>
                    <strong>Bağlantı Sayısı:</strong> ${d.connectionCount}<br/>
                    <strong>Öne Çıkan Düğüm:</strong> ${d.isTop5 ? 'Evet' : 'Hayır'}<br/>
                    <strong>Merkez Düğüm:</strong> ${d.isCentral ? 'Evet' : 'Hayır'}<br/>
                    <strong>4+ Bağlantı:</strong> ${d.hasHighConnections ? 'Evet' : 'Hayır'}
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');

                // Bağlantıları vurgula
                link.attr('stroke-opacity', l => 
                    (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.3
                );

                // Bağlı düğümleri vurgula
                node.attr('opacity', n => 
                    (n.id === d.id || data.links.some(l => 
                        (l.source.id === d.id && l.target.id === n.id) || 
                        (l.source.id === n.id && l.target.id === d.id)
                    )) ? 1 : 0.3
                );
            })
            .on('mouseout', function() {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
                
                // Bağlantıları normal haline getir
                link.attr('stroke-opacity', d => d.isTop5Connection ? 0.8 : 0.4);
                
                // Düğümleri normal haline getir
                node.attr('opacity', 1);
            });

        // Düğüm etiketlerini ekle
        const label = g.append('g')
            .selectAll('text')
            .data(data.nodes)
            .enter()
            .append('text')
            .text(d => d.id)
            .attr('font-size', d => d.isTop5 ? 12 : 10)
            .attr('font-weight', d => d.isTop5 ? 'bold' : 'normal')
            .attr('dx', 12)
            .attr('dy', 4)
            .style('pointer-events', 'none')
            .style('text-shadow', 
                '-1px -1px 0 white, ' +
                '1px -1px 0 white, ' +
                '-1px 1px 0 white, ' +
                '1px 1px 0 white'
            );

        // Simülasyon güncellemeleri
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            label
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });

        // Sürükleme fonksiyonları
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
        console.error('Veri yüklenirken hata oluştu:', error);
    }
}

// Sayfa yüklendiğinde görselleştirmeyi başlat
document.addEventListener('DOMContentLoaded', loadAndVisualizeNetwork); 