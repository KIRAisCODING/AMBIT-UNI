const { execSync } = require('child_process');
const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const backendDir = path.resolve(__dirname, '../backend');

let testUrl = process.env.DIRECT_URL;
if (testUrl.includes('/neondb?')) {
  testUrl = testUrl.replace('/neondb?', '/ambit_test_db?');
} else if (testUrl.includes('/neondb')) {
  testUrl = testUrl.replace('/neondb', '/ambit_test_db');
}

console.log('Deploying migration 2_correct_notetags_foreign_keys to existing ambit_test_db...');

const env = {
  ...process.env,
  DATABASE_URL: testUrl,
  DIRECT_URL: testUrl,
};

try {
  const output = execSync('npx prisma migrate deploy', {
    cwd: backendDir,
    env,
    encoding: 'utf8',
  });
  console.log(output);

  const statusOutput = execSync('npx prisma migrate status', {
    cwd: backendDir,
    env,
    encoding: 'utf8',
  });
  console.log(statusOutput);
} catch (err) {
  console.error('Migration failed:', err.stdout || err.message);
  process.exit(1);
}

