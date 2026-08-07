const { PrismaClient } = require('./prisma/generated/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkLogin() {
  const identifier = 'suseelag@srmist.edu.in';
  const password = 'suseelamam1234';

  console.log(`Checking user: ${identifier}`);
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { register_no: identifier }
      ]
    }
  });

  if (!user) {
    console.log('User not found.');
    return;
  }

  console.log(`User found: ID=${user.id}, Role=${user.role}, Status=${user.status}`);
  
  const isPasswordValid = await bcrypt.compare(password, user.password);
  console.log(`Password valid: ${isPasswordValid}`);

  // Let's also test an admin account if exists
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (admin) {
    console.log(`Admin found: ${admin.email}`);
    const adminPassValid = await bcrypt.compare('admin123', admin.password);
    console.log(`Admin password (admin123) valid: ${adminPassValid}`);
  }
}

checkLogin().catch(console.error).finally(() => prisma.$disconnect());
