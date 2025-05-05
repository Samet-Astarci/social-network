const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("./prismaClient");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000; // Docker ile uyumlu hale getirmek için PORT'u çevresel değişkenden alıyoruz

app.use(express.json());
app.use(cors());

// Token doğrulama middleware
const verifyToken = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Token gerekli!" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey"); // Secret key'i çevresel değişkenden alıyoruz
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Geçersiz token!" });
    }
};

// Kullanıcı Kayıt Endpoint’i
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: "Lütfen tüm alanları doldurun!" });
    }

    const userExists = await prisma.user.findUnique({
        where: { email: email },
    });

    if (userExists) {
        return res.status(400).json({ error: "Bu e-posta zaten kayıtlı!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
        data: {
            username: username,
            email: email,
            password: hashedPassword,
        },
    });

    const token = jwt.sign(
        { userId: newUser.id },
        process.env.JWT_SECRET || "secretkey",
        { expiresIn: "1h" }
    );

    return res.status(201).json({
        message: "Kullanıcı başarıyla kaydedildi!",
        token: token,
    });
});

// Kullanıcı Giriş Endpoint’i
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "E-posta ve şifre gereklidir!" });
    }

    const user = await prisma.user.findUnique({
        where: { email: email },
    });

    if (!user) {
        return res.status(400).json({ error: "Kullanıcı bulunamadı!" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(400).json({ error: "Geçersiz şifre!" });
    }

    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || "secretkey",
        { expiresIn: "1h" }
    );

    return res.status(200).json({
        message: "Giriş başarılı!",
        token: token,
    });
});

// Korumalı Kullanıcı Profili Endpoint’i
app.get("/profile", verifyToken, async (req, res) => {
    const userId = req.userId;
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı!" });
    }

    return res.status(200).json({
        message: "Profil bilgileri başarıyla alındı!",
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
        },
    });
});

// Arkadaş Ekleme Endpoint’i
app.post("/connections", verifyToken, async (req, res) => {
    const { friendId } = req.body;
    const userId = req.userId;

    if (!friendId) {
        return res.status(400).json({ error: "Arkadaş ID'si gereklidir!" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const friend = await prisma.user.findUnique({ where: { id: friendId } });

    if (!user || !friend) {
        return res.status(404).json({ error: "Kullanıcı veya arkadaş bulunamadı!" });
    }

    const existingConnection = await prisma.connection.findFirst({
        where: {
            userId: userId,
            friendId: friendId,
        },
    });

    if (existingConnection) {
        return res.status(400).json({ error: "Bu kullanıcı zaten arkadaşınız!" });
    }

    const connection = await prisma.connection.create({
        data: {
            userId: userId,
            friendId: friendId,
        },
    });

    return res.status(201).json({
        message: "Arkadaş başarıyla eklendi!",
        connection,
    });
});

// Arkadaş Listesi Endpoint’i
app.get("/connections/:userId", verifyToken, async (req, res) => {
    const { userId } = req.params;
    const requesterId = req.userId;

    if (parseInt(userId) !== requesterId) {
        return res.status(403).json({ error: "Yetkisiz erişim!" });
    }

    try {
        const connections = await prisma.connection.findMany({
            where: { userId: parseInt(userId) },
            include: {
                friend: {
                    select: { id: true, username: true, email: true },
                },
            },
        });

        const friends = connections.map((conn) => conn.friend);
        return res.status(200).json({ friends });
    } catch (error) {
        return res.status(500).json({ error: "Arkadaş listesi alınamadı!" });
    }
});

// Arkadaş Silme Endpoint’i
app.delete("/connections/:friendId", verifyToken, async (req, res) => {
    const { friendId } = req.params;
    const userId = req.userId;

    try {
        const connection = await prisma.connection.findFirst({
            where: {
                userId: userId,
                friendId: parseInt(friendId),
            },
        });

        if (!connection) {
            return res.status(404).json({
                error: "Arkadaşlık ilişkisi bulunamadı!",
            });
        }

        await prisma.connection.delete({
            where: { id: connection.id },
        });

        return res.status(200).json({ message: "Arkadaş başarıyla silindi!" });
    } catch (error) {
        return res.status(500).json({ error: "Arkadaş silme başarısız!" });
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});