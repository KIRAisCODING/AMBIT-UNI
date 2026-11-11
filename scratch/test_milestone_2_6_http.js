/**
 * AMBIT Milestone 2.6 HTTP Integration Test Suite
 * Executes against dedicated isolated database: ambit_test_db
 * Tests Analytics, Reporting & System Reset API Refactoring
 */

const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';

// 1. Load backend .env and target isolated test database ambit_test_db
const envPath = path.join(__dirname, '../backend/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = (match[2] || '').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  }
}

const directTestUrl = process.env.DIRECT_URL.replace('/neondb?', '/ambit_test_db?');
process.env.DATABASE_URL = directTestUrl;
process.env.DIRECT_URL = directTestUrl;

// Guard against accidental production writes
if (!process.env.DATABASE_URL.includes('ambit_test_db')) {
  console.error('FATAL: Database URL is not pointed to ambit_test_db! Aborting.');
  process.exit(1);
}

const backendDir = path.resolve(__dirname, '../backend');
const jiti = require(path.join(backendDir, 'node_modules/jiti'))(__filename, {
  esmResolve: true,
  interopDefault: true,
  alias: {
    '@/auth': path.join(backendDir, 'auth.ts'),
    '@/lib/prisma': path.join(backendDir, 'lib/prisma.ts'),
    '@/lib/rateLimit': path.join(backendDir, 'lib/rateLimit.ts'),
    '@/lib/verifyHierarchy': path.join(backendDir, 'lib/verifyHierarchy.ts'),
    '@/lib/deleteHierarchy': path.join(backendDir, 'lib/deleteHierarchy.ts'),
    '@/lib/dateUtils': path.join(backendDir, 'lib/dateUtils.ts'),
    '@/lib/habitUtils': path.join(backendDir, 'lib/habitUtils.ts'),
    '@': backendDir,
  },
});

const { PrismaClient, TaskStatus, Priority, HabitFrequency, ProjectStatus, CaptureStatus } = require(
  path.join(backendDir, 'node_modules/@prisma/client')
);
const prisma = new PrismaClient({ datasources: { db: { url: directTestUrl } } });

const { __setTestSession, LIMIT_CONFIGS } = jiti(path.join(backendDir, 'lib/rateLimit.ts'));
LIMIT_CONFIGS.write.limit = 10000;
LIMIT_CONFIGS.read.limit = 10000;

// Target route handlers
const analyticsRoute = jiti(path.join(backendDir, 'app/api/analytics/route.ts'));
const resetRoute = jiti(path.join(backendDir, 'app/api/settings/reset/route.ts'));

// Test state
let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

const userAId = 'm26-test-user-a-' + Date.now();
const userBId = 'm26-test-user-b-' + Date.now();

