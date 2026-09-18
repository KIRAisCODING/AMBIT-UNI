const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'InboxItem'
  `);
  console.log("InboxItem columns:", cols);
  
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log("Public tables:", tables.map(t => t.table_name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
