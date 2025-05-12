# Proje Raporu: Sosyal Ağ Bağlantıları ve Etkileşim Analizi

## 1. Proje Amacı

Bu proje, bir sosyal ağdaki kullanıcı ilişkilerini (arkadaşlık, takip, etkileşim) graf teorisi ile modellemeyi ve analiz etmeyi amaçlamaktadır.

Temel hedefler:

- Sosyal ağı yönlü/yönsüz graf olarak temsil etmek.
- En kısa yol, yoğun bağlantılı topluluklar, merkezilik ölçütleri gibi analizler yapmak.
- Sonuçları görsel simülasyonla sunarak kullanıcı davranışlarını yorumlamak.

---

## 2. Proje Ekibi ve Katkıları

- Ali Kağan Şeren (Frontend & UI tasarımı / 032390010)
  - Kullanıcı kayıt/giriş ekranı
  - Profil sayfası ve arkadaşlık/takip sisteminin arayüzü
  - API entegrasyonu ile verilerin frontend’e aktarılması
  - D3.js entegrasyonları

- Mehmet Kalbişen (Veri Görselleştirme & Etkileşim / 032390011)
  - D3.js veya Cytoscape.js ile graf gösterimi
  - Kullanıcı bağlantı haritasının oluşturulması
  - Öne çıkan düğüm ve bağlantı noktalarının vurgulanması
  - Etkileşimli grafik ve animasyon ekleme

- Samet Astarcı (DevOps & Deployment / 032390012)
  - Docker ile backend ve frontend servislerini konteynerleştirme
  - Docker Compose & Kubernetes ile ölçeklendirme
  - CI/CD süreçlerini (GitHub Actions, GitLab CI/CD) yönetme
  - AWS / DigitalOcean / Vercel üzerinde canlıya alma
  - GitHub repo yönetimi ve kod versiyon kontrolü

- Zeliha Ilgın Güven (Analiz ve Algoritma Geliştirme / 032390013)
  - Graf modelleme ve altyapı
  - JSON/CSV veri girişi için veri işleme katmanı oluşturma
  - Algoritma implementasyonları (Dijkstra, Betweenness Centrality, Louvain)

- Harun Dönder (Backend & API Geliştirme / 032390018)
  - Kullanıcı kimlik doğrulama (OAuth 2.0 / JWT)
  - API uç noktalarının geliştirilmesi
  - PostgreSQL / Neo4j veritabanı şeması oluşturma
  - Kullanıcı ve bağlantı ilişkileri için veri yönetimi

---

## 3. Proje Kapsamı

Proje aşağıdaki adımları içermektedir:

- Kullanıcı giriş ve kayıt olma sayfası
- Kimlik doğrulama adımları
- Graf modelleme:
  - Düğümler (Node) → Kullanıcılar
  - Kenarlar (Edge) → Arkadaşlık/takip/etkileşim ilişkileri
- Analizler:
  - En Kısa Yol: Dijkstra Algoritması
  - Topluluk Tespiti: Louvain Yöntemi
  - Merkezilik: Betweenness Centrality
- Görselleştirme: Grafın dinamik olarak simülasyonu

---

## 4. Algoritma Seçimleri ve Detaylar

### En Kısa Yol (Dijkstra)

- Negatif ağırlık olmaması nedeniyle Bellman-Ford'a gerek duyulmadı.
- BFS'nin aksine ağırlıklı graflarda doğru sonuç vermesi nedeniyle tercih edildi.

### Topluluk Tespiti (Louvain)

- Dinamik ağ yapısına daha iyi uyum sağlar.
- Girvan-Newman'a göre daha hızlı çalışır: O(n log n)

### Merkezilik (Betweenness Centrality)

- Degree Centrality'den daha bilgilendiricidir.
- Bilgi akışındaki kritik düğümleri belirlemede etkilidir.
- Sosyal ağdaki köprü kullanıcıları tespit eder.

---

## 5. Performans Metrikleri

| Analiz Türü       | 1.000 Düğüm | 10.000 Düğüm | Notlar                        |
|--------------------|-------------|--------------|-------------------------------|
| Dijkstra           | 120 ms      | 1.5 s        | C# Parallel.For kullanıldı    |
| Louvain            | 800 ms      | 12 s         | JavaScript implementasyonu    |
| Betweenness        | 3.2 s       | 45 s         | C# optimizasyonlu             |

---

## 6. Kullanıcı Arayüzü Özellikleri

1. Kullanıcı giriş ve kayıt olma sayfası
2. Profil oluşturma ve bağlantı yapısı gösterme sayfası
3. Etkileşimli graf görünümü
4. Sonuç görselleştirme ekranı

---

## 7. Başarılar

- Sosyal ağ analizleri başarıyla gerçekleştirildi.
- Kullanıcı dostu arayüz ile sonuçlar etkili şekilde görselleştirildi.

---

## 8. Karşılaşılan Zorluklar ve Çözümler

**Zorluk 1: Büyük Veri Setlerinde Performans**

- Sorun: 50.000+ düğümde Betweenness hesaplaması uzun sürdü.
- Çözüm: Yaklaşık algoritmalarla çözüm sağlandı.

**Zorluk 2: Çapraz Platform Görselleştirme**

- Sorun: WPF ile D3.js entegrasyonu
- Çözüm: JSON tabanlı veri değişimi ile çözüldü.

