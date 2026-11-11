const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

let directTestUrl = process.env.DIRECT_URL;
if (directTestUrl.includes('/neondb?')) {
  directTestUrl = directTestUrl.replace('/neondb?', '/ambit_test_db?');
} else if (directTestUrl.includes('/neondb')) {
  directTestUrl = directTestUrl.replace('/neondb', '/ambit_test_db');
}

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient({ datasources: { db: { url: directTestUrl } } });

async function main() {
  const fks = await prisma.$queryRawUnsafe(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = '_NoteTags';
  `);
  console.log('Foreign keys on _NoteTags in ambit_test_db:', fks);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

