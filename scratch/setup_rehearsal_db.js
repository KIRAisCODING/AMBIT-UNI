const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

async function resetRehearsalDb() {
  console.log('Resetting fresh isolated database: ambit_rehearsal...');
  // Terminate any active connections to ambit_rehearsal
  await prisma.$executeRawUnsafe(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'ambit_rehearsal' AND pid <> pg_backend_pid();
  `);
  await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ambit_rehearsal;`);
  await prisma.$executeRawUnsafe(`CREATE DATABASE ambit_rehearsal;`);
  console.log('Fresh isolated database ambit_rehearsal created successfully.');
}

resetRehearsalDb()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

