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

// Only replace database name at /neondb?
const directTestUrl = process.env.DIRECT_URL.replace('/neondb?', '/ambit_test_db?');
process.env.DATABASE_URL = directTestUrl;
process.env.DIRECT_URL = directTestUrl;

console.log('Testing direct connection to:', directTestUrl.replace(/:[^:@]+@/, ':***@'));

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const testPrisma = new PrismaClient({
  datasources: {
    db: { url: directTestUrl }
  }
});

async function run() {
  try {
    const res = await testPrisma.$queryRawUnsafe('SELECT current_database(), current_user;');
    console.log('SUCCESS! Connected to isolated test DB:', res);
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await testPrisma.$disconnect();
  }
}

run();
