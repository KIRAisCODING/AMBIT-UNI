/**
 * Read-only database audit for Milestone 2.3 Verification
 * Inspects both ambit_test_db and production neondb.
 * Mask connection strings to prevent credential exposure.
 */

const path = require('path');
const fs = require('fs');

// Load backend .env
const envPath = path.join(__dirname, '../backend/.env');
const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = (match[2] || '').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      env[match[1]] = value;
    }
  }
}

const prodDirectUrl = env.DIRECT_URL;
const testDirectUrl = env.DIRECT_URL.replace('/neondb?', '/ambit_test_db?');

const backendDir = path.resolve(__dirname, '../backend');
const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));

function maskUrl(url) {
  if (!url) return 'undefined';
  return url.replace(/postgres(ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)(\?.*)?/, 'postgres://$2:****@$4/$5$6');
}

async function audit() {
  console.log('========================================================================');
  console.log(' AMBIT MILESTONE 2.3 READ-ONLY VERIFICATION AUDIT');
  console.log('========================================================================\n');

  console.log('Target ambit_test_db URL:', maskUrl(testDirectUrl));
  console.log('Target production neondb URL:', maskUrl(prodDirectUrl));
  console.log();

  const testPrisma = new PrismaClient({ datasources: { db: { url: testDirectUrl } } });
  const prodPrisma = new PrismaClient({ datasources: { db: { url: prodDirectUrl } } });

  try {
    // 1. Audit ambit_test_db
    console.log('--- 1. Isolated Test Database (ambit_test_db) ---');
    const testUsers = await testPrisma.user.findMany({ select: { id: true, email: true } });
    const testHabits = await testPrisma.habit.count();
    const testHabitLogs = await testPrisma.habitLog.count();
    const testHabitsDetail = await testPrisma.habit.findMany({ select: { id: true, name: true, userId: true, frequency: true, archivedAt: true } });
    const testHabitLogsDetail = await testPrisma.habitLog.findMany({ select: { id: true, habitId: true, date: true, userId: true } });

    console.log(`Users in test DB (${testUsers.length}):`, testUsers.map(u => u.email));
    console.log(`Habits in test DB (${testHabits}):`, testHabitsDetail);
    console.log(`HabitLogs in test DB (${testHabitLogs}):`, testHabitLogsDetail);

    // 2. Audit production neondb
    console.log('\n--- 2. Production Database (neondb) ---');
    const prodUsers = await prodPrisma.user.findMany({ select: { id: true, email: true, createdAt: true } });
    const prodHabits = await prodPrisma.habit.count();
    const prodHabitLogs = await prodPrisma.habitLog.count();
    const prodTasks = await prodPrisma.task.count();
    const prodNotes = await prodPrisma.note.count();
    const prodTags = await prodPrisma.tag.count();
    const prodAccounts = await prodPrisma.account.count();
    const prodSettings = await prodPrisma.settings.count();
    const prodAreas = await prodPrisma.area.count();
    const prodProjects = await prodPrisma.project.count();
    const prodSubProjects = await prodPrisma.subProject.count();

    console.log(`Production Users count: ${prodUsers.length}`);
    console.log(`Production Users emails:`, prodUsers.map(u => u.email));
    console.log(`Production Habits count: ${prodHabits}`);
    console.log(`Production HabitLogs count: ${prodHabitLogs}`);
    console.log(`Production Tasks count: ${prodTasks}`);
    console.log(`Production Notes count: ${prodNotes}`);
    console.log(`Production Tags count: ${prodTags}`);
    console.log(`Production Accounts count: ${prodAccounts}`);
    console.log(`Production Settings count: ${prodSettings}`);
    console.log(`Production Areas count: ${prodAreas}`);
    console.log(`Production Projects count: ${prodProjects}`);
    console.log(`Production SubProjects count: ${prodSubProjects}`);

    // Check migration history in production
    const prodMigrations = await prodPrisma.$queryRawUnsafe(
      `SELECT migration_name, finished_at, rolled_back_at, applied_steps_count FROM _prisma_migrations ORDER BY started_at ASC;`
    );
    console.log(`Production Prisma Migrations:`, prodMigrations);

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await testPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

audit();

