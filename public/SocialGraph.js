class SocialGraph {
    constructor() {
        this.Users = new Map();
    }

    AddFriendship(userId1, userId2, weight) {
        if (!this.Users.has(userId1)) {
            this.Users.set(userId1, {
                Friends: new Map(),
                id: userId1
            });
        }
        if (!this.Users.has(userId2)) {
            this.Users.set(userId2, {
                Friends: new Map(),
                id: userId2
            });
        }

        this.Users.get(userId1).Friends.set(userId2, weight);
        this.Users.get(userId2).Friends.set(userId1, weight);
    }

    async LoadFromFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            const lines = text.trim().split('\n');

            lines.forEach(line => {
                const [user1, user2] = line.split(' ').map(Number);
                if (!isNaN(user1) && !isNaN(user2)) {
                    this.AddFriendship(user1, user2, 1);
                }
            });
        } catch (error) {
            console.error('Dosya yükleme hatası:', error);
            throw error;
        }
    }

    DetectCommunities() {
        // Her düğüm kendi topluluğunda başlar
        const communities = new Map();
        this.Users.forEach((_, id) => communities.set(id, id));

        let changed = true;
        let iteration = 0;
        const totalWeight = this.calculateTotalWeight();

        while (changed && iteration < 100) {
            changed = false;
            iteration++;

            // Her düğüm için en iyi topluluğu bul
            for (const node of this.Users.keys()) {
                const neighborCommunities = this.getNeighborCommunities(node, communities);
                const bestCommunity = this.findBestCommunity(node, communities, totalWeight);

                if (bestCommunity !== communities.get(node)) {
                    communities.set(node, bestCommunity);
                    changed = true;
                }
            }
        }

        return {
            Communities: Object.fromEntries(communities),
            Modularity: this.calculateModularity(communities, totalWeight)
        };
    }

    Dijkstra(startUserId, targetUserId) {
        if (!this.Users.has(startUserId) || !this.Users.has(targetUserId)) {
            throw new Error('Geçersiz kullanıcı ID\'leri');
        }

        // Başlangıç değerlerini ayarla
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();
        const INFINITY = Number.MAX_SAFE_INTEGER;

        // Tüm düğümleri başlat
        this.Users.forEach((_, id) => {
            distances.set(id, INFINITY);
            previous.set(id, null);
            unvisited.add(id);
        });

        // Başlangıç düğümünün mesafesini 0 yap
        distances.set(startUserId, 0);

        // Doğrudan bağlantıları kontrol et
        const startUser = this.Users.get(startUserId);
        if (startUser && startUser.Friends && startUser.Friends.has(targetUserId)) {
            return {
                Path: [startUserId, targetUserId],
                TotalWeight: startUser.Friends.get(targetUserId)
            };
        }

        while (unvisited.size > 0) {
            // En küçük mesafeye sahip düğümü bul
            let minDistance = INFINITY;
            let currentUserId = null;

            for (const id of unvisited) {
                const dist = distances.get(id);
                if (dist < minDistance) {
                    minDistance = dist;
                    currentUserId = id;
                }
            }

            // Eğer en küçük mesafe sonsuzsa, yol bulunamadı
            if (currentUserId === null || minDistance === INFINITY) {
                return {
                    Path: [],
                    TotalWeight: INFINITY
                };
            }

            // Hedefe ulaştık
            if (currentUserId === targetUserId) {
                break;
            }

            unvisited.delete(currentUserId);

            // Komşuları kontrol et
            const currentUser = this.Users.get(currentUserId);
            if (!currentUser || !currentUser.Friends) continue;

            // Komşuları mesafeye göre sırala
            const neighbors = Array.from(currentUser.Friends.entries())
                .sort((a, b) => {
                    // Sadece mesafeye göre sırala
                    return a[1] - b[1];
                });

            for (const [neighborId, weight] of neighbors) {
                // Sadece ziyaret edilmemiş komşuları kontrol et
                if (!unvisited.has(neighborId)) continue;

                // Yeni mesafeyi hesapla
                const alt = distances.get(currentUserId) + weight;

                // Eğer yeni mesafe daha kısaysa güncelle
                if (alt < distances.get(neighborId)) {
                    distances.set(neighborId, alt);
                    previous.set(neighborId, currentUserId);
                }
            }
        }

        // Yolu oluştur
        const path = [];
        let current = targetUserId;

        // Eğer hedef düğüme ulaşılamadıysa
        if (distances.get(targetUserId) === INFINITY) {
            return {
                Path: [],
                TotalWeight: INFINITY
            };
        }

        // Yolu geriye doğru oluştur
        while (current !== null) {
            path.unshift(current);
            current = previous.get(current);
        }

        // Yolun geçerli olduğunu kontrol et
        for (let i = 0; i < path.length - 1; i++) {
            const current = path[i];
            const next = path[i + 1];
            const currentUser = this.Users.get(current);
            if (!currentUser || !currentUser.Friends || !currentUser.Friends.has(next)) {
                return {
                    Path: [],
                    TotalWeight: INFINITY
                };
            }
        }

        return {
            Path: path,
            TotalWeight: distances.get(targetUserId)
        };
    }

    // Yardımcı fonksiyonlar
    calculateTotalWeight() {
        let total = 0;
        this.Users.forEach(user => {
            user.Friends.forEach(weight => {
                total += weight;
            });
        });
        return total / 2;
    }

    getNeighborCommunities(node, communities) {
        const result = new Set();
        const neighbors = this.Users.get(node).Friends;
        neighbors.forEach((_, neighborId) => {
            result.add(communities.get(neighborId));
        });
        return result;
    }

    findBestCommunity(node, communities, totalWeight) {
        const neighborCommunities = this.getNeighborCommunities(node, communities);
        let bestCommunity = communities.get(node);
        let maxDeltaQ = 0;

        for (const community of neighborCommunities) {
            const deltaQ = this.calculateDeltaModularity(node, community, communities, totalWeight);
            if (deltaQ > maxDeltaQ) {
                maxDeltaQ = deltaQ;
                bestCommunity = community;
            }
        }

        return bestCommunity;
    }

    calculateModularity(communities, totalWeight) {
        let q = 0;
        const communityNodes = this.groupNodesByCommunity(communities);

        for (const [community, nodes] of communityNodes) {
            for (const node1 of nodes) {
                for (const node2 of nodes) {
                    if (node1 === node2) continue;
                    
                    const a_ij = this.Users.get(node1).Friends.has(node2) ? 1 : 0;
                    const k_i = this.Users.get(node1).Friends.size;
                    const k_j = this.Users.get(node2).Friends.size;
                    
                    q += a_ij - (k_i * k_j) / (2 * totalWeight);
                }
            }
        }

        return q / (2 * totalWeight);
    }

    calculateDeltaModularity(node, community, communities, totalWeight) {
        let sum_in = 0;
        let sum_tot = 0;
        const k_i = this.Users.get(node).Friends.size;
        let k_i_in = 0;

        // Topluluk içi bağlantıları hesapla
        this.Users.get(node).Friends.forEach((weight, neighbor) => {
            if (communities.get(neighbor) === community) {
                k_i_in += weight;
            }
        });

        // Topluluk toplam bağlantılarını hesapla
        for (const [n, comm] of communities) {
            if (comm === community) {
                sum_tot += this.Users.get(n).Friends.size;
                this.Users.get(n).Friends.forEach((weight, neighbor) => {
                    if (communities.get(neighbor) === community) {
                        sum_in += weight;
                    }
                });
            }
        }

        sum_in /= 2;
        sum_tot /= 2;

        const deltaQ = (sum_in + k_i_in) / (2 * totalWeight) - 
                      Math.pow((sum_tot + k_i) / (2 * totalWeight), 2);
        
        return deltaQ - (sum_in / (2 * totalWeight) - 
                        Math.pow(sum_tot / (2 * totalWeight), 2) - 
                        Math.pow(k_i / (2 * totalWeight), 2));
    }

    groupNodesByCommunity(communities) {
        const result = new Map();
        communities.forEach((community, node) => {
            if (!result.has(community)) {
                result.set(community, new Set());
            }
            result.get(community).add(node);
        });
        return result;
    }

    getMinDistanceNode(unvisited, distances) {
        let minDistance = Number.MAX_SAFE_INTEGER;
        let minNode = null;
        
        for (const node of unvisited) {
            const distance = distances.get(node);
            if (distance < minDistance) {
                minDistance = distance;
                minNode = node;
            }
        }
        
        return minNode;
    }
}

// Node.js için export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialGraph;
}
// Browser için export
if (typeof window !== 'undefined') {
    window.SocialGraph = SocialGraph;
} 