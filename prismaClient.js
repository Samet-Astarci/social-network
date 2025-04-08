// prismaClient.js
const { PrismaClient } = require("@prisma/client"); // PrismaClient'ı içe aktarıyoruz.
const prisma = new PrismaClient(); // PrismaClient'ı başlatıyoruz.

module.exports = prisma; // Prisma Client'ı dışarıya aktarıyoruz.
