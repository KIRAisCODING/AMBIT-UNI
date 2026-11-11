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
  console.log('Aligning _NoteTags foreign keys on ambit_test_db with Prisma convention...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" DROP CONSTRAINT IF EXISTS "_NoteTags_A_fkey"`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" DROP CONSTRAINT IF EXISTS "_NoteTags_B_fkey"`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_A_fkey" FOREIGN KEY ("A") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
  console.log('Successfully aligned _NoteTags foreign keys on ambit_test_db.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
