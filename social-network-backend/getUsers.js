const prisma = require("./prismaClient");

async function getUsers() {
    const users = await prisma.user.findMany();  // tüm kullanıcıları getirir
    console.log(users);
}
  
getUsers();