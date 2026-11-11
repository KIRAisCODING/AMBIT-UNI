/**
 * Pure read-only inspection of test database (ambit_test_db)
 */

const path = require('path');
const fs = require('fs');

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

const testDirectUrl = env.DIRECT_URL.replace('/neondb?', '/ambit_test_db?');
const backendDir = path.resolve(__dirname, '../backend');
const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
const testPrisma = new PrismaClient({ datasources: { db: { url: testDirectUrl } } });

async function checkTestDb() {
  console.log('--- ambit_test_db Read-Only Inspection ---');
  try {
    const [
      usersCount,
      habitsCount,
      habitLogsCount,
      tasksCount,
      notesCount,
      areasCount,
      projectsCount,
      subProjectsCount,
      capturesCount,
      tagsCount
    ] = await Promise.all([
      testPrisma.user.count(),
      testPrisma.habit.count(),
      testPrisma.habitLog.count(),
      testPrisma.task.count(),
      testPrisma.note.count(),
      testPrisma.area.count(),
      testPrisma.project.count(),
      testPrisma.subProject.count(),
      testPrisma.capture.count(),
      testPrisma.tag.count()
    ]);

    console.log(`- Users:       ${usersCount}`);
    console.log(`- Habits:      ${habitsCount}`);
    console.log(`- HabitLogs:   ${habitLogsCount}`);
    console.log(`- Tasks:       ${tasksCount}`);
    console.log(`- Notes:       ${notesCount}`);
    console.log(`- Areas:       ${areasCount}`);
    console.log(`- Projects:    ${projectsCount}`);
    console.log(`- SubProjects: ${subProjectsCount}`);
    console.log(`- Captures:    ${capturesCount}`);
    console.log(`- Tags:        ${tagsCount}`);

    const users = await testPrisma.user.findMany({ select: { email: true } });
    console.log(`- User Emails:`, users.map(u => u.email));

  } catch (err) {
    console.error('Error during test db inspection:', err);
  } finally {
    await testPrisma.$disconnect();
  }
}

checkTestDb();

