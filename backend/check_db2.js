const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'superadmin' } }
  });
  console.log("Users with superadmin:", users);
  
  const allUsers = await prisma.user.findMany();
  console.log("ALL USers summary:", allUsers.map(u => ({ email: u.email, role: u.role })));
}

check().catch(console.error).finally(() => prisma.$disconnect());
