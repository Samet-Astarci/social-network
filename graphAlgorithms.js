import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Graf yapısını oluşturan yardımcı fonksiyon
async function buildGraphFromConnections() {
    const connections = await prisma.connection.findMany({
        include: {
            user: true,
            friend: true
        }
    });

    const graph = new Map();

    // Graf düğümlerini oluştur
    connections.forEach(conn => {
        if (!graph.has(conn.userId)) {
            graph.set(conn.userId, new Map());
        }
        if (!graph.has(conn.friendId)) {
            graph.set(conn.friendId, new Map());
        }
    });

    // Kenarları ekle (çift yönlü graf)
    connections.forEach(conn => {
        graph.get(conn.userId).set(conn.friendId, 1);
        graph.get(conn.friendId).set(conn.userId, 1);
    });

    return graph;
}

// Dijkstra algoritması implementasyonu
async function findShortestPath(startId, endId) {
    const graph = await buildGraphFromConnections();
    
    if (!graph.has(startId) || !graph.has(endId)) {
        throw new Error("Başlangıç veya bitiş kullanıcısı bulunamadı!");
    }

    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set();

    // Başlangıç değerlerini ayarla
    graph.forEach((_, userId) => {
        distances.set(userId, Infinity);
        unvisited.add(userId);
    });
    distances.set(startId, 0);

    while (unvisited.size > 0) {
        // En küçük mesafeli düğümü bul
        let current = null;
        let minDistance = Infinity;
        for (const userId of unvisited) {
            if (distances.get(userId) < minDistance) {
                minDistance = distances.get(userId);
                current = userId;
            }
        }

        if (current === null || current === endId) break;

        unvisited.delete(current);

        // Komşuları güncelle
        const neighbors = graph.get(current);
        neighbors.forEach((weight, neighborId) => {
            if (unvisited.has(neighborId)) {
                const distance = distances.get(current) + weight;
                if (distance < distances.get(neighborId)) {
                    distances.set(neighborId, distance);
                    previous.set(neighborId, current);
                }
            }
        });
    }

    // Yolu oluştur
    const path = [];
    let current = endId;
    while (current !== undefined) {
        path.unshift(current);
        current = previous.get(current);
    }

    // Kullanıcı detaylarını al
    const pathWithDetails = await Promise.all(path.map(async (userId) => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true }
        });
        return user;
    }));

    return {
        path: pathWithDetails,
        distance: distances.get(endId)
    };
}

// Betweenness Centrality hesaplama
async function calculateBetweennessCentrality() {
    const graph = await buildGraphFromConnections();
    const nodes = Array.from(graph.keys());
    const betweenness = new Map();

    // Başlangıç değerlerini ayarla
    nodes.forEach(node => betweenness.set(node, 0));

    // Her düğüm çifti için en kısa yolları hesapla
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const start = nodes[i];
            const end = nodes[j];
            
            const result = await findShortestPath(start, end);
            const path = result.path.map(user => user.id);

            // Ara düğümlerin betweenness değerlerini artır
            for (let k = 1; k < path.length - 1; k++) {
                const node = path[k];
                betweenness.set(node, betweenness.get(node) + 1);
            }
        }
    }

    // Kullanıcı detaylarıyla sonuçları döndür
    const results = await Promise.all(
        Array.from(betweenness.entries()).map(async ([userId, score]) => {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true }
            });
            return {
                user,
                score: score / ((nodes.length - 1) * (nodes.length - 2) / 2) // Normalize
            };
        })
    );

    return results.sort((a, b) => b.score - a.score);
}

