const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../backend/.env'), 'utf8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

const testUrl = process.env.DIRECT_URL.replace('/neondb?', '/ambit_test_db?');
console.log('Testing connection to:', testUrl.replace(/:[^:@]+@/, ':***@'));

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });

async function main() {
  await prisma.$connect();
  console.log('SUCCESS: Connected to ambit_test_db');
  const count = await prisma.user.count();
  console.log('User count:', count);
}

main().catch(err => {
  console.error('ERROR:', err);
}).finally(() => {
  prisma.$disconnect();
});

