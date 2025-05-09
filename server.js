const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { findShortestPath, calculateBetweennessCentrality, detectCommunities, analyzeNetworkDensity, analyzeUserActivity } = require('./graphAlgorithms');

const app = express();
const prisma = new PrismaClient();

// CORS ve middleware ayarları
app.use(cors({
    origin: 'http://localhost:3001', // Frontend ile uyumlu CORS
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public')); // Statik dosyaları (örneğin, frontend1.html) servis et

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';
const PORT = process.env.PORT || 3001;

const path = require("path");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "frontend1.html"));
});


// Register endpoint
app.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Gerekli alanların kontrolü
        if (!username || !email || !password) {
            return res.status(400).json({ error: "Tüm alanlar gereklidir!" });
        }

        // E-posta benzersizlik kontrolü
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ error: "Bu e-posta zaten kayıtlı!" });
        }

        // Şifreyi hash'le ve kullanıcıyı kaydet
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, email, password: hashedPassword },
        });

        // JWT token oluştur
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: "Kullanıcı başarıyla kaydedildi!", token });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ error: "Kayıt sırasında bir hata oluştu!" });
    }
});

// Login endpoint
app.post("/login", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Gerekli alanların kontrolü
        if (!email || !password || !username) {
            return res.status(400).json({ error: "E-posta ve şifre gereklidir!" });
        }

        // Kullanıcıyı bul ve şifreyi doğrula
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Geçersiz e-posta veya şifre!" });
        }

        // JWT token oluştur
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: "Giriş başarılı!", token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Giriş sırasında bir hata oluştu!" });
    }
});

// Profile endpoint
app.get("/profile", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Yetkilendirme gerekli!" });

        // Token'ı doğrula
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı!" });

        // Profil bilgilerini gönder
        res.json({ user: { username: user.username, email: user.email } });
    } catch (error) {
        console.error("Profile error:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Geçersiz token!" });
        }
        res.status(500).json({ error: "Profil bilgisi alınırken bir hata oluştu!" });
    }
});

// Kullanıcı bilgilerini güncelleme
app.put("/users/:userId/update", async (req, res) => {
    try {
        const { userId } = req.params;
        const { username, email } = req.body;

        // Token kontrolü
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Yetkilendirme gerekli!" });

        // Token'ı doğrula
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.id !== parseInt(userId)) {
            return res.status(403).json({ error: "Bu işlem için yetkiniz yok!" });
        }

        // Kullanıcının var olup olmadığını kontrol et
        const existingUser = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!existingUser) {
            return res.status(404).json({ error: "Kullanıcı bulunamadı!" });
        }

        // E-posta benzersizlik kontrolü
        if (email && email !== existingUser.email) {
            const emailExists = await prisma.user.findUnique({
                where: { email }
            });
            if (emailExists) {
                return res.status(400).json({ error: "Bu e-posta adresi zaten kullanımda!" });
            }
        }

        // Kullanıcıyı güncelle
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: {
                username: username || existingUser.username,
                email: email || existingUser.email
            },
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.json({
            message: "Kullanıcı bilgileri başarıyla güncellendi",
            user: updatedUser
        });
    } catch (error) {
        console.error("User update error:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Geçersiz token!" });
        }
        res.status(500).json({ error: "Kullanıcı güncellenirken bir hata oluştu!" });
    }
});