// Louvain algoritması ile topluluk tespiti
async function detectCommunities() {
    const graph = await buildGraphFromConnections();
    const nodes = Array.from(graph.keys());
    
    // Başlangıçta her düğüm kendi topluluğunda
    const communities = new Map(nodes.map(node => [node, node]));
    const nodeWeights = new Map(nodes.map(node => [node, 0]));
    let totalWeight = 0;

    // Düğüm ağırlıklarını hesapla
    nodes.forEach(node => {
        const neighbors = graph.get(node);
        let weight = 0;
        neighbors.forEach((w, neighbor) => {
            weight += w;
            totalWeight += w;
        });
        nodeWeights.set(node, weight);
    });

    let improved = true;
    while (improved) {
        improved = false;
        
        // Her düğüm için en iyi topluluğu bul
        for (const node of nodes) {
            const currentCommunity = communities.get(node);
            let bestCommunity = currentCommunity;
            let bestModularity = 0;

            // Komşu toplulukları kontrol et
            const neighborCommunities = new Set();
            const neighbors = graph.get(node);
            neighbors.forEach((_, neighbor) => {
                neighborCommunities.add(communities.get(neighbor));
            });

            // Her komşu topluluk için modularite hesapla
            for (const community of neighborCommunities) {
                const modularity = calculateModularity(node, community, graph, communities, nodeWeights, totalWeight);
                if (modularity > bestModularity) {
                    bestModularity = modularity;
                    bestCommunity = community;
                }
            }

            // Eğer daha iyi bir topluluk bulunduysa, düğümü taşı
            if (bestCommunity !== currentCommunity) {
                communities.set(node, bestCommunity);
                improved = true;
            }
        }
    }

    // Toplulukları grupla
    const communityGroups = new Map();
    communities.forEach((community, node) => {
        if (!communityGroups.has(community)) {
            communityGroups.set(community, []);
        }
        communityGroups.get(community).push(node);
    });

    // Kullanıcı detaylarıyla sonuçları döndür
    const results = await Promise.all(
        Array.from(communityGroups.entries()).map(async ([communityId, members]) => {
            const communityMembers = await Promise.all(
                members.map(async (userId) => {
                    const user = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { id: true, username: true }
                    });
                    return user;
                })
            );
            return {
                communityId,
                members: communityMembers
            };
        })
    );

    return {
        communities: results,
        modularity: calculateOverallModularity(graph, communities, nodeWeights, totalWeight)
    };
}

// Modularite hesaplama yardımcı fonksiyonu
function calculateModularity(node, community, graph, communities, nodeWeights, totalWeight) {
    let modularity = 0;
    const neighbors = graph.get(node);
    
    neighbors.forEach((weight, neighbor) => {
        if (communities.get(neighbor) === community) {
            modularity += weight - (nodeWeights.get(node) * nodeWeights.get(neighbor)) / (2 * totalWeight);
        }
    });

    return modularity;
}

// Genel modularite hesaplama
function calculateOverallModularity(graph, communities, nodeWeights, totalWeight) {
    let modularity = 0;
    
    communities.forEach((community, node) => {
        const neighbors = graph.get(node);
        neighbors.forEach((weight, neighbor) => {
            if (communities.get(neighbor) === community) {
                modularity += weight - (nodeWeights.get(node) * nodeWeights.get(neighbor)) / (2 * totalWeight);
            }
        });
    });

    return modularity / (2 * totalWeight);
}

// Ağ yoğunluğu analizi
async function analyzeNetworkDensity() {
    const graph = await buildGraphFromConnections();
    const nodes = Array.from(graph.keys());
    const nodeCount = nodes.length;

    // Toplam bağlantı sayısını hesapla
    let totalConnections = 0;
    nodes.forEach(node => {
        totalConnections += graph.get(node).size;
    });
    // Her bağlantı iki kez sayıldığı için 2'ye böl
    totalConnections = totalConnections / 2;

    // Maksimum olası bağlantı sayısı: n * (n-1) / 2
    const maxPossibleConnections = (nodeCount * (nodeCount - 1)) / 2;

    // Genel ağ yoğunluğu
    const overallDensity = maxPossibleConnections > 0 ? totalConnections / maxPossibleConnections : 0;

    // Topluluk bazlı yoğunlukları hesapla
    const communityResult = await detectCommunities();
    const communityDensities = await Promise.all(
        communityResult.communities.map(async (community) => {
            const memberIds = community.members.map(member => member.id);
            const memberCount = memberIds.length;
            
            // Topluluk içi bağlantıları say
            let internalConnections = 0;
            memberIds.forEach(memberId => {
                const neighbors = graph.get(memberId);
                neighbors.forEach((_, neighborId) => {
                    if (memberIds.includes(neighborId)) {
                        internalConnections++;
                    }
                });
            });
            // Her bağlantı iki kez sayıldığı için 2'ye böl
            internalConnections = internalConnections / 2;

            // Topluluk içi maksimum olası bağlantı sayısı
            const maxInternalConnections = (memberCount * (memberCount - 1)) / 2;
            const density = maxInternalConnections > 0 ? internalConnections / maxInternalConnections : 0;

            return {
                communityId: community.communityId,
                members: community.members,
                memberCount,
                internalConnections,
                density
            };
        })
    );

    // Zaman bazlı yoğunluk analizi
    const timeBasedDensity = await calculateTimeBasedDensity();

    return {
        overallDensity,
        totalConnections,
        nodeCount,
        maxPossibleConnections,
        communityDensities,
        timeBasedDensity
    };
}

