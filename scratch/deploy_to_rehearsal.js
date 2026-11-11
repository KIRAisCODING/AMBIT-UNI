const { execSync } = require('child_process');
const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const backendDir = path.resolve(__dirname, '../backend');

let rehearsalUrl = process.env.DIRECT_URL;
if (rehearsalUrl.includes('/neondb?')) {
  rehearsalUrl = rehearsalUrl.replace('/neondb?', '/ambit_rehearsal?');
} else if (rehearsalUrl.includes('/neondb')) {
  rehearsalUrl = rehearsalUrl.replace('/neondb', '/ambit_rehearsal');
}

console.log('Deploying all migrations to fresh isolated database: ambit_rehearsal...');

const env = {
  ...process.env,
  DATABASE_URL: rehearsalUrl,
  DIRECT_URL: rehearsalUrl,
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

