/* global d3 */
import { API_BASE } from './config.js';

// Ağ verilerini yükle ve görselleştir
async function loadAndVisualizeNetwork() {
    try {
        const response = await fetch(`${API_BASE}/api/network-data`);
        if (!response.ok) {
            throw new Error('Ağ verisi alınamadı');
        }
        const data = await response.json();
        console.log('Yüklenen veri:', data);

        // SVG boyutları
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Mevcut SVG'yi temizle
        d3.select('#network-container').selectAll('*').remove();

        // SVG oluştur
        const svg = d3.select('#network-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        // Tüm grafik öğelerini içerecek grup
        const g = svg.append('g');

        // Zoom davranışı
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Tooltip oluştur
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        // Simülasyon oluştur
        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links)
                .id(d => d.id)
                .distance(d => d.source.isTop5 && d.target.isTop5 ? 300 : 250)
            )
            .force('charge', d3.forceManyBody()
                .strength(d => d.isTop5 ? -800 : -500)
            )
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide()
                .radius(d => d.size + 50)
                .strength(1)
            )
            .force('x', d3.forceX(width / 2).strength(0.03))
            .force('y', d3.forceY(height / 2).strength(0.03));

        // Bağlantıları çiz
        const link = g.append('g')
            .selectAll('line')
            .data(data.links)
            .enter()
            .append('line')
            .attr('stroke', d => d.isTop5Connection ? '#ff4444' : '#999')
            .attr('stroke-opacity', d => d.isTop5Connection ? 0.8 : 0.4)
            .attr('stroke-width', d => d.isTop5Connection ? 4 : 2);

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
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

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

        // Düğüm ve bağlantı etkileşimleri
        node.on('mouseover', function(event, d) {
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
        document.getElementById('network-container').innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h3>Ağ verisi yüklenirken bir hata oluştu</h3>
                <p>${error.message}</p>
                <button onclick="window.location.reload()">Yeniden Dene</button>
            </div>
        `;
    }
}

// Sayfa yüklendiğinde görselleştirmeyi başlat
document.addEventListener('DOMContentLoaded', loadAndVisualizeNetwork); 