// Zaman bazlı yoğunluk hesaplama
async function calculateTimeBasedDensity() {
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Son bir haftalık bağlantıları getir
    const weeklyConnections = await prisma.connection.count({
        where: {
            createdAt: {
                gte: oneWeekAgo
            }
        }
    });

    // Son bir aylık bağlantıları getir
    const monthlyConnections = await prisma.connection.count({
        where: {
            createdAt: {
                gte: oneMonthAgo
            }
        }
    });

    // Toplam kullanıcı sayısını getir
    const totalUsers = await prisma.user.count();
    const maxPossibleConnections = (totalUsers * (totalUsers - 1)) / 2;

    return {
        lastWeek: maxPossibleConnections > 0 ? weeklyConnections / maxPossibleConnections : 0,
        lastMonth: maxPossibleConnections > 0 ? monthlyConnections / maxPossibleConnections : 0
    };
}

// En aktif kullanıcılar analizi
async function analyzeUserActivity() {
    const graph = await buildGraphFromConnections();
    const now = new Date();
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Tüm kullanıcıları getir
    const users = await prisma.user.findMany({
        include: {
            connections: true,
            friends: true
        }
    });

    const userActivities = await Promise.all(users.map(async (user) => {
        // Toplam bağlantı sayısı
        const totalConnections = graph.has(user.id) ? graph.get(user.id).size : 0;

        // Son bir aydaki bağlantı sayısı
        const recentConnections = await prisma.connection.count({
            where: {
                OR: [
                    { userId: user.id },
                    { friendId: user.id }
                ],
                createdAt: {
                    gte: oneMonthAgo
                }
            }
        });

        // Betweenness centrality skorunu hesapla
        const betweennessScore = await calculateUserBetweenness(user.id);

        // Topluluk içi aktivite
        const communityActivity = await calculateCommunityActivity(user.id);

        return {
            user: {
                id: user.id,
                username: user.username
            },
            metrics: {
                totalConnections,
                recentConnections,
                betweennessScore,
                communityActivity
            }
        };
    }));

    // Aktivite skorunu hesapla ve sırala
    const activityScores = userActivities.map(activity => {
        const score = calculateActivityScore(activity.metrics);
        return {
            ...activity,
            activityScore: score
        };
    }).sort((a, b) => b.activityScore - a.activityScore);

    // Kategorilere ayır
    const categories = categorizeUsers(activityScores);

    return {
        topUsers: activityScores,
        categories,
        timestamp: now
    };
}

// Kullanıcının betweenness değerini hesapla
async function calculateUserBetweenness(userId) {
    const betweennessResults = await calculateBetweennessCentrality();
    const userScore = betweennessResults.find(result => result.user.id === userId);
    return userScore ? userScore.score : 0;
}

// Topluluk içi aktivite hesaplama
async function calculateCommunityActivity(userId) {
    const communities = await detectCommunities();
    let communityActivity = 0;

    for (const community of communities.communities) {
        const isMember = community.members.some(member => member.id === userId);
        if (isMember) {
            // Topluluk içindeki diğer üyelerle olan bağlantı sayısı
            const memberConnections = await prisma.connection.count({
                where: {
                    OR: [
                        {
                            userId,
                            friendId: {
                                in: community.members.map(m => m.id)
                            }
                        },
                        {
                            friendId: userId,
                            userId: {
                                in: community.members.map(m => m.id)
                            }
                        }
                    ]
                }
            });
            communityActivity += memberConnections;
        }
    }

    return communityActivity;
}

// Aktivite skoru hesaplama
function calculateActivityScore(metrics) {
    const weights = {
        totalConnections: 0.3,
        recentConnections: 0.4,
        betweennessScore: 0.2,
        communityActivity: 0.1
    };

    return (
        metrics.totalConnections * weights.totalConnections +
        metrics.recentConnections * weights.recentConnections +
        (metrics.betweennessScore || 0) * weights.betweennessScore +
        metrics.communityActivity * weights.communityActivity
    );
}

