const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

async function main() {
  const dbs = await prisma.$queryRawUnsafe(`
    SELECT datname FROM pg_database WHERE datistemplate = false;
  `);
  console.log('Databases on Neon instance:', dbs.map(d => d.datname));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