async function run() {
  console.log('====================================================');
  console.log('AMBIT Stage 2, Milestone 2.6 Integration Test Suite');
  console.log(`Database Target: ${process.env.DATABASE_URL.split('@')[1]}`);
  console.log('====================================================\n');

  try {
    // 0. Setup test users
    await prisma.user.createMany({
      data: [
        { id: userAId, email: `usera-${Date.now()}@test.ambit.ai`, name: 'User A' },
        { id: userBId, email: `userb-${Date.now()}@test.ambit.ai`, name: 'User B' },
      ],
    });
    await prisma.settings.createMany({
      data: [
        { userId: userAId, userName: 'User A' },
        { userId: userBId, userName: 'User B' },
      ],
    });

    // ====================================================
    // SUITE 1: Analytics Endpoint Security & Authentication
    // ====================================================
    console.log('--- Suite 1: Analytics Security & Authentication ---');
    {
      __setTestSession(null);
      const req = new Request('http://localhost:3000/api/analytics');
      const res = await analyticsRoute.GET(req);
      assert(res.status === 401, 'Unauthenticated request rejected with 401');
      const body = await res.json();
      assert(body.error === 'Unauthorized', 'Error body indicates Unauthorized');
    }

    // ====================================================
    // SUITE 2: Area Progress Calculation Engine
    // ====================================================
    console.log('\n--- Suite 2: Area Progress Calculation Engine ---');
    let areaWork, areaPersonal, proj1, sub1;
    {
      __setTestSession({ user: { id: userAId } });

      // Create Areas
      areaWork = await prisma.area.create({
        data: { name: 'Work', userId: userAId, order: 1 },
      });
      areaPersonal = await prisma.area.create({
        data: { name: 'Personal', userId: userAId, order: 2 },
      });
      const areaCustom = await prisma.area.create({
        data: { name: 'Fitness & Health', userId: userAId, order: 3 },
      });

      // Create Project and SubProject under Work
      proj1 = await prisma.project.create({
        data: { name: 'Q4 Core Platform', areaId: areaWork.id, userId: userAId, status: ProjectStatus.ACTIVE },
      });
      sub1 = await prisma.subProject.create({
        data: { name: 'API Modernization', projectId: proj1.id, userId: userAId },
      });

      // Task 1: Direct area task, completed
      await prisma.task.create({
        data: { title: 'Direct Work Task', areaId: areaWork.id, userId: userAId, status: TaskStatus.COMPLETED, completedAt: new Date() },
      });
      // Task 2: Project task, completed
      await prisma.task.create({
        data: { title: 'Project Work Task', projectId: proj1.id, userId: userAId, status: TaskStatus.COMPLETED, completedAt: new Date() },
      });
      // Task 3: Subproject task, TODO
      await prisma.task.create({
        data: { title: 'Subproject Work Task', subProjectId: sub1.id, userId: userAId, status: TaskStatus.TODO },
      });
      // Task 4: Subproject task, CANCELLED (must be excluded from progress!)
      await prisma.task.create({
        data: { title: 'Cancelled Work Task', subProjectId: sub1.id, userId: userAId, status: TaskStatus.CANCELLED },
      });

      // Fitness & Health has 1 completed, 1 todo
      await prisma.task.create({
        data: { title: 'Gym Workout', areaId: areaCustom.id, userId: userAId, status: TaskStatus.COMPLETED, completedAt: new Date() },
      });
      await prisma.task.create({
        data: { title: 'Cardio Run', areaId: areaCustom.id, userId: userAId, status: TaskStatus.TODO },
      });

      const req = new Request('http://localhost:3000/api/analytics?timeZone=UTC');
      const res = await analyticsRoute.GET(req);
      const data = await res.json();
      if (res.status !== 200) {
        console.error('DEBUG API ERROR in Suite 2:', res.status, data);
      }
      assert(res.status === 200, 'GET /api/analytics returns 200');

      // Work has 2 completed out of 3 non-cancelled tasks -> 67%
      assert(data.areaProgress['Work'] === 67, 'Work area progress accurately calculated as 67% (2/3 completed, cancelled excluded)');
      // Personal has 0 tasks -> 0%
      assert(data.areaProgress['Personal'] === 0, 'Personal area with 0 tasks returns 0%');
      // Default areas not created return 0%
      assert(data.areaProgress['Education'] === 0, 'Default Education area returns 0%');
      assert(data.areaProgress['Side Projects'] === 0, 'Default Side Projects area returns 0%');
      // Custom area: 1/2 -> 50%
      assert(data.areaProgress['Fitness & Health'] === 50, 'Custom user area progress accurately calculated as 50%');
    }

    // ====================================================
    // SUITE 3: Momentum & Trend Detection
    // ====================================================
    console.log('\n--- Suite 3: Momentum & Trend Detection ---');
    {
      __setTestSession({ user: { id: userAId } });

      // Test with timeRange=7days
      const req7 = new Request('http://localhost:3000/api/analytics?timeRange=7days&timeZone=UTC');
      const res7 = await analyticsRoute.GET(req7);
      const data7 = await res7.json();
      assert(data7.momentumData.length === 7, '7days returns exactly 7 momentum data points');
      assert(data7.momentumData[6].count >= 3, 'Today momentum point includes today completed tasks');

      // Test with timeRange=14days
      const req14 = new Request('http://localhost:3000/api/analytics?timeRange=14days&timeZone=UTC');
      const res14 = await analyticsRoute.GET(req14);
      const data14 = await res14.json();
      assert(data14.momentumData.length === 14, '14days returns exactly 14 momentum data points');

      // Test with timeRange=month (30 days)
      const reqMonth = new Request('http://localhost:3000/api/analytics?timeRange=month&timeZone=UTC');
      const resMonth = await analyticsRoute.GET(reqMonth);
      const dataMonth = await resMonth.json();
      assert(dataMonth.momentumData.length === 30, 'month returns exactly 30 momentum data points');

      // Test with timeRange=3months (90 days)
      const req3M = new Request('http://localhost:3000/api/analytics?timeRange=3months&timeZone=UTC');
      const res3M = await analyticsRoute.GET(req3M);
      const data3M = await res3M.json();
      assert(data3M.momentumData.length === 90, '3months returns exactly 90 momentum data points');

      // Check Trend Status structure
      assert(typeof data7.trendStatus.text === 'string', 'trendStatus.text is a string');
      assert(typeof data7.trendStatus.color === 'string', 'trendStatus.color is a valid styling class string');
      assert(
        ['Improving', 'Slipping', 'Recovering', 'Stable'].includes(data7.trendStatus.text),
        `trendStatus is classified into one of the 4 canonical categories (got: ${data7.trendStatus.text})`
      );
    }

    // ====================================================
    // SUITE 4: Habit Heatmap & Weekly Completion Rate
    // ====================================================
    console.log('\n--- Suite 4: Habit Heatmap & Weekly Rate ---');
    {
      __setTestSession({ user: { id: userAId } });

      const d0 = new Date().toISOString().split('T')[0];
      const d1 = new Date(Date.now() - 24 * 3600000).toISOString().split('T')[0];
      const d2 = new Date(Date.now() - 48 * 3600000).toISOString().split('T')[0];

      const habitDaily = await prisma.habit.create({
        data: { name: 'Morning Meditation', frequency: HabitFrequency.DAILY, userId: userAId, areaId: areaPersonal.id },
      });
      const habitWeekly = await prisma.habit.create({
        data: { name: 'Deep Work Session', frequency: HabitFrequency.WEEKLY, targetDaysPerWeek: 3, userId: userAId },
      });

      // Create HabitLogs
      await prisma.habitLog.createMany({
        data: [
          { habitId: habitDaily.id, date: d0, userId: userAId },
          { habitId: habitDaily.id, date: d1, userId: userAId },
          { habitId: habitDaily.id, date: d2, userId: userAId },
          { habitId: habitWeekly.id, date: d0, userId: userAId },
          { habitId: habitWeekly.id, date: d1, userId: userAId },
        ],
      });

      const res = await analyticsRoute.GET(new Request('http://localhost:3000/api/analytics?timeZone=UTC'));
      const data = await res.json();

      assert(data.habitHeatmap[d0] === 2, `Heatmap aggregates 2 habit logs on date ${d0}`);
      assert(data.habitHeatmap[d1] === 2, `Heatmap aggregates 2 habit logs on date ${d1}`);
      assert(data.habitHeatmap[d2] === 1, `Heatmap aggregates 1 habit log on date ${d2}`);

      // Habit completion rate this week:
      // habitDaily: expected 7, completed 3 -> 3
      // habitWeekly: expected 3, completed 2 -> 2
      // Total expected = 10, total completed = 5 -> 50%
      assert(data.thisWeekMetrics.habitCompletionRate === 50, `Habit completion rate this week is 50% (5/10)`);
    }

    // ====================================================
    // SUITE 5: Active Projects & Unassigned Counts
    // ====================================================
    console.log('\n--- Suite 5: Active Projects & Unassigned Counts ---');
    {
      __setTestSession({ user: { id: userAId } });

      // Add unassigned items
      await prisma.capture.create({
        data: { content: 'Unassigned inbox idea 1', status: CaptureStatus.INBOX, userId: userAId },
      });
      await prisma.capture.create({
        data: { content: 'Unassigned inbox idea 2', status: CaptureStatus.INBOX, userId: userAId },
      });
      await prisma.task.create({
        data: { title: 'Unassigned standalone task', status: TaskStatus.TODO, userId: userAId },
      });
      await prisma.note.create({
        data: { title: 'Unassigned note', content: 'Note content', userId: userAId },
      });

      const res = await analyticsRoute.GET(new Request('http://localhost:3000/api/analytics?timeZone=UTC'));
      const data = await res.json();

      // Unassigned count: 2 captures + 1 standalone task + 1 standalone note = 4
      assert(data.unassignedCount >= 4, `Unassigned items count includes captures, standalone tasks, and notes (got: ${data.unassignedCount})`);

      // Active projects
      const activeProj = data.activeProjects.find((p) => p.name === 'Q4 Core Platform');
      assert(activeProj !== undefined, 'Active project Q4 Core Platform is listed');
      // Q4 Core Platform has 1 completed out of 2 non-cancelled tasks (Task 2 completed, Task 3 todo; Task 1 is direct Area, Task 4 is cancelled) -> 50%
      assert(activeProj.pct === 50, 'Project completion percentage is 50% (1 completed out of 2 non-cancelled)');
      assert(activeProj.total === 2, 'Project total tasks is 2 (excluding cancelled and direct Area tasks)');
      assert(data.thisWeekMetrics.activeProjectsCount >= 1, 'Active projects count in thisWeekMetrics is at least 1');
    }

    // ====================================================
    // SUITE 6: Cross-User Security for Analytics
    // ====================================================
    console.log('\n--- Suite 6: Cross-User Security for Analytics ---');
    {
      __setTestSession({ user: { id: userBId } });

      const res = await analyticsRoute.GET(new Request('http://localhost:3000/api/analytics?timeZone=UTC'));
      const data = await res.json();

      assert(data.thisWeekMetrics.completedThisWeek === 0, 'User B has 0 completed tasks (zero leak from User A)');
      assert(data.activeProjects.length === 0, 'User B has 0 active projects');
      assert(data.unassignedCount === 0, 'User B has 0 unassigned items');
      assert(Object.keys(data.habitHeatmap).length === 0, 'User B has empty habit heatmap');
    }

    // ====================================================
    // SUITE 7: Settings Reset Endpoint Security
    // ====================================================
    console.log('\n--- Suite 7: Settings Reset Security ---');
    {
      __setTestSession(null);
      const req = new Request('http://localhost:3000/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      const res = await resetRoute.POST(req);
      assert(res.status === 401, 'Unauthenticated reset request rejected with 401');
    }

    // ====================================================
    // SUITE 8: Settings Reset (action: "clear")
    // ====================================================
    console.log('\n--- Suite 8: Settings Reset (action: "clear") ---');
    {
      __setTestSession({ user: { id: userAId } });

      const req = new Request('http://localhost:3000/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      const res = await resetRoute.POST(req);
      assert(res.status === 200, 'POST /api/settings/reset with action: "clear" returns 200');
      const body = await res.json();
      assert(body.success === true, 'Response indicates success: true');

      // Verify User A data is wiped
      const [tasksCount, notesCount, habitsCount, habitLogsCount, areasCount, projectsCount, capturesCount] =
        await Promise.all([
          prisma.task.count({ where: { userId: userAId } }),
          prisma.note.count({ where: { userId: userAId } }),
          prisma.habit.count({ where: { userId: userAId } }),
          prisma.habitLog.count({ where: { userId: userAId } }),
          prisma.area.count({ where: { userId: userAId } }),
          prisma.project.count({ where: { userId: userAId } }),
          prisma.capture.count({ where: { userId: userAId } }),
        ]);

      assert(tasksCount === 0, 'User A tasks count is 0 after clear');
      assert(notesCount === 0, 'User A notes count is 0 after clear');
      assert(habitsCount === 0, 'User A habits count is 0 after clear');
      assert(habitLogsCount === 0, 'User A habitLogs count is 0 after clear');
      assert(areasCount === 0, 'User A areas count is 0 after clear');
      assert(projectsCount === 0, 'User A projects count is 0 after clear');
      assert(capturesCount === 0, 'User A captures count is 0 after clear');

      // Verify User, Account, Settings are strictly preserved
      const user = await prisma.user.findUnique({ where: { id: userAId } });
      const settings = await prisma.settings.findUnique({ where: { userId: userAId } });
      assert(user !== null, 'User record is strictly preserved');
      assert(settings !== null, 'User Settings record is strictly preserved');
    }

    // ====================================================
    // SUITE 9: Settings Reset (action: "seed")
    // ====================================================
    console.log('\n--- Suite 9: Settings Reset (action: "seed") ---');
    {
      __setTestSession({ user: { id: userAId } });

      const req = new Request('http://localhost:3000/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      const res = await resetRoute.POST(req);
      assert(res.status === 200, 'POST /api/settings/reset with action: "seed" returns 200');
      const body = await res.json();
      assert(body.success === true, 'Response indicates success: true');

      // Verify seeded areas
      const seededAreas = await prisma.area.findMany({
        where: { userId: userAId },
        include: { projects: { include: { subProjects: true } } },
        orderBy: { order: 'asc' },
      });
      assert(seededAreas.length === 4, 'Seeded exactly 4 areas (Work, Personal, Education, Side Projects)');
      const areaNames = seededAreas.map((a) => a.name);
      assert(areaNames.includes('Work'), 'Area "Work" seeded');
      assert(areaNames.includes('Personal'), 'Area "Personal" seeded');
      assert(areaNames.includes('Education'), 'Area "Education" seeded');
      assert(areaNames.includes('Side Projects'), 'Area "Side Projects" seeded');

      // Verify seeded projects & subprojects
      const workArea = seededAreas.find((a) => a.name === 'Work');
      assert(workArea.projects.length === 2, 'Work area has 2 projects (Product Launch, Home Office)');
      const prodLaunchProj = workArea.projects.find((p) => p.name === 'Product Launch');
      assert(prodLaunchProj.subProjects.length === 4, 'Product Launch has 4 subprojects (Backend, Frontend, Database, QA Testing)');

      // Verify seeded tags
      const tags = await prisma.tag.findMany({ where: { userId: userAId } });
      assert(tags.length === 4, 'Seeded exactly 4 global tags');

      // Verify seeded first-class tasks
      const seededTasks = await prisma.task.findMany({ where: { userId: userAId } });
      assert(seededTasks.length === 5, 'Seeded exactly 5 first-class tasks');
      const inProgTask = seededTasks.find((t) => t.status === TaskStatus.IN_PROGRESS);
      assert(inProgTask !== undefined, 'Seeded task in status IN_PROGRESS');
      assert(inProgTask.subProjectId !== null, 'In-progress task assigned to SubProject');
      assert(inProgTask.areaId === null, 'In-progress task has areaId null (derived inheritance)');
      assert(inProgTask.projectId === null, 'In-progress task has projectId null (derived inheritance)');

      // Verify seeded first-class notes
      const seededNotes = await prisma.note.findMany({ where: { userId: userAId } });
      assert(seededNotes.length === 3, 'Seeded exactly 3 first-class notes');
      const pinnedNote = seededNotes.find((n) => n.pinned);
      assert(pinnedNote !== undefined, 'Seeded a pinned note under project');

      // Verify seeded captures
      const seededCaptures = await prisma.capture.findMany({ where: { userId: userAId } });
      assert(seededCaptures.length === 2, 'Seeded exactly 2 inbox captures');
      assert(seededCaptures.every((c) => c.status === CaptureStatus.INBOX), 'All captures in status INBOX');

      // Verify seeded habits & habitLogs
      const seededHabits = await prisma.habit.findMany({
        where: { userId: userAId },
        include: { logs: true },
      });
      assert(seededHabits.length === 4, 'Seeded exactly 4 habits (3 daily, 1 weekly)');
      const weeklyHabit = seededHabits.find((h) => h.frequency === HabitFrequency.WEEKLY);
      assert(weeklyHabit !== undefined, 'Seeded weekly habit');
      assert(weeklyHabit.targetDaysPerWeek === 4, 'Weekly habit has targetDaysPerWeek = 4');

      const seededLogs = await prisma.habitLog.findMany({ where: { userId: userAId } });
      assert(seededLogs.length === 10, 'Seeded exactly 10 HabitLog rows across habits for dynamic streaks');
    }

    // ====================================================
    // SUITE 10: Analytics Endpoint Post-Seeding Verification
    // ====================================================
    console.log('\n--- Suite 10: Analytics Post-Seeding Validation ---');
    {
      __setTestSession({ user: { id: userAId } });

      const res = await analyticsRoute.GET(new Request('http://localhost:3000/api/analytics?timeZone=UTC'));
      assert(res.status === 200, 'GET /api/analytics on seeded data returns 200');
      const data = await res.json();

      assert(typeof data.areaProgress === 'object', 'areaProgress is an object');
      assert('Work' in data.areaProgress, 'Work in areaProgress');
      assert(Array.isArray(data.momentumData), 'momentumData is an array');
      assert(data.momentumData.length === 7, 'Default 7days momentum has length 7');
      assert(data.unassignedCount >= 4, 'Unassigned count includes 2 captures + 1 task + 1 note');
      assert(data.thisWeekMetrics.activeProjectsCount === 5, '5 active projects reported');
      assert(data.activeProjects.length === 5, '5 active projects in activeProjects list');
      assert(data.thisWeekMetrics.habitCompletionRate > 0, 'Habit completion rate is positive');
    }

  } catch (err) {
    console.error('Test execution exception:', err);
    failedAssertions++;
  } finally {
    // Cleanup test data
    console.log('\n--- Cleaning up test records ---');
    try {
      for (const uid of [userAId, userBId]) {
        await prisma.habitLog.deleteMany({ where: { userId: uid } });
        await prisma.task.deleteMany({ where: { userId: uid } });
        await prisma.note.deleteMany({ where: { userId: uid } });
        await prisma.capture.deleteMany({ where: { userId: uid } });
        await prisma.habit.deleteMany({ where: { userId: uid } });
        await prisma.subProject.deleteMany({ where: { userId: uid } });
        await prisma.project.deleteMany({ where: { userId: uid } });
        await prisma.area.deleteMany({ where: { userId: uid } });
        await prisma.tag.deleteMany({ where: { userId: uid } });
        await prisma.settings.deleteMany({ where: { userId: uid } });
        await prisma.user.deleteMany({ where: { id: uid } });
      }
      console.log('Test records successfully cleaned up.');
    } catch (cleanErr) {
      console.error('Error during test cleanup:', cleanErr);
    }
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`Milestone 2.6 Test Results:`);
  console.log(`Total Assertions:  ${totalAssertions}`);
  console.log(`Passed Assertions: ${passedAssertions}`);
  console.log(`Failed Assertions: ${failedAssertions}`);
  console.log('====================================================\n');

  if (failedAssertions > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
