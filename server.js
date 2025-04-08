const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("./prismaClient"); // Prisma Client'ı doğru şekilde içe aktarıyoruz.
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(express.json()); // JSON verilerini işleme
app.use(cors()); // CORS izinlerini tüm istekler için açıyoruz

// Kullanıcı Kayıt Endpoint’i
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    // Tüm alanların dolu olduğundan emin olalım
    if (!username || !email || !password) {
        return res.status(400).json({ error: "Lütfen tüm alanları doldurun!" });
    }

    // E-posta ile kullanıcıyı kontrol edelim, daha önce var mı?
    const userExists = await prisma.user.findUnique({
        where: { email: email },
    });

    if (userExists) {
        return res.status(400).json({ error: "Bu e-posta zaten kayıtlı!" });
    }

    // Şifreyi güvenli bir şekilde hash'leyelim
    const hashedPassword = await bcrypt.hash(password, 10);

    // Yeni kullanıcıyı veritabanına ekleyelim
    const newUser = await prisma.user.create({
        data: {
            username: username,
            email: email,
            password: hashedPassword,
        },
    });

    // Başarılı kayıt sonrası token oluşturalım
    const token = jwt.sign({ userId: newUser.id }, "secretkey", {
        expiresIn: "1h",
    });

    // Kullanıcıyı ve token'ı döndürelim
    return res.status(201).json({
        message: "Kullanıcı başarıyla kaydedildi!",
        token: token,
    });
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
// Kullanıcı Giriş Endpoint’i
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // E-posta ve şifrenin doğruluğunu kontrol edelim
    if (!email || !password) {
        return res.status(400).json({ error: "E-posta ve şifre gereklidir!" });
    }

    // Veritabanında kullanıcıyı bulalım
    const user = await prisma.user.findUnique({
        where: { email: email },
    });

    if (!user) {
        return res.status(400).json({ error: "Kullanıcı bulunamadı!" });
    }

    // Şifreyi doğrulayalım
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return res.status(400).json({ error: "Geçersiz şifre!" });
    }

    // Token oluşturuyoruz
    const token = jwt.sign({ userId: user.id }, "secretkey", {
        expiresIn: "1h",
    });

    // Başarılı giriş sonrası token'ı döndürelim
    return res.status(200).json({
        message: "Giriş başarılı!",
        token: token,
        deneme:"selam"
    });
});
// Token doğrulama middleware'i
const verifyTokenold = (req, res, next) => {
    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ error: "Token gerekli!" });
    }

    try {
        const decoded = jwt.verify(token, "secretkey"); // Token'ı doğruluyoruz.
        req.userId = decoded.userId; // Kullanıcı ID'sini req objesine ekliyoruz.
        next(); // İleriye gitmesine izin veriyoruz.
    } catch (error) {
        return res.status(401).json({ error: "Geçersiz token!", token: token, });
    }
};
const verifyToken = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1]; // Token'ı Authorization header'dan alıyoruz

    if (!token) {
        return res.status(401).json({ error: "Token gerekli!" });
    }

    try {
        const decoded = jwt.verify(token, "secretkey"); // Burada secret key doğru olmalı
        req.userId = decoded.userId; // Token'dan alınan userId'yi req objesine ekliyoruz
        next(); // Middleware başarılıysa, devam ediyoruz
    } catch (error) {
        return res.status(401).json({ error: "Geçersiz token!", token: token,  }); // Token geçersizse hata döndürüyoruz
    }
};

// Korumalı Kullanıcı Profili Endpoint’i
app.get("/profile", verifyToken, async (req, res) => {
    const userId = req.userId; // Middleware'den alınan userId'yi kullanıyoruz.

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