// Kullanıcı silme
app.delete("/users/:userId/delete", async (req, res) => {
    try {
        const { userId } = req.params;

        // Token kontrolü
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Yetkilendirme gerekli!" });

        // Token'ı doğrula
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.id !== parseInt(userId)) {
            return res.status(403).json({ error: "Bu işlem için yetkiniz yok!" });
        }

        // Kullanıcının var olup olmadığını kontrol et
        const existingUser = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!existingUser) {
            return res.status(404).json({ error: "Kullanıcı bulunamadı!" });
        }

        // Kullanıcının bağlantılarını sil
        await prisma.connection.deleteMany({
            where: {
                OR: [
                    { userId: parseInt(userId) },
                    { friendId: parseInt(userId) }
                ]
            }
        });

        // Kullanıcıyı sil
        await prisma.user.delete({
            where: { id: parseInt(userId) }
        });

        res.json({
            message: "Kullanıcı ve bağlantıları başarıyla silindi"
        });
    } catch (error) {
        console.error("User deletion error:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Geçersiz token!" });
        }
        res.status(500).json({ error: "Kullanıcı silinirken bir hata oluştu!" });
    }
});

// Kullanıcı aktivite geçmişi
app.get("/users/:userId/activity", async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        // Token kontrolü
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Yetkilendirme gerekli!" });

        // Token'ı doğrula
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.id !== parseInt(userId)) {
            return res.status(403).json({ error: "Bu işlem için yetkiniz yok!" });
        }

        // Kullanıcının var olup olmadığını kontrol et
        const existingUser = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!existingUser) {
            return res.status(404).json({ error: "Kullanıcı bulunamadı!" });
        }

        // Tarih filtresi oluştur
        const dateFilter = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.lte = new Date(endDate);
        }

        // Kullanıcının bağlantı aktivitelerini getir
        const connections = await prisma.connection.findMany({
            where: {
                OR: [
                    { userId: parseInt(userId) },
                    { friendId: parseInt(userId) }
                ],
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                },
                friend: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Aktivite istatistiklerini hesapla
        const stats = {
            totalConnections: connections.length,
            connectionsByDate: connections.reduce((acc, conn) => {
                const date = conn.createdAt.toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {}),
            recentActivity: connections.slice(0, 10) // Son 10 aktivite
        };

        res.json({
            userId: parseInt(userId),
            username: existingUser.username,
            activityStats: stats
        });
    } catch (error) {
        console.error("User activity error:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Geçersiz token!" });
        }
        res.status(500).json({ error: "Kullanıcı aktiviteleri alınırken bir hata oluştu!" });
    }
});

// Bağlantı (Connection) Endpoint'leri

// Yeni bağlantı oluşturma
app.post("/connections", async (req, res) => {
    try {
        const { userId, friendId } = req.body;

        // Gerekli alanların kontrolü
        if (!userId || !friendId) {
            return res.status(400).json({ error: "Kullanıcı ID ve arkadaş ID gereklidir!" });
        }

        // Kullanıcıların var olup olmadığını kontrol et
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });
        const friend = await prisma.user.findUnique({
            where: { id: parseInt(friendId) }
        });

        if (!user || !friend) {
            return res.status(404).json({ error: "Kullanıcı veya arkadaş bulunamadı!" });
        }

        // Bağlantının zaten var olup olmadığını kontrol et
        const existingConnection = await prisma.connection.findFirst({
            where: {
                OR: [
                    {
                        userId: parseInt(userId),
                        friendId: parseInt(friendId)
                    },
                    {
                        userId: parseInt(friendId),
                        friendId: parseInt(userId)
                    }
                ]
            }
        });

        if (existingConnection) {
            return res.status(400).json({ error: "Bu bağlantı zaten mevcut!" });
        }

        // Bağlantıyı oluştur
        const connection = await prisma.connection.create({
            data: {
                userId: parseInt(userId),
                friendId: parseInt(friendId),
                status: "pending"
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                },
                friend: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            }
        });

        res.status(201).json({
            message: "Bağlantı başarıyla oluşturuldu",
            connection
        });
    } catch (error) {
        console.error("Connection creation error:", error);
        res.status(500).json({ 
            error: "Bağlantı oluşturulurken bir hata oluştu!",
            details: error.message 
        });
    }
});

