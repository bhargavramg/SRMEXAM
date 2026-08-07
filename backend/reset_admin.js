const bcrypt = require('bcrypt');
const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
async function main() {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash('admin123', salt);
  await prisma.user.update({
    where: { email: 'admin@examportal.com' },
    data: { password: hash }
  });
  console.log('Admin password reset to admin123');
}
main().finally(() => prisma.$disconnect());
