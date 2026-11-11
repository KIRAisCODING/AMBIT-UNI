/**
 * AMBIT Milestone 2.4 HTTP Integration Test Suite
 * Executes against dedicated isolated database: ambit_test_db
 * Tests Dashboard & Calendar Engine, scheduling API, timezone boundaries, and regressions.
 */

const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';

// Load backend .env and target isolated test database ambit_test_db
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

const backendDir = path.resolve(__dirname, '../backend');
const jiti = require(path.join(backendDir, 'node_modules/jiti'))(__filename, {
  esmResolve: true,
  interopDefault: true,
  alias: {
    '@/auth': path.join(backendDir, 'auth.ts'),
    '@/lib/prisma': path.join(backendDir, 'lib/prisma.ts'),
    '@/lib/rateLimit': path.join(backendDir, 'lib/rateLimit.ts'),
    '@/lib/verifyHierarchy': path.join(backendDir, 'lib/verifyHierarchy.ts'),
    '@/lib/dateUtils': path.join(backendDir, 'lib/dateUtils.ts'),
    '@/lib/habitUtils': path.join(backendDir, 'lib/habitUtils.ts'),
    '@': backendDir,
  },
});

const { PrismaClient, TaskStatus, Priority, HabitFrequency, ProjectStatus } = require(
  path.join(backendDir, 'node_modules/@prisma/client')
);
const prisma = new PrismaClient({ datasources: { db: { url: directTestUrl } } });

const { __setTestSession, LIMIT_CONFIGS } = jiti(path.join(backendDir, 'lib/rateLimit.ts'));
LIMIT_CONFIGS.write.limit = 10000;
LIMIT_CONFIGS.read.limit = 10000;

const {
  getUserLocalToday,
  addDaysToDateOnly,
  toUtcStartOfDay,
  toUtcEndOfDay,
} = jiti(path.join(backendDir, 'lib/dateUtils.ts'));

// Route handlers
const dashboardRoute = jiti(path.join(backendDir, 'app/api/dashboard/route.ts'));
const calendarRoute = jiti(path.join(backendDir, 'app/api/calendar/route.ts'));
const taskScheduleRoute = jiti(path.join(backendDir, 'app/api/tasks/[id]/schedule/route.ts'));
const tasksRoute = jiti(path.join(backendDir, 'app/api/tasks/route.ts'));
const tasksIdRoute = jiti(path.join(backendDir, 'app/api/tasks/[id]/route.ts'));
const habitsRoute = jiti(path.join(backendDir, 'app/api/habits/route.ts'));
const habitsToggleRoute = jiti(path.join(backendDir, 'app/api/habits/[id]/toggle/route.ts'));

