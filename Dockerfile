# Temel image: Node 18
FROM node:18

# Uygulama dosyaları için klasör oluştur
WORKDIR /app

# Bağımlılık dosyalarını kopyala ve yükle
COPY package*.json ./
RUN npm install

# Geri kalan dosyaları kopyala
COPY . .

# Prisma client'ı oluştur
RUN npx prisma generate

# Uygulamanın dışarıya açılacağı port
EXPOSE 3000

# migrate deploy ve sunucuyu birlikte başlat
CMD ["sh", "-c", "npx prisma migrate deploy && node server.cjs"]
