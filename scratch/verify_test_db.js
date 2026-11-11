const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '../backend/.env'), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let v = (m[2] || '').trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

// Override BOTH DATABASE_URL and DIRECT_URL to point to ambit_test_db
process.env.DATABASE_URL = process.env.DATABASE_URL.replace('/neondb', '/ambit_test_db');
process.env.DIRECT_URL = process.env.DIRECT_URL.replace('/neondb', '/ambit_test_db');

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const testPrisma = new PrismaClient();

async function verifyTestDb() {
  try {
    const res = await testPrisma.$queryRawUnsafe('SELECT current_database(), current_user;');
    console.log('SUCCESS! Connected to isolated test database:', res);
  } catch (err) {
    console.error('Failed to connect to test db:', err.message);
  } finally {
    await testPrisma.$disconnect();
  }
}

verifyTestDb();
