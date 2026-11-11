/**
 * Pure read-only verification of production database (neondb)
 * Does NOT perform any writes, updates, inserts, or deletes.
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

const prodDirectUrl = env.DIRECT_URL;
if (!prodDirectUrl || !prodDirectUrl.includes('neondb')) {
  console.error('DIRECT_URL does not point to neondb');
  process.exit(1);
}

const backendDir = path.resolve(__dirname, '../backend');
const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
const prodPrisma = new PrismaClient({ datasources: { db: { url: prodDirectUrl } } });

async function verifyProd() {
  console.log('--- Production Database Read-Only Inspection ---');
  try {
    const [
      usersCount,
      accountsCount,
      settingsCount,
      sessionsCount,
      feedbacksCount,
      capturesCount,
      areasCount,
      projectsCount,
      subProjectsCount,
      tasksCount,
      notesCount,
      habitsCount,
      habitLogsCount,
      tagsCount
    ] = await Promise.all([
      prodPrisma.user.count(),
      prodPrisma.account.count(),
      prodPrisma.settings.count(),
      prodPrisma.session.count(),
      prodPrisma.feedback.count(),
      prodPrisma.capture.count(),
      prodPrisma.area.count(),
      prodPrisma.project.count(),
      prodPrisma.subProject.count(),
      prodPrisma.task.count(),
      prodPrisma.note.count(),
      prodPrisma.habit.count(),
      prodPrisma.habitLog.count(),
      prodPrisma.tag.count()
    ]);

    console.log('Production Counts:');
    console.log(`- Users:       ${usersCount}`);
    console.log(`- Accounts:    ${accountsCount}`);
    console.log(`- Settings:    ${settingsCount}`);
    console.log(`- Sessions:    ${sessionsCount}`);
    console.log(`- Feedbacks:   ${feedbacksCount}`);
    console.log(`- Captures:    ${capturesCount}`);
    console.log(`- Areas:       ${areasCount}`);
    console.log(`- Projects:    ${projectsCount}`);
    console.log(`- SubProjects: ${subProjectsCount}`);
    console.log(`- Tasks:       ${tasksCount}`);
    console.log(`- Notes:       ${notesCount}`);
    console.log(`- Habits:      ${habitsCount}`);
    console.log(`- HabitLogs:   ${habitLogsCount}`);
    console.log(`- Tags:        ${tagsCount}`);

    const migrations = await prodPrisma.$queryRawUnsafe(
      `SELECT migration_name, finished_at, rolled_back_at, applied_steps_count FROM _prisma_migrations ORDER BY started_at ASC;`
    );
    console.log('\nPrisma Migrations Applied in Production:');
    for (const m of migrations) {
      console.log(`- ${m.migration_name}: finished_at=${m.finished_at ? m.finished_at.toISOString() : 'null'}, rolled_back_at=${m.rolled_back_at}, applied_steps=${m.applied_steps_count}`);
    }

  } catch (err) {
    console.error('Error during read-only inspection:', err);
  } finally {
    await prodPrisma.$disconnect();
  }
}

verifyProd();

