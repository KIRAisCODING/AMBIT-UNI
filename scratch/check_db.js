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

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function test() {
  try {
    const res = await prisma.$queryRawUnsafe('SELECT current_database(), current_user;');
    console.log('SUCCESS:', res);
    
    // Check if we can create a separate test database
    try {
      await prisma.$executeRawUnsafe('CREATE DATABASE ambit_test_db;');
      console.log('CREATE DATABASE succeeded: ambit_test_db created!');
    } catch (dbErr) {
      console.log('CREATE DATABASE status:', dbErr.message);
    }
  } catch(e) {
    console.log('FAIL:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
