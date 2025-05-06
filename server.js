const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// CORS ve middleware ayarları
app.use(cors({
    origin: 'http://localhost:3000', // Frontend ile uyumlu CORS
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public')); // Statik dosyaları (örneğin, frontend1.html) servis et

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

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

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});

// Prisma bağlantı hatası yakalama
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});