// Kullanıcının bağlantılarını getirme
app.get("/users/:userId/connections", async (req, res) => {
    try {
        const { userId } = req.params;

        // Kullanıcının var olup olmadığını kontrol et
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!user) {
            return res.status(404).json({ error: "Kullanıcı bulunamadı!" });
        }

        // Kullanıcının tüm bağlantılarını getir
        const connections = await prisma.connection.findMany({
            where: {
                OR: [
                    { userId: parseInt(userId) },
                    { friendId: parseInt(userId) }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                },
                friend: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            }
        });

        // Bağlantıları daha anlaşılır bir formata dönüştür
        const formattedConnections = connections.map(conn => ({
            id: conn.id,
            connection: conn.userId === parseInt(userId) ? conn.friend : conn.user,
            createdAt: conn.createdAt
        }));

        res.json({
            userId: parseInt(userId),
            username: user.username,
            connections: formattedConnections
        });
    } catch (error) {
        console.error("Get connections error:", error);
        res.status(500).json({ error: "Bağlantılar getirilirken bir hata oluştu!" });
    }
});

// Bağlantı silme
app.delete("/connections/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Bağlantının var olup olmadığını kontrol et
        const connection = await prisma.connection.findUnique({
            where: { id: parseInt(id) }
        });

        if (!connection) {
            return res.status(404).json({ error: "Bağlantı bulunamadı!" });
        }

        // Bağlantıyı sil
        await prisma.connection.delete({
            where: { id: parseInt(id) }
        });

        res.json({
            message: "Bağlantı başarıyla silindi",
            deletedConnection: connection
        });
    } catch (error) {
        console.error("Delete connection error:", error);
        res.status(500).json({ error: "Bağlantı silinirken bir hata oluştu!" });
    }
});

// Bağlantı durumu güncelleme
app.put("/connections/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'rejected', 'pending'

        // Token kontrolü
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Yetkilendirme gerekli!" });

        // Token'ı doğrula
        const decoded = jwt.verify(token, JWT_SECRET);

        // Bağlantının var olup olmadığını kontrol et
        const connection = await prisma.connection.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: true,
                friend: true
            }
        });

        if (!connection) {
            return res.status(404).json({ error: "Bağlantı bulunamadı!" });
        }

        // Kullanıcının yetkisi var mı kontrol et
        if (decoded.id !== connection.friendId) {
            return res.status(403).json({ error: "Bu işlem için yetkiniz yok!" });
        }

        // Bağlantı durumunu güncelle
        const updatedConnection = await prisma.connection.update({
            where: { id: parseInt(id) },
            data: { status },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                },
                friend: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            }
        });

        res.json({
            message: "Bağlantı durumu başarıyla güncellendi",
            connection: updatedConnection
        });
    } catch (error) {
        console.error("Connection status update error:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Geçersiz token!" });
        }
        res.status(500).json({ error: "Bağlantı durumu güncellenirken bir hata oluştu!" });
    }
});

// Kullanıcı istatistikleri
app.get("/users/:userId/statistics", async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        // Token kontrolü
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Yetkilendirme gerekli!" });

        // Token'ı doğrula
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.id !== parseInt(userId)) {
            return res.status(403).json({ error: "Bu işlem için yetkiniz yok!" });
        }

        // Tarih filtresi oluştur
        const dateFilter = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.lte = new Date(endDate);
        }

        // Kullanıcının bağlantılarını getir
        const connections = await prisma.connection.findMany({
            where: {
                OR: [
                    { userId: parseInt(userId) },
                    { friendId: parseInt(userId) }
                ],
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                friend: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });

        // İstatistikleri hesapla
        const stats = {
            totalConnections: connections.length,
            activeConnections: connections.filter(c => c.status === 'accepted').length,
            pendingConnections: connections.filter(c => c.status === 'pending').length,
            rejectedConnections: connections.filter(c => c.status === 'rejected').length,
            connectionGrowth: connections.reduce((acc, conn) => {
                const date = conn.createdAt.toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {}),
            topConnections: connections
                .filter(c => c.status === 'accepted')
                .slice(0, 5)
                .map(c => ({
                    id: c.userId === parseInt(userId) ? c.friend.id : c.user.id,
                    username: c.userId === parseInt(userId) ? c.friend.username : c.user.username
                }))
        };

        res.json({
            userId: parseInt(userId),
            statistics: stats
        });
    } catch (error) {
        console.error("User statistics error:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Geçersiz token!" });
        }
        res.status(500).json({ error: "Kullanıcı istatistikleri alınırken bir hata oluştu!" });
    }
});

