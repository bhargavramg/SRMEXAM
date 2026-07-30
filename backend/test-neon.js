const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_F9JEosmMdbi2@ep-shy-sun-av73x4d8-pooler.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true'
    }
  }
});

async function main() {
  try {
    await prisma.$connect();
    console.log('Successfully connected to Neon PostgreSQL!');
    process.exit(0);
  } catch (e) {
    console.error('Connection failed:', e.message);
    process.exit(1);
  }
}
main();
