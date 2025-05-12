import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import process from 'process';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';
const PORT = process.env.PORT || 3001;

// Global graf değişkeni
let globalGraph = null;

// CORS ve middleware ayarları
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:3001', 'http://localhost:3000','http://localhost:5173','https://social-network-q2av.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

/*app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});*/


// Graf verisini yükle ve bellekte tut
function initializeGraph() {
    const data = fs.readFileSync('public/datasheetfrom_facebok.txt', 'utf-8');
    const lines = data.trim().split('\n');
    const graph = new Map();

    // İlk 2000 satırı al
    const limitedLines = lines.slice(0, 2000);

    // Graf yapısını oluştur
    limitedLines.forEach(line => {
        const [source, target] = line.split(' ').map(Number);
        
        if (!graph.has(source)) {
            graph.set(source, new Set());
        }
        if (!graph.has(target)) {
            graph.set(target, new Set());
        }
        
        graph.get(source).add(target);
        graph.get(target).add(source);
    });

    return graph;
}

// Sunucu başlatıldığında grafı yükle
initializeGraph();

// Topluluk tespiti fonksiyonu
function detectCommunities(graph) {
    // Her düğüm başlangıçta kendi topluluğunda
    let communities = {};
    const nodes = Array.from(graph.keys());
    nodes.forEach(node => {
        communities[node] = node;
    });

    // Toplam ağırlığı hesapla
    let totalWeight = 0;
    nodes.forEach(node => {
        graph.get(node).forEach(() => totalWeight++);
    });
    totalWeight /= 2; // Her bağlantı iki kez sayıldığı için

    let modularity = calculateModularity(graph, communities, totalWeight);
    let improved = true;
    let iterations = 0;

    while (improved && iterations < 100) {
        improved = false;
        iterations++;

        // Faz 1: Düğümleri en iyi topluluklara yerleştir
        for (const node of nodes) {
            const currentCommunity = communities[node];
            const neighborCommunities = getNeighborCommunities(node, graph, communities);
            let bestCommunity = currentCommunity;
            let bestGain = 0;

            // Komşu toplulukları değerlendir
            neighborCommunities.forEach(community => {
                const gain = calculateModularityGain(
                    node, 
                    community, 
                    graph, 
                    communities, 
                    totalWeight
                );

                if (gain > bestGain) {
                    bestGain = gain;
                    bestCommunity = community;
                }
            });

            // Eğer daha iyi bir topluluk bulunduysa değiştir
            if (bestCommunity !== currentCommunity) {
                communities[node] = bestCommunity;
                improved = true;
            }
        }

        // Faz 2: Toplulukları birleştir
        if (improved) {
            communities = aggregateCommunities(communities);
            modularity = calculateModularity(graph, communities, totalWeight);
        }
    }

    return {
        communities,
        modularity
    };
}

// Komşu toplulukları bul
function getNeighborCommunities(node, graph, communities) {
    const neighborCommunities = new Set();
    graph.get(node).forEach(neighbor => {
        neighborCommunities.add(communities[neighbor]);
    });
    return neighborCommunities;
}

// Modülerlik kazancını hesapla
function calculateModularityGain(node, targetCommunity, graph, communities, totalWeight) {
    let k_i = 0;          // Düğümün toplam ağırlığı
    let k_i_in = 0;       // Hedef toplulukla olan bağlantıların ağırlığı
    let sum_tot = 0;      // Hedef topluluğun toplam ağırlığı

    // Düğümün bağlantılarını hesapla
    graph.get(node).forEach((neighbor) => {
        k_i++;
        if (communities[neighbor] === targetCommunity) {
            k_i_in++;
        }
    });

    // Hedef topluluğun toplam ağırlığını hesapla
    Object.entries(communities).forEach(([n, comm]) => {
        if (comm === targetCommunity) {
            graph.get(parseInt(n)).forEach(() => sum_tot++);
        }
    });

    // Modülerlik kazancını hesapla
    const gain = (k_i_in / (2 * totalWeight)) -
                (sum_tot * k_i) / (4 * totalWeight * totalWeight);

    return gain;
}

// Modülerlik hesapla
function calculateModularity(graph, communities, totalWeight) {
    let modularity = 0;
    const nodes = Array.from(graph.keys());

    nodes.forEach(i => {
        nodes.forEach(j => {
            if (communities[i] === communities[j]) {
                const actual = graph.get(i).has(j) ? 1 : 0;
                const expected = (graph.get(i).size * graph.get(j).size) / (2 * totalWeight);
                modularity += actual - expected;
            }
        });
    });

    return modularity / (2 * totalWeight);
}

