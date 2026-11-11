const path = require('path');
const fs = require('fs');

const env = fs.readFileSync(path.join(__dirname, '../backend/.env'), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let v = (m[2] || '').trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

// Point to test db
const directTestUrl = process.env.DIRECT_URL.replace('/neondb?', '/ambit_test_db?');
process.env.DATABASE_URL = directTestUrl;
process.env.DIRECT_URL = directTestUrl;

// Register ts-node or load compiled
console.log('Test environment setup complete.');

