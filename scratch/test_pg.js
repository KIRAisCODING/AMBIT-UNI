const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '../backend/node_modules/pg'));

const env = fs.readFileSync(path.join(__dirname, '../backend/.env'), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let v = (m[2] || '').trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

async function testPg() {
  const testUrl = process.env.DIRECT_URL.replace('/neondb', '/ambit_test_db');
  console.log('Connecting to:', testUrl.replace(/:[^:@]+@/, ':***@'));
  const client = new Client({ connectionString: testUrl });
  try {
    await client.connect();
    const res = await client.query('SELECT current_database(), current_user;');
    console.log('pg client success:', res.rows);
  } catch (err) {
    console.error('pg client error:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

testPg();