// Toplulukları birleştir
function aggregateCommunities(communities) {
    const uniqueCommunities = [...new Set(Object.values(communities))];
    const newCommunities = {};
    
    uniqueCommunities.forEach((oldId, newId) => {
        Object.entries(communities).forEach(([node, community]) => {
            if (community === oldId) {
                newCommunities[node] = newId;
            }
        });
    });
    
    return newCommunities;
}

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
        const {email, password } = req.body;

        // Gerekli alanların kontrolü
        if (!email || !password) {
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
app.get("/api/shortest-path", (req, res) => {
    try {
        const { from, to } = req.query;
        const graph = globalGraph || initializeGraph();

        if (!from || !to) {
            return res.status(400).json({ error: "Başlangıç ve bitiş düğümleri gereklidir!" });
        }

        const start = parseInt(from), end = parseInt(to);
        
        if (!graph.has(start) || !graph.has(end)) {
            return res.json({ path: [], totalWeight: -1 });
        }

        // Dijkstra algoritması
        const dist = new Map();
        const prev = new Map();
        const queue = new Set(graph.keys());

        // Başlangıç değerlerini ayarla
        for (const node of graph.keys()) {
            dist.set(node, Infinity);
            prev.set(node, null);
        }
        dist.set(start, 0);

        while (queue.size > 0) {
            // En küçük mesafeli düğümü bul
            let u = Array.from(queue).reduce((a, b) => dist.get(a) < dist.get(b) ? a : b);
            queue.delete(u);

            if (u === end) break; // Hedef düğüme ulaştık

            // Komşuları kontrol et
            for (const v of graph.get(u)) {
                if (!queue.has(v)) continue;
                
                const alt = dist.get(u) + 1; // Kenar ağırlığı 1
                if (alt < dist.get(v)) {
                    dist.set(v, alt);
                    prev.set(v, u);
                }
            }
        }

        // Yolu oluştur
        const path = [];
        let current = end;
        if (prev.get(current) !== null || current === start) {
            while (current !== null) {
                path.unshift(current);
                current = prev.get(current);
            }
        }

        res.json({
            path,
            totalWeight: dist.get(end)
        });
    } catch (error) {
        console.error("En kısa yol hesaplama hatası:", error);
        res.status(500).json({ error: "En kısa yol hesaplanırken bir hata oluştu!" });
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
app.get("/api/analysis/communities", async (req, res) => {
    try {
        const graph = globalGraph || initializeGraph();
        const result = detectCommunities(graph);
        
        res.json({
            message: "Topluluklar başarıyla tespit edildi",
            communities: result.communities,
            modularity: result.modularity
        });
    } catch (error) {
        console.error("Community detection error:", error);
        res.status(500).json({ 
            error: "Topluluklar tespit edilirken bir hata oluştu!",
            details: error.message 
        });
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

// --- DOSYADAN OKUYAN YENİ API ENDPOINTLERİ ---

// Ağ verisini JSON olarak döndür
app.get("/api/network-data", (req, res) => {
    try {
        const graph = globalGraph || initializeGraph();
        const nodes = [];
        const links = [];
        const nodeSet = new Set();

        // Düğümleri ve bağlantıları hazırla
        for (const [source, targets] of graph.entries()) {
            if (!nodeSet.has(source)) {
                nodeSet.add(source);
                nodes.push({
                    id: source,
                    size: 10 + Math.min(targets.size * 2, 20),
                    color: targets.size > 10 ? '#ff4444' : '#1f77b4',
                    isTop5: targets.size > 15,
                    isCentral: targets.size > 12,
                    hasHighConnections: targets.size > 8,
                    connectionCount: targets.size
                });
            }

            for (const target of targets) {
                if (!nodeSet.has(target)) {
                    const targetConnections = graph.get(target);
                    nodeSet.add(target);
                    nodes.push({
                        id: target,
                        size: 10 + Math.min(targetConnections.size * 2, 20),
                        color: targetConnections.size > 10 ? '#ff4444' : '#1f77b4',
                        isTop5: targetConnections.size > 15,
                        isCentral: targetConnections.size > 12,
                        hasHighConnections: targetConnections.size > 8,
                        connectionCount: targetConnections.size
                    });
                }

                links.push({
                    source: source,
                    target: target,
                    isTop5Connection: graph.get(source).size > 15 && graph.get(target).size > 15
                });
            }
        }

        res.json({ nodes, links });
    } catch (error) {
        console.error('Ağ verisi oluşturma hatası:', error);
        res.status(500).json({ error: 'Ağ verisi oluşturulamadı' });
    }
});

// Statik dosya servisi - API endpoint'lerinden SONRA gelmeli
//app.use(express.static('public'));

// Ana sayfa için index.html'i sun - en sonda olmalı
/*app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});*/

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});

// Prisma bağlantı hatası yakalama
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Betweenness Centrality hesaplama fonksiyonu
async function calculateBetweennessCentrality() {
    const graph = globalGraph || initializeGraph();
    const betweenness = new Map();
    const nodes = Array.from(graph.keys());

    // Her düğüm için başlangıç değeri
    nodes.forEach(node => betweenness.set(node, 0));

    // Her düğüm çifti için en kısa yolları hesapla
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const start = nodes[i];
            const end = nodes[j];
            
            // Dijkstra algoritması ile en kısa yolu bul
            const { path } = findShortestPath(graph, start, end);
            
            // Yol üzerindeki ara düğümlerin betweenness değerlerini artır
            if (path.length > 2) {
                path.slice(1, -1).forEach(node => {
                    betweenness.set(node, betweenness.get(node) + 1);
                });
            }
        }
    }

    // Sonuçları normalize et ve sırala
    const maxValue = Math.max(...betweenness.values());
    const results = Array.from(betweenness.entries())
        .map(([node, value]) => ({
            node,
            betweenness: value / maxValue
        }))
        .sort((a, b) => b.betweenness - a.betweenness);

    return results;
}

// Ağ yoğunluğu analizi fonksiyonu
async function analyzeNetworkDensity() {
    const graph = globalGraph || initializeGraph();
    const nodes = Array.from(graph.keys());
    const n = nodes.length;
    
    // Toplam bağlantı sayısı
    let totalConnections = 0;
    nodes.forEach(node => {
        totalConnections += graph.get(node).size;
    });
    totalConnections /= 2; // Her bağlantı iki kez sayıldığı için

    // Maksimum olası bağlantı sayısı
    const maxPossibleConnections = (n * (n - 1)) / 2;

    // Genel yoğunluk
    const overallDensity = totalConnections / maxPossibleConnections;

    // Topluluk bazlı yoğunluk
    const communities = detectCommunities(graph).communities;
    const communityDensities = new Map();
    const communityNodes = new Map();

    // Toplulukları grupla
    Object.entries(communities).forEach(([node, community]) => {
        if (!communityNodes.has(community)) {
            communityNodes.set(community, []);
        }
        communityNodes.get(community).push(parseInt(node));
    });

    // Her topluluk için yoğunluk hesapla
    communityNodes.forEach((nodes, community) => {
        let communityConnections = 0;
        nodes.forEach(node => {
            const neighbors = graph.get(node);
            neighbors.forEach(neighbor => {
                if (nodes.includes(neighbor)) {
                    communityConnections++;
                }
            });
        });
        communityConnections /= 2;
        const maxCommunityConnections = (nodes.length * (nodes.length - 1)) / 2;
        communityDensities.set(community, communityConnections / maxCommunityConnections);
    });

    return {
        overallDensity,
        totalConnections,
        nodeCount: n,
        maxPossibleConnections,
        communityDensities: Object.fromEntries(communityDensities),
        timeBasedDensity: {} // Zaman bazlı analiz için placeholder
    };
}

// Kullanıcı aktivite analizi fonksiyonu
async function analyzeUserActivity() {
    const graph = globalGraph || initializeGraph();
    const nodes = Array.from(graph.keys());
    
    // Her kullanıcı için bağlantı sayısını hesapla
    const userActivity = nodes.map(node => ({
        userId: node,
        connectionCount: graph.get(node).size
    }));

    // Aktivite seviyelerine göre sırala
    userActivity.sort((a, b) => b.connectionCount - a.connectionCount);

    // Aktivite kategorileri
    const highThreshold = Math.floor(userActivity.length * 0.1); // Üst %10
    const moderateThreshold = Math.floor(userActivity.length * 0.3); // Üst %30

    return {
        timestamp: new Date(),
        categories: {
            highlyActive: userActivity.slice(0, highThreshold),
            moderatelyActive: userActivity.slice(highThreshold, moderateThreshold),
            lessActive: userActivity.slice(moderateThreshold)
        },
        topUsers: userActivity.slice(0, 10)
    };
}

// En kısa yol bulma yardımcı fonksiyonu
function findShortestPath(graph, start, end) {
    const dist = new Map();
    const prev = new Map();
    const queue = new Set(graph.keys());

    // Başlangıç değerlerini ayarla
    for (const node of graph.keys()) {
        dist.set(node, Infinity);
        prev.set(node, null);
    }
    dist.set(start, 0);

    while (queue.size > 0) {
        let u = Array.from(queue).reduce((a, b) => dist.get(a) < dist.get(b) ? a : b);
        queue.delete(u);

        if (u === end) break;

        for (const v of graph.get(u)) {
            if (!queue.has(v)) continue;
            
            const alt = dist.get(u) + 1;
            if (alt < dist.get(v)) {
                dist.set(v, alt);
                prev.set(v, u);
            }
        }
    }

    const path = [];
    let current = end;
    while (current !== null) {
        path.unshift(current);
        current = prev.get(current);
    }

    return {
        path,
        distance: dist.get(end)
    };
}

//1. Statik dosya servisleri
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