// Graf analizi endpoint'leri

// En kısa yol analizi endpoint'i
app.get("/analysis/shortest-path", async (req, res) => {
    try {
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ error: "Başlangıç ve bitiş kullanıcı ID'leri gereklidir!" });
        }

        const result = await findShortestPath(parseInt(from), parseInt(to));
        res.json({
            message: "En kısa yol başarıyla hesaplandı",
            path: result.path,
            distance: result.distance
        });
    } catch (error) {
        console.error("Shortest path error:", error);
        res.status(500).json({ error: error.message || "En kısa yol hesaplanırken bir hata oluştu!" });
    }
});

// Betweenness Centrality analizi endpoint'i
app.get("/analysis/betweenness", async (req, res) => {
    try {
        const results = await calculateBetweennessCentrality();
        res.json({
            message: "Betweenness centrality başarıyla hesaplandı",
            results
        });
    } catch (error) {
        console.error("Betweenness centrality error:", error);
        res.status(500).json({ error: "Betweenness centrality hesaplanırken bir hata oluştu!" });
    }
});

// Topluluk tespiti endpoint'i
app.get("/analysis/communities", async (req, res) => {
    try {
        const result = await detectCommunities();
        res.json({
            message: "Topluluklar başarıyla tespit edildi",
            communities: result.communities,
            modularity: result.modularity
        });
    } catch (error) {
        console.error("Community detection error:", error);
        res.status(500).json({ error: "Topluluklar tespit edilirken bir hata oluştu!" });
    }
});

// Ağ yoğunluğu analizi endpoint'i
app.get("/analysis/network-density", async (req, res) => {
    try {
        const result = await analyzeNetworkDensity();
        res.json({
            message: "Ağ yoğunluğu analizi başarıyla tamamlandı",
            analysis: {
                overall: {
                    density: result.overallDensity,
                    totalConnections: result.totalConnections,
                    nodeCount: result.nodeCount,
                    maxPossibleConnections: result.maxPossibleConnections
                },
                communities: result.communityDensities,
                timeBasedAnalysis: result.timeBasedDensity
            }
        });
    } catch (error) {
        console.error("Network density analysis error:", error);
        res.status(500).json({ error: "Ağ yoğunluğu analizi yapılırken bir hata oluştu!" });
    }
});

// En aktif kullanıcılar analizi endpoint'i
app.get("/analysis/active-users", async (req, res) => {
    try {
        const result = await analyzeUserActivity();
        res.json({
            message: "Kullanıcı aktivite analizi başarıyla tamamlandı",
            timestamp: result.timestamp,
            analysis: {
                categories: {
                    highlyActive: {
                        count: result.categories.highlyActive.length,
                        users: result.categories.highlyActive
                    },
                    moderatelyActive: {
                        count: result.categories.moderatelyActive.length,
                        users: result.categories.moderatelyActive
                    },
                    lessActive: {
                        count: result.categories.lessActive.length,
                        users: result.categories.lessActive
                    }
                },
                topUsers: result.topUsers.slice(0, 10) // İlk 10 en aktif kullanıcı
            }
        });
    } catch (error) {
        console.error("User activity analysis error:", error);
        res.status(500).json({ error: "Kullanıcı aktivite analizi yapılırken bir hata oluştu!" });
    }
});

