# Temel image: Node 18
FROM node:18

# Uygulama dosyaları için klasör oluştur
WORKDIR /app

# Bağımlılık dosyalarını kopyala ve yükle
COPY package*.json ./
RUN npm install

# Geri kalan dosyaları kopyala
COPY . .
RUN npx prisma generate

# Uygulamanın dışarıya açılacağı port
EXPOSE 3000

# Uygulamanın çalıştırılma komutu
CMD ["node", "server.js"]