// Kullanıcıları kategorilere ayırma
function categorizeUsers(activityScores) {
    if (activityScores.length === 0) return {};

    const maxScore = Math.max(...activityScores.map(u => u.activityScore));
    
    return {
        highlyActive: activityScores.filter(u => u.activityScore >= maxScore * 0.7),
        moderatelyActive: activityScores.filter(u => u.activityScore >= maxScore * 0.3 && u.activityScore < maxScore * 0.7),
        lessActive: activityScores.filter(u => u.activityScore < maxScore * 0.3)
    };
}

// Kullanıcı arama fonksiyonu
async function searchUsers(query, filters = {}) {
    const searchQuery = {
        where: {
            OR: [
                { username: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
            _count: {
                select: {
                    connections: true,
                    friends: true
                }
            }
        }
    };

    // Filtreleri uygula
    if (filters.minConnections) {
        searchQuery.having = {
            OR: [
                { connections: { _count: { gte: filters.minConnections } } },
                { friends: { _count: { gte: filters.minConnections } } }
            ]
        };
    }

    const users = await prisma.user.findMany(searchQuery);
    return users;
}

// Bağlantı önerileri fonksiyonu
async function suggestConnections(userId) {
    const graph = await buildGraphFromConnections();
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            connections: {
                include: { friend: true }
            },
            friends: {
                include: { user: true }
            }
        }
    });

    if (!user) {
        throw new Error("Kullanıcı bulunamadı!");
    }

    // Mevcut bağlantıları bul
    const existingConnections = new Set();
    user.connections.forEach(conn => existingConnections.add(conn.friendId));
    user.friends.forEach(conn => existingConnections.add(conn.userId));
    existingConnections.add(userId); // Kendisini de ekle

    // İkinci derece bağlantıları bul
    const secondDegreeConnections = new Map();
    const userConnections = graph.get(userId) || new Map();

    // Her bir direkt bağlantının bağlantılarını kontrol et
    for (const [friendId] of userConnections) {
        const friendConnections = graph.get(friendId) || new Map();
        for (const [potentialFriendId] of friendConnections) {
            if (!existingConnections.has(potentialFriendId)) {
                secondDegreeConnections.set(potentialFriendId, 
                    (secondDegreeConnections.get(potentialFriendId) || 0) + 1);
            }
        }
    }

    // Önerileri oluştur ve sırala
    const suggestions = await Promise.all(
        Array.from(secondDegreeConnections.entries()).map(async ([suggestedId, commonCount]) => {
            const suggestedUser = await prisma.user.findUnique({
                where: { id: suggestedId },
                select: {
                    id: true,
                    username: true,
                    email: true
                }
            });

            return {
                user: suggestedUser,
                commonConnections: commonCount,
                score: calculateSuggestionScore(commonCount)
            };
        })
    );

    return suggestions.sort((a, b) => b.score - a.score);
}

// Öneri skoru hesaplama
function calculateSuggestionScore(commonConnections) {
    return Math.log(1 + commonConnections) * 10;
}

// Ortak bağlantıları bulma fonksiyonu
async function findCommonConnections(userId1, userId2) {
    const graph = await buildGraphFromConnections();
    
    const connections1 = graph.get(userId1) || new Map();
    const connections2 = graph.get(userId2) || new Map();

    const commonIds = new Set();
    for (const [connId] of connections1) {
        if (connections2.has(connId)) {
            commonIds.add(connId);
        }
    }

    // Ortak bağlantıların detaylarını getir
    const commonConnections = await Promise.all(
        Array.from(commonIds).map(async (id) => {
            const user = await prisma.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    username: true,
                    email: true
                }
            });
            return user;
        })
    );

    return {
        users: [userId1, userId2],
        commonConnections,
        count: commonConnections.length
    };
}

const PORT = process.env.PORT || 3001;  // 3000 yerine 3001

module.exports = {
    findShortestPath,
    calculateBetweennessCentrality,
    detectCommunities,
    analyzeNetworkDensity,
    analyzeUserActivity,
    searchUsers,
    suggestConnections,
    findCommonConnections
}; 