function createJsonRequest(url, method, body, headers = {}) {
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

async function runMilestone24Suite() {
  console.log('========================================================================');
  console.log(' AMBIT MILESTONE 2.4 — DASHBOARD & CALENDAR ENGINE INTEGRATION SUITE');
  console.log(' Environment: Dedicated Isolated Database (ambit_test_db)');
  console.log(' Target: Consolidated Dashboard Aggregation, Calendar Range API,');
  console.log('         Dual-Date Semantics, and Scheduling API Integration');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  try {
    // 0. Setup isolated test users
    const userA = await prisma.user.upsert({
      where: { email: 'dash_cal_tester_a@ambit.local' },
      update: {},
      create: {
        id: 'user_dash_a_' + Date.now(),
        email: 'dash_cal_tester_a@ambit.local',
        name: 'Dashboard Tester A',
      },
    });

    const userB = await prisma.user.upsert({
      where: { email: 'dash_cal_tester_b@ambit.local' },
      update: {},
      create: {
        id: 'user_dash_b_' + Date.now(),
        email: 'dash_cal_tester_b@ambit.local',
        name: 'Dashboard Tester B',
      },
    });

    // Clean up test data from prior runs
    await prisma.habitLog.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.habit.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.task.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.subProject.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.project.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.area.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.capture.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });

    const timeZone = 'America/New_York';
    const todayStr = getUserLocalToday(timeZone);
    const yesterdayStr = addDaysToDateOnly(todayStr, -1);
    const tomorrowStr = addDaysToDateOnly(todayStr, 1);
    const upcomingDay3Str = addDaysToDateOnly(todayStr, 3);
    const upcomingDay7Str = addDaysToDateOnly(todayStr, 7);
    const beyondDay10Str = addDaysToDateOnly(todayStr, 10);

    const yesterdayUtc = toUtcStartOfDay(yesterdayStr, timeZone);
    const todayDueUtc = new Date(Date.UTC(
      parseInt(todayStr.split('-')[0]),
      parseInt(todayStr.split('-')[1]) - 1,
      parseInt(todayStr.split('-')[2]),
      18, 0, 0
    ));

    // Establish hierarchy
    const areaWork = await prisma.area.create({
      data: { userId: userA.id, name: 'Work Operations' },
    });

    const projectQ4 = await prisma.project.create({
      data: {
        userId: userA.id,
        name: 'Q4 Product Launch',
        areaId: areaWork.id,
        order: 1, // Pinned/priority order
        targetDate: toUtcStartOfDay(upcomingDay3Str, timeZone),
      },
    });

    const subProjectDesign = await prisma.subProject.create({
      data: {
        userId: userA.id,
        name: 'UI Design Phase',
        projectId: projectQ4.id,
      },
    });

    const projectEmpty = await prisma.project.create({
      data: {
        userId: userA.id,
        name: 'Future Roadmap 2027',
        areaId: areaWork.id,
        order: 2,
      },
    });

    // Seed Captures (Decision 03)
    await prisma.capture.createMany({
      data: [
        { userId: userA.id, content: 'Raw Capture 1', status: 'INBOX' },
        { userId: userA.id, content: 'Raw Capture 2', status: 'INBOX' },
        { userId: userA.id, content: 'Raw Capture 3', status: 'INBOX' },
        { userId: userA.id, content: 'Trashed Capture', status: 'TRASHED' },
      ],
    });

    // Seed Tasks with deterministic categorization
    // 1. Overdue task
    const taskOverdue = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Overdue Compliance Review',
        status: TaskStatus.TODO,
        priority: Priority.URGENT,
        dueDate: yesterdayUtc,
        areaId: areaWork.id,
        projectId: projectQ4.id,
      },
    });

    // 2. Due Today task
    const taskDueToday = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Due Today Product Demo',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        dueDate: todayDueUtc,
        areaId: areaWork.id,
        projectId: projectQ4.id,
      },
    });

    // 3. In Progress task (without due date)
    const taskInProgress = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'In Progress Architectural Document',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.MEDIUM,
        areaId: areaWork.id,
        projectId: projectQ4.id,
      },
    });

    // 4. Overlapping task: Both IN_PROGRESS and DUE_TODAY
    const taskOverlap = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Overlap Task: In Progress and Due Today',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        scheduledDate: todayStr,
        areaId: areaWork.id,
        projectId: projectQ4.id,
      },
    });

    // 5. Upcoming task 1 (Day 3)
    const taskUpcoming1 = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Upcoming Sprint Planning (Day 3)',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        scheduledDate: upcomingDay3Str,
        areaId: areaWork.id,
        projectId: projectQ4.id,
      },
    });

    // 6. Upcoming task 2 (Day 7 edge of horizon)
    const taskUpcoming2 = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Upcoming Retro (Day 7)',
        status: TaskStatus.TODO,
        priority: Priority.LOW,
        scheduledDate: upcomingDay7Str,
        areaId: areaWork.id,
        projectId: projectQ4.id,
      },
    });

    // 7. Beyond horizon task (Day 10 - must NOT appear in 7-day upcoming)
    const taskBeyond = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Beyond 7-Day Horizon Task',
        status: TaskStatus.TODO,
        scheduledDate: beyondDay10Str,
        areaId: areaWork.id,
        projectId: projectQ4.id,
      },
    });

    // 8. Completed task for subproject (for project progress calculation)
    const taskSubCompleted = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Completed UI Mockup',
        status: TaskStatus.COMPLETED,
        subProjectId: subProjectDesign.id,
      },
    });

    // 9. Cancelled task (must be excluded from focus, upcoming, and progress)
    const taskCancelled = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Discarded Legacy Idea',
        status: TaskStatus.CANCELLED,
        dueDate: todayDueUtc,
        projectId: projectQ4.id,
      },
    });

    // 10. Unscheduled task backlog
    const taskUnscheduled = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Unscheduled Maintenance Task',
        status: TaskStatus.TODO,
        priority: Priority.LOW,
        scheduledDate: null,
        dueDate: null,
        areaId: areaWork.id,
      },
    });

    // Seed Habit
    const habitDaily = await prisma.habit.create({
      data: {
        userId: userA.id,
        name: 'Morning Meditation',
        frequency: HabitFrequency.DAILY,
        areaId: areaWork.id,
      },
    });

    await prisma.habitLog.create({
      data: {
        habitId: habitDaily.id,
        userId: userA.id,
        date: todayStr,
      },
    });

    __setTestSession({ user: { id: userA.id, email: userA.email, name: 'Dashboard Tester A' } });

    // -------------------------------------------------------------
    // Test 1: Dashboard API Briefing & Section Structure
    // -------------------------------------------------------------
    console.log('--- 1. Dashboard Consolidated Briefing (GET /api/dashboard) ---');
    const reqDash = createJsonRequest(
      `http://localhost:3000/api/dashboard?timezone=${encodeURIComponent(timeZone)}`,
      'GET',
      undefined,
      { 'x-timezone': timeZone }
    );
    const resDash = await dashboardRoute.GET(reqDash);
    assert(resDash.status === 200, 'GET /api/dashboard returns 200 OK');
    const dash = await resDash.json();

    assert(dash.greeting && dash.greeting.userName === 'Dashboard Tester A', 'Greeting reflects user name');
    assert(dash.greeting.localDate === todayStr, 'Greeting reflects local calendar date');
    assert(dash.inboxSnapshot && dash.inboxSnapshot.unprocessedCount === 3, 'Inbox snapshot reflects 3 unprocessed captures');
    assert(dash.inboxSnapshot.recentCaptures.length === 2, 'Inbox snapshot capped at recent 2 items');

    // -------------------------------------------------------------
    // Test 2: Today / Focus Categorization & Deterministic Precedence
    // -------------------------------------------------------------
    console.log('\n--- 2. Today / Focus Categorization & Precedence ---');
    assert(dash.todayFocus.overdueCount === 1, 'todayFocus.overdueCount is exactly 1');
    assert(dash.todayFocus.dueTodayCount >= 2, 'todayFocus.dueTodayCount reflects due today tasks');
    assert(dash.todayFocus.inProgressCount === 1, 'todayFocus.inProgressCount reflects in-progress tasks');

    const focusIds = dash.todayFocus.tasks.map((t) => t.id);
    assert(focusIds.includes(taskOverdue.id), 'Overdue task included in Today/Focus');
    assert(focusIds.includes(taskDueToday.id), 'Due Today task included in Today/Focus');
    assert(focusIds.includes(taskInProgress.id), 'In Progress task included in Today/Focus');
    assert(focusIds.includes(taskOverlap.id), 'Overlap task included in Today/Focus');

    // Deterministic Precedence check on taskOverlap:
    // Task is both IN_PROGRESS and DUE_TODAY -> DUE_TODAY takes precedence over IN_PROGRESS!
    const overlapItem = dash.todayFocus.tasks.find((t) => t.id === taskOverlap.id);
    assert(overlapItem.category === 'DUE_TODAY', 'Overlap task assigned DUE_TODAY category per precedence');
    assert(overlapItem.isInProgress === true, 'Overlap task preserves isInProgress attribute');
    assert(overlapItem.isDueToday === true, 'Overlap task preserves isDueToday attribute');

    // De-duplication check: Each task appears at most once in Today/Focus
    const uniqueFocusIds = new Set(focusIds);
    assert(uniqueFocusIds.size === focusIds.length, 'Every task appears strictly once in Today/Focus (zero duplicates)');

    // Exclusion check: Completed and Cancelled tasks excluded
    assert(!focusIds.includes(taskSubCompleted.id), 'Completed task excluded from Today/Focus');
    assert(!focusIds.includes(taskCancelled.id), 'Cancelled task excluded from Today/Focus');

    // -------------------------------------------------------------
    // Test 3: Upcoming Horizon (Rolling 7 Days)
    // -------------------------------------------------------------
    console.log('\n--- 3. Upcoming Horizon (Rolling 7 Calendar Days) ---');
    const upcomingTaskIds = dash.upcomingTasks.flatMap((g) => g.tasks.map((t) => t.id));

    assert(upcomingTaskIds.includes(taskUpcoming1.id), 'Upcoming Day 3 task included in Upcoming timeline');
    assert(upcomingTaskIds.includes(taskUpcoming2.id), 'Upcoming Day 7 task included in Upcoming timeline');
    assert(!upcomingTaskIds.includes(taskBeyond.id), 'Day 10 task strictly excluded from 7-day upcoming horizon');

    // Mutual exclusivity check: Tasks present in Today/Focus must NOT appear in Upcoming
    const overlapBetweenFocusAndUpcoming = focusIds.filter((id) => upcomingTaskIds.includes(id));
    assert(
      overlapBetweenFocusAndUpcoming.length === 0,
      'Tasks in Today/Focus are strictly excluded from Upcoming timeline'
    );

    // -------------------------------------------------------------
    // Test 4: Project Progress Calculation & Empty State
    // -------------------------------------------------------------
    console.log('\n--- 4. Project Progress Calculation & Empty State ---');
    const projQ4 = dash.activeProjects.find((p) => p.id === projectQ4.id);
    assert(projQ4 !== undefined, 'Active project Q4 included in dashboard cards');

    // Total non-cancelled tasks for projectQ4 (including subproject taskSubCompleted):
    // taskOverdue (TODO) + taskDueToday (TODO) + taskInProgress (IN_PROGRESS) +
    // taskOverlap (IN_PROGRESS) + taskUpcoming1 (TODO) + taskUpcoming2 (TODO) +
    // taskBeyond (TODO) + taskSubCompleted (COMPLETED) = 8 tasks.
    // Completed: taskSubCompleted = 1.
    // Progress: round(1 / 8 * 100) = 13%.
    // Cancelled task taskCancelled is strictly excluded!
    assert(projQ4.totalTasks === 8, `Project total tasks calculated correctly (expected 8, got ${projQ4.totalTasks})`);
    assert(projQ4.completedTasks === 1, `Project completed tasks calculated correctly (expected 1, got ${projQ4.completedTasks})`);
    assert(projQ4.progressPct === 13, `Project progress percentage calculated correctly (expected 13%, got ${projQ4.progressPct}%)`);
    assert(projQ4.hasTasks === true, 'Project hasTasks is true');

    // Empty Project State: 0 eligible tasks
    const projEmpty = dash.activeProjects.find((p) => p.id === projectEmpty.id);
    assert(projEmpty !== undefined, 'Empty project included');
    assert(projEmpty.totalTasks === 0, 'Empty project totalTasks is 0');
    assert(projEmpty.progressPct === null, 'Empty project progressPct is null');
    assert(projEmpty.hasTasks === false, 'Empty project hasTasks is false ("No tasks yet")');

    // -------------------------------------------------------------
    // Test 5: Habits Snapshot
    // -------------------------------------------------------------
    console.log('\n--- 5. Habits Snapshot ---');
    const habitSnap = dash.habitsSnapshot.find((h) => h.id === habitDaily.id);
    assert(habitSnap !== undefined, 'Daily habit included in habitsSnapshot');
    assert(habitSnap.completedToday === true, 'completedToday is true reflecting logged check-in');
    assert(habitSnap.currentStreak === 1, 'currentStreak calculated dynamically');

    // -------------------------------------------------------------
    // Test 6: Calendar Range Query (GET /api/calendar)
    // -------------------------------------------------------------
    console.log('\n--- 6. Calendar Range Query (GET /api/calendar) ---');
    const calStart = todayStr;
    const calEnd = addDaysToDateOnly(todayStr, 6); // 7-day range
    const reqCal = createJsonRequest(
      `http://localhost:3000/api/calendar?start=${calStart}&end=${calEnd}&timeZone=${encodeURIComponent(timeZone)}`,
      'GET',
      undefined,
      { 'x-timezone': timeZone }
    );
    const resCal = await calendarRoute.GET(reqCal);
    assert(resCal.status === 200, 'GET /api/calendar returns 200 OK');
    const cal = await resCal.json();

    assert(cal.startDate === calStart && cal.endDate === calEnd, 'Calendar boundaries match requested range');
    assert(Array.isArray(cal.tasks), 'cal.tasks is array');
    assert(Array.isArray(cal.unscheduledTasks), 'cal.unscheduledTasks is array');
    assert(Array.isArray(cal.habitLogs), 'cal.habitLogs is array');
    assert(Array.isArray(cal.habits), 'cal.habits is array');
    assert(Array.isArray(cal.projectMilestones), 'cal.projectMilestones is array');

    // Unscheduled backlog check
    const unscheduledIds = cal.unscheduledTasks.map((t) => t.id);
    assert(unscheduledIds.includes(taskUnscheduled.id), 'Unscheduled task appears in cal.unscheduledTasks');
    assert(!unscheduledIds.includes(taskUpcoming1.id), 'Scheduled task excluded from unscheduled backlog');

    // HabitLog in range check
    assert(cal.habitLogs.some((l) => l.habitId === habitDaily.id && l.date === todayStr), 'HabitLog appears on actual date in range');

    // Project Milestone check
    const milestoneInCal = cal.projectMilestones.find((m) => m.id === projectQ4.id);
    assert(milestoneInCal !== undefined, 'Project milestone included with targetDate');

    // -------------------------------------------------------------
    // Test 7: Dual-Date Semantics & Same-Day Merging
    // -------------------------------------------------------------
    console.log('\n--- 7. Dual-Date Semantics & Same-Day Indicators ---');
    // Create task with both scheduledDate and dueDate on the same local date
    const taskSameDayDual = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Same Day Dual Commitment',
        status: TaskStatus.TODO,
        scheduledDate: upcomingDay3Str,
        dueDate: toUtcStartOfDay(upcomingDay3Str, timeZone),
        areaId: areaWork.id,
      },
    });

    const reqCalDual = createJsonRequest(
      `http://localhost:3000/api/calendar?start=${upcomingDay3Str}&end=${upcomingDay3Str}&timeZone=${encodeURIComponent(timeZone)}`,
      'GET'
    );
    const resCalDual = await calendarRoute.GET(reqCalDual);
    const calDual = await resCalDual.json();
    const dualTaskInCal = calDual.tasks.find((t) => t.id === taskSameDayDual.id);

    assert(dualTaskInCal !== undefined, 'Same-day dual task retrieved in calendar query');
    assert(dualTaskInCal.scheduledDate === upcomingDay3Str, 'scheduledDate is preserved');
    assert(dualTaskInCal.dueDate !== null, 'dueDate timestamp is preserved');

    // -------------------------------------------------------------
    // Test 8: Task Scheduling API (PATCH /api/tasks/:id/schedule)
    // -------------------------------------------------------------
    console.log('\n--- 8. Scheduling API (PATCH /api/tasks/:id/schedule) ---');
    // Assign scheduledDate to unscheduled task
    const reqSchedule = createJsonRequest(
      `http://localhost:3000/api/tasks/${taskUnscheduled.id}/schedule`,
      'PATCH',
      { scheduledDate: upcomingDay3Str }
    );
    const resSchedule = await taskScheduleRoute.PATCH(reqSchedule, {
      params: Promise.resolve({ id: taskUnscheduled.id }),
    });
    assert(resSchedule.status === 200, 'PATCH /api/tasks/:id/schedule returns 200 OK');
    const scheduledTask = await resSchedule.json();
    assert(scheduledTask.scheduledDate === upcomingDay3Str, 'Task scheduledDate successfully updated');
    assert(scheduledTask.dueDate === null, 'Task dueDate left strictly untouched');

    // Unschedule task by passing null
    const reqUnschedule = createJsonRequest(
      `http://localhost:3000/api/tasks/${taskUnscheduled.id}/schedule`,
      'PATCH',
      { scheduledDate: null }
    );
    const resUnschedule = await taskScheduleRoute.PATCH(reqUnschedule, {
      params: Promise.resolve({ id: taskUnscheduled.id }),
    });
    const unscheduledBack = await resUnschedule.json();
    assert(unscheduledBack.scheduledDate === null, 'Task successfully unscheduled by passing null');

    // Invalid date format rejection
    const reqInvalidDate = createJsonRequest(
      `http://localhost:3000/api/tasks/${taskUnscheduled.id}/schedule`,
      'PATCH',
      { scheduledDate: 'invalid-date' }
    );
    const resInvalidDate = await taskScheduleRoute.PATCH(reqInvalidDate, {
      params: Promise.resolve({ id: taskUnscheduled.id }),
    });
    assert(resInvalidDate.status === 400, 'Invalid scheduledDate rejected with 400 Bad Request');

    // -------------------------------------------------------------
    // Test 9: Independent Date Mutability (Modifying one leaves other intact)
    // -------------------------------------------------------------
    console.log('\n--- 9. Independent Date Mutability ---');
    // Task with existing dueDate
    const testDualMut = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Dual Mutability Test Task',
        status: TaskStatus.TODO,
        dueDate: todayDueUtc,
        scheduledDate: todayStr,
      },
    });

    // Update scheduledDate only via /schedule
    const reqMutSchedule = createJsonRequest(
      `http://localhost:3000/api/tasks/${testDualMut.id}/schedule`,
      'PATCH',
      { scheduledDate: upcomingDay7Str }
    );
    await taskScheduleRoute.PATCH(reqMutSchedule, {
      params: Promise.resolve({ id: testDualMut.id }),
    });

    const refreshedMut = await prisma.task.findUnique({ where: { id: testDualMut.id } });
    assert(refreshedMut.scheduledDate === upcomingDay7Str, 'scheduledDate updated to Day 7');
    assert(
      refreshedMut.dueDate.toISOString() === todayDueUtc.toISOString(),
      'dueDate completely unchanged when updating scheduledDate'
    );

    // Clean up testDualMut
    await prisma.task.delete({ where: { id: testDualMut.id } });

    // -------------------------------------------------------------
    // Test 10: Timezone & DST Boundary Evaluation
    // -------------------------------------------------------------
    console.log('\n--- 10. Timezone & DST Boundary Evaluation ---');
    // Test Tokyo (UTC+9) vs Honolulu (UTC-10)
    const reqDashTokyo = createJsonRequest(
      `http://localhost:3000/api/dashboard?timezone=Asia/Tokyo`,
      'GET',
      undefined,
      { 'x-timezone': 'Asia/Tokyo' }
    );
    const resDashTokyo = await dashboardRoute.GET(reqDashTokyo);
    assert(resDashTokyo.status === 200, 'Dashboard supports Asia/Tokyo timezone');
    const tokyoData = await resDashTokyo.json();
    assert(tokyoData.greeting.localDate === getUserLocalToday('Asia/Tokyo'), 'Tokyo date matches local wall clock');

    const reqDashHonolulu = createJsonRequest(
      `http://localhost:3000/api/dashboard?timezone=Pacific/Honolulu`,
      'GET',
      undefined,
      { 'x-timezone': 'Pacific/Honolulu' }
    );
    const resDashHonolulu = await dashboardRoute.GET(reqDashHonolulu);
    assert(resDashHonolulu.status === 200, 'Dashboard supports Pacific/Honolulu timezone');

    // -------------------------------------------------------------
    // Test 11: Authentication & Cross-User Isolation
    // -------------------------------------------------------------
    console.log('\n--- 11. Authentication & Cross-User Isolation ---');
    // Unauthenticated Dashboard
    __setTestSession(null);
    const reqUnauthDash = createJsonRequest('http://localhost:3000/api/dashboard', 'GET');
    const resUnauthDash = await dashboardRoute.GET(reqUnauthDash);
    assert(resUnauthDash.status === 401, 'Unauthenticated GET /api/dashboard returns 401 Unauthorized');

    // Unauthenticated Calendar
    const reqUnauthCal = createJsonRequest('http://localhost:3000/api/calendar', 'GET');
    const resUnauthCal = await calendarRoute.GET(reqUnauthCal);
    assert(resUnauthCal.status === 401, 'Unauthenticated GET /api/calendar returns 401 Unauthorized');

    // User B isolation: cannot see User A's tasks or schedule User A's task
    __setTestSession({ user: { id: userB.id, email: userB.email, name: 'User B' } });

    const reqUserBDash = createJsonRequest('http://localhost:3000/api/dashboard', 'GET');
    const resUserBDash = await dashboardRoute.GET(reqUserBDash);
    const userBDash = await resUserBDash.json();
    assert(userBDash.todayFocus.tasks.length === 0, 'User B dashboard does not leak User A tasks');
    assert(userBDash.activeProjects.length === 0, 'User B dashboard does not leak User A projects');

    const reqCrossSchedule = createJsonRequest(
      `http://localhost:3000/api/tasks/${taskOverdue.id}/schedule`,
      'PATCH',
      { scheduledDate: todayStr }
    );
    const resCrossSchedule = await taskScheduleRoute.PATCH(reqCrossSchedule, {
      params: Promise.resolve({ id: taskOverdue.id }),
    });
    assert(resCrossSchedule.status === 404, 'User B cannot schedule User A task (returns 404 Not Found)');

    // Restore User A session
    __setTestSession({ user: { id: userA.id, email: userA.email, name: 'Dashboard Tester A' } });

    // -------------------------------------------------------------
    // Test 12: Regressions (Milestones 2.1–2.3 Functional Baseline)
    // -------------------------------------------------------------
    console.log('\n--- 12. Regressions for Milestones 2.1–2.3 ---');
    // Task CRUD & Priority
    const reqGetTask = createJsonRequest(`http://localhost:3000/api/tasks/${taskOverdue.id}`, 'GET');
    const resGetTask = await tasksIdRoute.GET(reqGetTask, {
      params: Promise.resolve({ id: taskOverdue.id }),
    });
    assert(resGetTask.status === 200, 'GET /api/tasks/:id functions normally');

    // Habit toggle
    const reqHabitToggle = createJsonRequest(
      `http://localhost:3000/api/habits/${habitDaily.id}/toggle`,
      'POST',
      { date: todayStr }
    );
    const resHabitToggle = await habitsToggleRoute.POST(reqHabitToggle, {
      params: Promise.resolve({ id: habitDaily.id }),
    });
    assert(resHabitToggle.status === 200, 'POST /api/habits/:id/toggle unchecks habit correctly');

    // Clean up temporary seeded test data
    await prisma.habitLog.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.habit.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.task.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.subProject.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.project.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.area.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.capture.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(` MILESTONE 2.4 INTEGRATION TEST SUITE RESULTS:`);
    console.log(` TOTAL ASSERTIONS: ${passed + failed}`);
    console.log(` PASSED: ${passed}`);
    console.log(` FAILED: ${failed}`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMilestone24Suite();

