import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt
from collections import Counter

def process_network_data(input_file):
    # Veriyi oku
    print("Veri okunuyor...")
    df = pd.read_csv(input_file, sep=' ', header=None, names=['source', 'target'])
    
    # Bağlantı sayılarını hesapla
    print("Bağlantı sayıları hesaplanıyor...")
    all_nodes = pd.concat([df['source'], df['target']])
    node_counts = Counter(all_nodes)
    
    # Sonuçları yazdır
    print("\nEn çok bağlantıya sahip 10 düğüm:")
    for node, count in node_counts.most_common(10):
        print(f"Düğüm {node}: {count} bağlantı")
    
    # Ağ grafiği oluştur
    print("\nAğ grafiği oluşturuluyor...")
    G = nx.Graph()
    
    # Düğümleri ekle
    for node in node_counts.keys():
        G.add_node(node, weight=node_counts[node])
    
    # Bağlantıları ekle
    for _, row in df.iterrows():
        G.add_edge(row['source'], row['target'])
    
    # Görselleştirme
    plt.figure(figsize=(15, 15))
    pos = nx.spring_layout(G, k=1, iterations=50)
    
    # Düğüm boyutlarını bağlantı sayılarına göre ayarla
    node_sizes = [G.nodes[node]['weight'] * 10 for node in G.nodes()]
    
    # Merkez düğümü (0) kırmızı yap
    node_colors = ['red' if node == 0 else 'blue' for node in G.nodes()]
    
    # Çiz
    nx.draw(G, pos, 
            node_size=node_sizes,
            node_color=node_colors,
            with_labels=False,
            alpha=0.6)
    
    # Sadece merkez düğümü etiketle
    nx.draw_networkx_labels(G, pos, {0: '0'}, font_size=16, font_color='white')
    
    plt.title("Sosyal Ağ Görselleştirmesi")
    plt.savefig('network_visualization.png', dpi=300, bbox_inches='tight')
    print("\nGörselleştirme kaydedildi: network_visualization.png")
    
    # İstatistikleri kaydet
    stats_df = pd.DataFrame({
        'node_id': list(node_counts.keys()),
        'connection_count': list(node_counts.values())
    })
    stats_df.to_csv('node_statistics.csv', index=False)
    print("İstatistikler kaydedildi: node_statistics.csv")

if __name__ == "__main__":
    process_network_data('datasheetfrom_facebok.txt') 