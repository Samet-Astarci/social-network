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

# Migration'ı canlı ortamda uygulamak için
RUN npx prisma migrate deploy

# Uygulamanın dışarıya açılacağı port
EXPOSE 3000

# Uygulamanın çalıştırılma komutu
CMD ["node", "server.js"]