// Search users with filtering
app.get("/users/search", async (req, res) => {
    try {
        const { query, filter } = req.query;
        
        let whereClause = {};
        
        if (query) {
            whereClause = {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } }
                ]
            };
        }

        const users = await prisma.user.findMany({
            where: whereClause,
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
            },
            orderBy: filter === 'connections' ? {
                connections: { _count: 'desc' }
            } : {
                createdAt: 'desc'
            }
        });

        res.json(users);
    } catch (error) {
        console.error("User search error:", error);
        res.status(500).json({ error: "Kullanıcı araması sırasında bir hata oluştu!" });
    }
});

// Get connection suggestions for a user
app.get("/users/:userId/suggestions", async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 5 } = req.query;

        // Get user's current connections
        const userConnections = await prisma.connection.findMany({
            where: {
                OR: [
                    { userId: parseInt(userId) },
                    { friendId: parseInt(userId) }
                ]
            },
            select: {
                userId: true,
                friendId: true
            }
        });

        // Create a set of connected user IDs
        const connectedUserIds = new Set(
            userConnections.flatMap(conn => [conn.userId, conn.friendId])
        );
        connectedUserIds.delete(parseInt(userId));

        // Get connections of connected users (friends of friends)
        const suggestedConnections = await prisma.connection.findMany({
            where: {
                OR: [
                    { userId: { in: Array.from(connectedUserIds) } },
                    { friendId: { in: Array.from(connectedUserIds) } }
                ],
                AND: {
                    NOT: {
                        OR: [
                            { userId: parseInt(userId) },
                            { friendId: parseInt(userId) }
                        ]
                    }
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                },
                friend: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            },
            take: parseInt(limit)
        });

        // Process and format suggestions
        const suggestions = suggestedConnections.map(conn => {
            const suggestedUser = conn.userId === parseInt(userId) ? conn.friend : conn.user;
            return {
                ...suggestedUser,
                commonConnections: Array.from(connectedUserIds).filter(id => 
                    suggestedConnections.some(sc => 
                        (sc.userId === id && sc.friendId === suggestedUser.id) ||
                        (sc.friendId === id && sc.userId === suggestedUser.id)
                    )
                ).length
            };
        });

        res.json(suggestions);
    } catch (error) {
        console.error("Connection suggestions error:", error);
        res.status(500).json({ error: "Bağlantı önerileri alınırken bir hata oluştu!" });
    }
});

// Find common connections between two users
app.get("/users/:userId/common-connections/:otherUserId", async (req, res) => {
    try {
        const { userId, otherUserId } = req.params;

        // Get connections for both users
        const [userConnections, otherUserConnections] = await Promise.all([
            prisma.connection.findMany({
                where: {
                    OR: [
                        { userId: parseInt(userId) },
                        { friendId: parseInt(userId) }
                    ]
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    },
                    friend: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    }
                }
            }),
            prisma.connection.findMany({
                where: {
                    OR: [
                        { userId: parseInt(otherUserId) },
                        { friendId: parseInt(otherUserId) }
                    ]
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    },
                    friend: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    }
                }
            })
        ]);

        // Extract connected user IDs for both users
        const userConnectionIds = new Set(
            userConnections.flatMap(conn => [conn.userId, conn.friendId])
        );
        const otherUserConnectionIds = new Set(
            otherUserConnections.flatMap(conn => [conn.userId, conn.friendId])
        );

        // Find common connections
        const commonConnectionIds = Array.from(userConnectionIds)
            .filter(id => otherUserConnectionIds.has(id))
            .filter(id => id !== parseInt(userId) && id !== parseInt(otherUserId));

        // Get detailed information for common connections
        const commonConnections = await prisma.user.findMany({
            where: {
                id: {
                    in: commonConnectionIds
                }
            },
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true
            }
        });

        res.json({
            commonConnections,
            count: commonConnections.length
        });
    } catch (error) {
        console.error("Common connections error:", error);
        res.status(500).json({ error: "Ortak bağlantılar alınırken bir hata oluştu!" });
    }
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});

// Prisma bağlantı hatası yakalama
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});