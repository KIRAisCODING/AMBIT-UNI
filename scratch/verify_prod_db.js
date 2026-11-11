const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prodPrisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

async function verifyProd() {
  const noteCount = await prodPrisma.note.count();
  const taskCount = await prodPrisma.task.count();
  const tagCount = await prodPrisma.tag.count();
  const userCount = await prodPrisma.user.count();
  console.log('Production neondb verified:');
  console.log('Notes:', noteCount, '| Tasks:', taskCount, '| Tags:', tagCount, '| Users:', userCount);
}
verifyProd().finally(() => prodPrisma.$disconnect());

