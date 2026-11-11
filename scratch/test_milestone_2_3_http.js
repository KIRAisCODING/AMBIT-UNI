/**
 * AMBIT Milestone 2.3 HTTP Integration Test Suite
 * Executes against dedicated isolated database: ambit_test_db
 * Tests Habit Log & Dynamic Timezone Streak Engine with actual Next.js Request/Response objects.
 */

const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';

// Load backend .env and direct connection to ambit_test_db
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

const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
const prisma = new PrismaClient({ datasources: { db: { url: directTestUrl } } });

const { __setTestSession, LIMIT_CONFIGS } = jiti(path.join(backendDir, 'lib/rateLimit.ts'));
LIMIT_CONFIGS.write.limit = 10000;
LIMIT_CONFIGS.read.limit = 10000;

const {
  getIsoWeekBounds,
  calculateDailyStreak,
  calculateWeeklyStreak,
  mapHabitToResponse,
} = jiti(path.join(backendDir, 'lib/habitUtils.ts'));

const {
  getUserLocalToday,
  addDaysToDateOnly,
  isValidDateOnly,
} = jiti(path.join(backendDir, 'lib/dateUtils.ts'));

// Habit route handlers
const habitsRoute = jiti(path.join(backendDir, 'app/api/habits/route.ts'));
const habitsIdRoute = jiti(path.join(backendDir, 'app/api/habits/[id]/route.ts'));
const habitsToggleRoute = jiti(path.join(backendDir, 'app/api/habits/[id]/toggle/route.ts'));
const habitsCheckRoute = jiti(path.join(backendDir, 'app/api/habits/[id]/check/route.ts'));
const habitsUncheckRoute = jiti(path.join(backendDir, 'app/api/habits/[id]/uncheck/route.ts'));
const habitsArchiveRoute = jiti(path.join(backendDir, 'app/api/habits/[id]/archive/route.ts'));
const habitsRestoreRoute = jiti(path.join(backendDir, 'app/api/habits/[id]/restore/route.ts'));

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

async function runMilestone23Suite() {
  console.log('========================================================================');
  console.log(' AMBIT MILESTONE 2.3 — HABIT LOG & DYNAMIC TIMEZONE STREAK ENGINE');
  console.log(' Environment: Dedicated Isolated Database (ambit_test_db)');
  console.log(' Target: Habit Domain CRUD, Normalized Logs & Dynamic Streaks');
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
    // 0. Setup isolated test users and areas
    const userA = await prisma.user.upsert({
      where: { email: 'habit_tester_a@ambit.local' },
      update: {},
      create: {
        id: 'user_habit_a_' + Date.now(),
        email: 'habit_tester_a@ambit.local',
        name: 'Habit Tester A',
      },
    });

    const userB = await prisma.user.upsert({
      where: { email: 'habit_tester_b@ambit.local' },
      update: {},
      create: {
        id: 'user_habit_b_' + Date.now(),
        email: 'habit_tester_b@ambit.local',
        name: 'Habit Tester B',
      },
    });

    // Clean up any old habits from previous test runs
    await prisma.habitLog.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.habit.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.subProject.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.project.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.area.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });

    const areaA = await prisma.area.create({
      data: { userId: userA.id, name: 'Wellness & Health' },
    });

    const projectA = await prisma.project.create({
      data: { userId: userA.id, name: 'Fitness Marathon', areaId: areaA.id },
    });

    const subProjectA = await prisma.subProject.create({
      data: { userId: userA.id, name: '5K Prep', projectId: projectA.id },
    });

    __setTestSession({ user: { id: userA.id, email: userA.email } });

    // -------------------------------------------------------------
    // Test 1: Daily Habit Creation & Retrieval
    // -------------------------------------------------------------
    console.log('--- 1. Daily Habit Creation & Retrieval ---');
    const reqCreateDaily = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Morning Meditation',
      frequency: 'DAILY',
      notes: '15 minutes mindfulness',
    });
    const resCreateDaily = await habitsRoute.POST(reqCreateDaily);
    assert(resCreateDaily.status === 201, 'POST /api/habits returns 201 Created');
    const habitDaily = await resCreateDaily.json();
    assert(habitDaily.id && habitDaily.name === 'Morning Meditation', 'Habit name is correct');
    assert(habitDaily.frequency === 'DAILY', 'Frequency is DAILY');
    assert(habitDaily.targetDaysPerWeek === null, 'targetDaysPerWeek is null for daily');
    assert(habitDaily.currentStreak === 0, 'Initial currentStreak is 0');
    assert(habitDaily.completedToday === false, 'Initial completedToday is false');
    assert(habitDaily.notes === '15 minutes mindfulness', 'Notes backward-compatible alias populated');

    // Retrieval via GET /api/habits
    const reqListHabits = createJsonRequest('http://localhost:3000/api/habits', 'GET');
    const resListHabits = await habitsRoute.GET(reqListHabits);
    const habitList = await resListHabits.json();
    assert(Array.isArray(habitList) && habitList.some(h => h.id === habitDaily.id), 'GET /api/habits includes created daily habit');

    // Retrieval via GET /api/habits/:id
    const reqGetHabit = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}`, 'GET');
    const resGetHabit = await habitsIdRoute.GET(reqGetHabit, { params: Promise.resolve({ id: habitDaily.id }) });
    const habitGet = await resGetHabit.json();
    assert(habitGet.id === habitDaily.id && habitGet.name === 'Morning Meditation', 'GET /api/habits/:id returns the habit');

    // -------------------------------------------------------------
    // Test 2: Weekly Habit Creation & Target Validation (1..7)
    // -------------------------------------------------------------
    console.log('\n--- 2. Weekly Habit Creation & Target Validation (1..7) ---');
    const reqCreateWeekly = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Gym Strength Training',
      frequency: 'WEEKLY',
      targetDaysPerWeek: 4,
    });
    const resCreateWeekly = await habitsRoute.POST(reqCreateWeekly);
    assert(resCreateWeekly.status === 201, 'Weekly habit returns 201 Created');
    const habitWeekly = await resCreateWeekly.json();
    assert(habitWeekly.frequency === 'WEEKLY', 'Frequency is WEEKLY');
    assert(habitWeekly.targetDaysPerWeek === 4, 'targetDaysPerWeek is 4');
    assert(habitWeekly.weeklyProgress && habitWeekly.weeklyProgress.target === 4, 'weeklyProgress.target is 4');

    // Invalid targetDaysPerWeek: 0
    const reqInvalidZero = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Invalid 0',
      frequency: 'WEEKLY',
      targetDaysPerWeek: 0,
    });
    const resInvalidZero = await habitsRoute.POST(reqInvalidZero);
    assert(resInvalidZero.status === 400, 'targetDaysPerWeek = 0 rejected with 400');

    // Invalid targetDaysPerWeek: 8
    const reqInvalidEight = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Invalid 8',
      frequency: 'WEEKLY',
      targetDaysPerWeek: 8,
    });
    const resInvalidEight = await habitsRoute.POST(reqInvalidEight);
    assert(resInvalidEight.status === 400, 'targetDaysPerWeek = 8 rejected with 400');

    // Invalid targetDaysPerWeek: non-numeric
    const reqInvalidStr = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Invalid Str',
      frequency: 'WEEKLY',
      targetDaysPerWeek: 'abc',
    });
    const resInvalidStr = await habitsRoute.POST(reqInvalidStr);
    assert(resInvalidStr.status === 400, 'Non-numeric targetDaysPerWeek rejected with 400');

    // Default targetDaysPerWeek when omitted: defaults to 3
    const reqDefaultWeekly = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Default Weekly',
      frequency: 'WEEKLY',
    });
    const resDefaultWeekly = await habitsRoute.POST(reqDefaultWeekly);
    const habitDefaultWeekly = await resDefaultWeekly.json();
    assert(habitDefaultWeekly.targetDaysPerWeek === 3, 'Omitted targetDaysPerWeek defaults to 3');

    // -------------------------------------------------------------
    // Test 3: Standalone and Area Assignment
    // -------------------------------------------------------------
    console.log('\n--- 3. Standalone and Area Assignment ---');
    // Habit created with areaId
    const reqAreaHabit = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Area Linked Habit',
      areaId: areaA.id,
    });
    const resAreaHabit = await habitsRoute.POST(reqAreaHabit);
    const habitArea = await resAreaHabit.json();
    assert(habitArea.areaId === areaA.id, 'Habit assigned to Area successfully');
    assert(habitArea.area === 'Wellness & Health', 'Area name resolved in response');

    // Habit created standalone (areaId: null)
    const reqStandalone = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Standalone Habit',
      areaId: null,
    });
    const resStandalone = await habitsRoute.POST(reqStandalone);
    const habitStandalone = await resStandalone.json();
    assert(habitStandalone.areaId === null && habitStandalone.area === null, 'Standalone habit has null area');

    // Move standalone into Area via PATCH
    const reqMoveToArea = createJsonRequest(`http://localhost:3000/api/habits/${habitStandalone.id}`, 'PATCH', {
      areaId: areaA.id,
    });
    const resMoveToArea = await habitsIdRoute.PATCH(reqMoveToArea, { params: Promise.resolve({ id: habitStandalone.id }) });
    const habitMoved = await resMoveToArea.json();
    assert(habitMoved.areaId === areaA.id && habitMoved.area === 'Wellness & Health', 'Habit moved into Area via PATCH');

    // Detach from Area via PATCH (areaId: null)
    const reqDetachArea = createJsonRequest(`http://localhost:3000/api/habits/${habitStandalone.id}`, 'PATCH', {
      areaId: null,
    });
    const resDetachArea = await habitsIdRoute.PATCH(reqDetachArea, { params: Promise.resolve({ id: habitStandalone.id }) });
    const habitDetached = await resDetachArea.json();
    assert(habitDetached.areaId === null && habitDetached.area === null, 'Habit detached from Area via PATCH');

    // -------------------------------------------------------------
    // Test 4: Project & Subproject Assignment Rejection (400 Bad Request)
    // -------------------------------------------------------------
    console.log('\n--- 4. Project & Subproject Assignment Rejection (400 Bad Request) ---');
    // POST with projectId
    const reqRejectProj = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Reject Project Habit',
      projectId: projectA.id,
    });
    const resRejectProj = await habitsRoute.POST(reqRejectProj);
    assert(resRejectProj.status === 400, 'POST with projectId rejected with 400');

    // POST with subProjectId
    const reqRejectSub = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Reject SubProject Habit',
      subProjectId: subProjectA.id,
    });
    const resRejectSub = await habitsRoute.POST(reqRejectSub);
    assert(resRejectSub.status === 400, 'POST with subProjectId rejected with 400');

    // POST with project name alias
    const reqRejectProjName = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Reject Project Name Habit',
      project: 'Fitness Marathon',
    });
    const resRejectProjName = await habitsRoute.POST(reqRejectProjName);
    assert(resRejectProjName.status === 400, 'POST with project name rejected with 400');

    // PATCH with projectId
    const reqPatchProj = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}`, 'PATCH', {
      projectId: projectA.id,
    });
    const resPatchProj = await habitsIdRoute.PATCH(reqPatchProj, { params: Promise.resolve({ id: habitDaily.id }) });
    assert(resPatchProj.status === 400, 'PATCH with projectId rejected with 400');

    // PATCH with subProjectId
    const reqPatchSub = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}`, 'PATCH', {
      subProjectId: subProjectA.id,
    });
    const resPatchSub = await habitsIdRoute.PATCH(reqPatchSub, { params: Promise.resolve({ id: habitDaily.id }) });
    assert(resPatchSub.status === 400, 'PATCH with subProjectId rejected with 400');

    // -------------------------------------------------------------
    // Test 5: Daily Check-in & Undo (via toggle and check/uncheck)
    // -------------------------------------------------------------
    console.log('\n--- 5. Daily Check-in & Undo (via toggle and check/uncheck) ---');
    const todayStr = getUserLocalToday('UTC');

    // Toggle check-in (POST)
    const reqToggle1 = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}/toggle`, 'POST', {
      date: todayStr,
    });
    const resToggle1 = await habitsToggleRoute.POST(reqToggle1, { params: Promise.resolve({ id: habitDaily.id }) });
    const toggle1 = await resToggle1.json();
    assert(toggle1.action === 'checked_in', 'Toggle first call checks in');
    assert(toggle1.completedToday === true, 'completedToday is true');
    assert(toggle1.currentStreak === 1, 'currentStreak is 1');

    // Toggle undo (POST)
    const reqToggle2 = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}/toggle`, 'POST', {
      date: todayStr,
    });
    const resToggle2 = await habitsToggleRoute.POST(reqToggle2, { params: Promise.resolve({ id: habitDaily.id }) });
    const toggle2 = await resToggle2.json();
    assert(toggle2.action === 'undone', 'Toggle second call undos check-in');
    assert(toggle2.completedToday === false, 'completedToday is false');
    assert(toggle2.currentStreak === 0, 'currentStreak is 0');

    // Explicit check (POST /check)
    const reqCheck = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}/check`, 'POST', {
      date: todayStr,
    });
    const resCheck = await habitsCheckRoute.POST(reqCheck, { params: Promise.resolve({ id: habitDaily.id }) });
    assert(resCheck.status === 201, 'POST /check returns 201 Created');
    const checkRes = await resCheck.json();
    assert(checkRes.completedToday === true && checkRes.currentStreak === 1, 'Habit checked in via /check');

    // Explicit uncheck (POST /uncheck)
    const reqUncheck = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}/uncheck`, 'POST', {
      date: todayStr,
    });
    const resUncheck = await habitsUncheckRoute.POST(reqUncheck, { params: Promise.resolve({ id: habitDaily.id }) });
    assert(resUncheck.status === 200, 'POST /uncheck returns 200');
    const uncheckRes = await resUncheck.json();
    assert(uncheckRes.completedToday === false && uncheckRes.currentStreak === 0, 'Habit unchecked via /uncheck');

    // -------------------------------------------------------------
    // Test 6: Duplicate Same-Day Check-in Rejection (409 Conflict)
    // -------------------------------------------------------------
    console.log('\n--- 6. Duplicate Same-Day Check-in Rejection (409 Conflict) ---');
    const specificDate = '2026-03-10';
    const reqCheckFirst = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}/check`, 'POST', {
      date: specificDate,
    });
    const resCheckFirst = await habitsCheckRoute.POST(reqCheckFirst, { params: Promise.resolve({ id: habitDaily.id }) });
    assert(resCheckFirst.status === 201, 'First check on specific date succeeds (201)');

    const reqCheckDup = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}/check`, 'POST', {
      date: specificDate,
    });
    const resCheckDup = await habitsCheckRoute.POST(reqCheckDup, { params: Promise.resolve({ id: habitDaily.id }) });
    assert(resCheckDup.status === 409, 'Duplicate check on same date rejected with 409 Conflict');

    // Verify exactly one row in database
    const dbLogsCount = await prisma.habitLog.count({
      where: { habitId: habitDaily.id, date: specificDate },
    });
    assert(dbLogsCount === 1, 'Database enforces exactly one HabitLog per habit per date');

    // Clean up specific date log
    await prisma.habitLog.deleteMany({ where: { habitId: habitDaily.id, date: specificDate } });

    // -------------------------------------------------------------
    // Test 7: Daily Streak Calculation (Consecutive Days, Grace Period)
    // -------------------------------------------------------------
    console.log('\n--- 7. Daily Streak Calculation (Consecutive Days, Grace Period) ---');
    // Scenario A: T-3, T-2, T-1 checked in, but NOT today T (grace period active)
    const testToday = '2026-05-10';
    const tMinus1 = addDaysToDateOnly(testToday, -1); // 2026-05-09
    const tMinus2 = addDaysToDateOnly(testToday, -2); // 2026-05-08
    const tMinus3 = addDaysToDateOnly(testToday, -3); // 2026-05-07

    const dailyResultGrace = calculateDailyStreak([tMinus3, tMinus2, tMinus1], testToday);
    assert(dailyResultGrace.completedToday === false, 'Grace period: completedToday is false');
    assert(dailyResultGrace.currentStreak === 3, 'Grace period: currentStreak preserves 3 consecutive days until midnight');
    assert(dailyResultGrace.longestStreak === 3, 'Grace period: longestStreak is 3');

    // Scenario B: Today T is also checked in
    const dailyResultToday = calculateDailyStreak([tMinus3, tMinus2, tMinus1, testToday], testToday);
    assert(dailyResultToday.completedToday === true, 'Checked today: completedToday is true');
    assert(dailyResultToday.currentStreak === 4, 'Checked today: currentStreak is 4');
    assert(dailyResultToday.longestStreak === 4, 'Checked today: longestStreak is 4');

    // Scenario C: Broken streak (missed yesterday T-1)
    const dailyResultBroken = calculateDailyStreak([tMinus3, tMinus2], testToday);
    assert(dailyResultBroken.completedToday === false, 'Broken streak: completedToday is false');
    assert(dailyResultBroken.currentStreak === 0, 'Broken streak: currentStreak resets to 0');
    assert(dailyResultBroken.longestStreak === 2, 'Broken streak: longestStreak retains historical max 2');

    // -------------------------------------------------------------
    // Test 8: Weekly Target Progress (e.g. 2 of 3 days)
    // -------------------------------------------------------------
    console.log('\n--- 8. Weekly Target Progress (e.g. 2 of 3 days) ---');
    // Given an ISO week Monday: 2026-05-04 to Sunday: 2026-05-10
    const weekMonday = '2026-05-04';
    const d1 = '2026-05-04';
    const d2 = '2026-05-05';
    const d3 = '2026-05-06';

    const prog2of3 = calculateWeeklyStreak([d1, d2], '2026-05-07', 3);
    assert(prog2of3.weeklyProgress.completed === 2, 'Weekly progress completed is 2');
    assert(prog2of3.weeklyProgress.target === 3, 'Weekly progress target is 3');
    assert(prog2of3.weeklyProgress.targetMet === false, 'targetMet is false when completed < target');
    assert(prog2of3.weeklyProgress.bonusDays === 0, 'bonusDays is 0');

    const prog3of3 = calculateWeeklyStreak([d1, d2, d3], '2026-05-07', 3);
    assert(prog3of3.weeklyProgress.completed === 3, 'Weekly progress completed is 3');
    assert(prog3of3.weeklyProgress.targetMet === true, 'targetMet is true when completed >= target');

    // -------------------------------------------------------------
    // Test 9: Weekly Streak Across Monday–Sunday ISO Weeks
    // -------------------------------------------------------------
    console.log('\n--- 9. Weekly Streak Across Monday–Sunday ISO Weeks ---');
    // Week 1 (2026-04-20 to 2026-04-26): 3 days completed
    const w1 = ['2026-04-20', '2026-04-21', '2026-04-22'];
    // Week 2 (2026-04-27 to 2026-05-03): 3 days completed
    const w2 = ['2026-04-27', '2026-04-28', '2026-04-29'];
    // Week 3 (2026-05-04 to 2026-05-10): currently in progress, 0 days completed yet
    const curEvalDate = '2026-05-05'; // Tuesday of Week 3

    const weeklyGrace = calculateWeeklyStreak([...w1, ...w2], curEvalDate, 3);
    assert(weeklyGrace.currentStreak === 2, 'Weekly grace period preserves 2 weeks while current week is in progress');

    // Complete 3 days in current week 3
    const w3 = ['2026-05-04', '2026-05-05', '2026-05-06'];
    const weeklyMet = calculateWeeklyStreak([...w1, ...w2, ...w3], curEvalDate, 3);
    assert(weeklyMet.currentStreak === 3, 'Weekly streak increments to 3 once current week target is met');

    // -------------------------------------------------------------
    // Test 10: ISO Week Boundaries (Monday Start, Sunday End)
    // -------------------------------------------------------------
    console.log('\n--- 10. ISO Week Boundaries (Monday Start, Sunday End) ---');
    // Check Monday
    const boundsMon = getIsoWeekBounds('2026-03-09'); // 2026-03-09 is Monday
    assert(boundsMon.monday === '2026-03-09' && boundsMon.sunday === '2026-03-15', 'Monday maps to Monday-Sunday bounds');

    // Check Sunday
    const boundsSun = getIsoWeekBounds('2026-03-15'); // 2026-03-15 is Sunday
    assert(boundsSun.monday === '2026-03-09' && boundsSun.sunday === '2026-03-15', 'Sunday maps to same Monday-Sunday bounds');

    // Check next Monday
    const boundsNextMon = getIsoWeekBounds('2026-03-16');
    assert(boundsNextMon.monday === '2026-03-16' && boundsNextMon.sunday === '2026-03-22', 'Next Monday maps to next week bounds');

    // Verify Sunday check-in counts toward correct week
    const sunCheck = calculateWeeklyStreak(['2026-03-15'], '2026-03-15', 1);
    assert(sunCheck.weeklyProgress.currentWeekMonday === '2026-03-09', 'Sunday check-in belongs to Monday 2026-03-09 week');
    assert(sunCheck.weeklyProgress.completed === 1, 'Sunday check-in counts in current week progress');

    // -------------------------------------------------------------
    // Test 11: Month & Year Boundary Rollover (Dec 31 to Jan 1)
    // -------------------------------------------------------------
    console.log('\n--- 11. Month & Year Boundary Rollover (Dec 31 to Jan 1) ---');
    // Year boundary: Dec 30, Dec 31, Jan 01, Jan 02
    const yearBoundaryDates = ['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02'];
    const streakYearBoundary = calculateDailyStreak(yearBoundaryDates, '2026-01-02');
    assert(streakYearBoundary.currentStreak === 4, 'Streak seamlessly crosses Dec 31 -> Jan 01 year rollover (streak = 4)');

    // Leap year rollover: Feb 28, Feb 29, Mar 01 on leap year 2024
    const leapDates = ['2024-02-28', '2024-02-29', '2024-03-01'];
    const leapStreak = calculateDailyStreak(leapDates, '2024-03-01');
    assert(leapStreak.currentStreak === 3, 'Streak handles leap day Feb 29 (streak = 3)');

    // Non-leap year rollover: Feb 28 -> Mar 01 on 2025
    const nonLeapDates = ['2025-02-28', '2025-03-01'];
    const nonLeapStreak = calculateDailyStreak(nonLeapDates, '2025-03-01');
    assert(nonLeapStreak.currentStreak === 2, 'Streak handles non-leap month boundary Feb 28 -> Mar 01 (streak = 2)');

    // -------------------------------------------------------------
    // Test 12: Timezone Differences (US/Pacific vs Asia/Tokyo)
    // -------------------------------------------------------------
    console.log('\n--- 12. Timezone Differences (US/Pacific vs Asia/Tokyo) ---');
    // Timezone header passing to GET /api/habits
    const reqTokyo = createJsonRequest('http://localhost:3000/api/habits', 'GET', undefined, {
      'x-timezone': 'Asia/Tokyo',
    });
    const resTokyo = await habitsRoute.GET(reqTokyo);
    assert(resTokyo.status === 200, 'GET /api/habits with Asia/Tokyo succeeds');

    const reqLA = createJsonRequest('http://localhost:3000/api/habits', 'GET', undefined, {
      'x-timezone': 'America/Los_Angeles',
    });
    const resLA = await habitsRoute.GET(reqLA);
    assert(resLA.status === 200, 'GET /api/habits with America/Los_Angeles succeeds');

    // Test pure function timezone resolution
    const tokyoToday = getUserLocalToday('Asia/Tokyo');
    const laToday = getUserLocalToday('America/Los_Angeles');
    assert(isValidDateOnly(tokyoToday), 'Asia/Tokyo yields valid YYYY-MM-DD');
    assert(isValidDateOnly(laToday), 'America/Los_Angeles yields valid YYYY-MM-DD');

    // -------------------------------------------------------------
    // Test 13: Daylight-Saving Transitions (No 23h/25h Date Shifting)
    // -------------------------------------------------------------
    console.log('\n--- 13. Daylight-Saving Transitions (No 23h/25h Date Shifting) ---');
    // US Spring forward 2026: March 8
    const springBefore = '2026-03-07';
    const springDay = addDaysToDateOnly(springBefore, 1);
    const springAfter = addDaysToDateOnly(springDay, 1);
    assert(springDay === '2026-03-08', 'Spring DST day advances strictly 1 calendar day');
    assert(springAfter === '2026-03-09', 'Post-Spring DST advances strictly to March 9');

    // US Fall back 2026: November 1
    const fallBefore = '2026-10-31';
    const fallDay = addDaysToDateOnly(fallBefore, 1);
    const fallAfter = addDaysToDateOnly(fallDay, 1);
    assert(fallDay === '2026-11-01', 'Fall DST day advances strictly to November 1');
    assert(fallAfter === '2026-11-02', 'Post-Fall DST advances strictly to November 2');

    // -------------------------------------------------------------
    // Test 14: Frequency Changes (DAILY -> WEEKLY Preserving Logs)
    // -------------------------------------------------------------
    console.log('\n--- 14. Frequency Changes (DAILY -> WEEKLY Preserving Logs) ---');
    const { monday: curWeekMon } = getIsoWeekBounds(getUserLocalToday('UTC'));
    const logD1 = curWeekMon;
    const logD2 = addDaysToDateOnly(curWeekMon, 1);
    const logD3 = addDaysToDateOnly(curWeekMon, 2);

    // Create habit with startDate at start of current week
    const reqFreqHabit = createJsonRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Dynamic Frequency Habit',
      frequency: 'DAILY',
      startDate: curWeekMon,
    });
    const resFreqHabit = await habitsRoute.POST(reqFreqHabit);
    const freqHabit = await resFreqHabit.json();

    // Insert 3 logs in the current ISO week
    await prisma.habitLog.createMany({
      data: [
        { habitId: freqHabit.id, userId: userA.id, date: logD1 },
        { habitId: freqHabit.id, userId: userA.id, date: logD2 },
        { habitId: freqHabit.id, userId: userA.id, date: logD3 },
      ],
    });

    // Switch frequency to WEEKLY with targetDaysPerWeek: 3
    const reqSwitchWeekly = createJsonRequest(`http://localhost:3000/api/habits/${freqHabit.id}`, 'PATCH', {
      frequency: 'WEEKLY',
      targetDaysPerWeek: 3,
    });
    const resSwitchWeekly = await habitsIdRoute.PATCH(reqSwitchWeekly, { params: Promise.resolve({ id: freqHabit.id }) });
    const switchedWeekly = await resSwitchWeekly.json();
    assert(switchedWeekly.frequency === 'WEEKLY', 'Frequency updated to WEEKLY');
    assert(switchedWeekly.targetDaysPerWeek === 3, 'targetDaysPerWeek updated to 3');
    assert(switchedWeekly.weeklyProgress && switchedWeekly.weeklyProgress.completed === 3, 'Weekly progress reflects existing logs');

    // Verify all 3 logs still exist in database
    const preservedCount = await prisma.habitLog.count({ where: { habitId: freqHabit.id } });
    assert(preservedCount === 3, 'Historical HabitLogs preserved 100% across frequency change');

    // Switch back to DAILY
    const reqSwitchDaily = createJsonRequest(`http://localhost:3000/api/habits/${freqHabit.id}`, 'PATCH', {
      frequency: 'DAILY',
    });
    const resSwitchDaily = await habitsIdRoute.PATCH(reqSwitchDaily, { params: Promise.resolve({ id: freqHabit.id }) });
    const switchedDaily = await resSwitchDaily.json();
    assert(switchedDaily.frequency === 'DAILY', 'Frequency switched back to DAILY');
    assert(switchedDaily.targetDaysPerWeek === null, 'targetDaysPerWeek reset to null for DAILY');

    // -------------------------------------------------------------
    // Test 15: Bonus Weekly Check-ins (5 of 3 days completed)
    // -------------------------------------------------------------
    console.log('\n--- 15. Bonus Weekly Check-ins (5 of 3 days completed) ---');
    const bonusDates = [
      '2026-05-04',
      '2026-05-05',
      '2026-05-06',
      '2026-05-07',
      '2026-05-08',
    ];
    const bonusCalc = calculateWeeklyStreak(bonusDates, '2026-05-08', 3);
    assert(bonusCalc.weeklyProgress.completed === 5, 'completed is 5');
    assert(bonusCalc.weeklyProgress.target === 3, 'target is 3');
    assert(bonusCalc.weeklyProgress.targetMet === true, 'targetMet is true');
    assert(bonusCalc.weeklyProgress.bonusDays === 2, 'bonusDays is 2 (5 - 3)');
    assert(bonusCalc.currentStreak === 1, 'Current weekly streak is active (not broken by bonus days)');

    // -------------------------------------------------------------
    // Test 16: Archival and Restoration Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- 16. Archival and Restoration Lifecycle ---');
    // Archive habit
    const reqArchive = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}/archive`, 'POST');
    const resArchive = await habitsArchiveRoute.POST(reqArchive, { params: Promise.resolve({ id: habitDaily.id }) });
    const archivedHabit = await resArchive.json();
    assert(archivedHabit.archived === true, 'Habit archived field is true');
    assert(archivedHabit.archivedAt !== null, 'Habit archivedAt timestamp is populated');

    // Default GET should exclude archived habit
    const reqListActive = createJsonRequest('http://localhost:3000/api/habits', 'GET');
    const resListActive = await habitsRoute.GET(reqListActive);
    const listActive = await resListActive.json();
    assert(!listActive.some(h => h.id === habitDaily.id), 'Default GET /api/habits excludes archived habits');

    // GET with archived=true should include only archived habits
    const reqListArchivedOnly = createJsonRequest('http://localhost:3000/api/habits?archived=true', 'GET');
    const resListArchivedOnly = await habitsRoute.GET(reqListArchivedOnly);
    const listArchivedOnly = await resListArchivedOnly.json();
    assert(listArchivedOnly.some(h => h.id === habitDaily.id), 'GET ?archived=true includes archived habit');

    // GET with includeArchived=true should include all habits
    const reqListAll = createJsonRequest('http://localhost:3000/api/habits?includeArchived=true', 'GET');
    const resListAll = await habitsRoute.GET(reqListAll);
    const listAll = await resListAll.json();
    assert(listAll.some(h => h.id === habitDaily.id), 'GET ?includeArchived=true includes both active and archived');

    // Restore habit
    const reqRestore = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}/restore`, 'POST');
    const resRestore = await habitsRestoreRoute.POST(reqRestore, { params: Promise.resolve({ id: habitDaily.id }) });
    const restoredHabit = await resRestore.json();
    assert(restoredHabit.archived === false && restoredHabit.archivedAt === null, 'Habit restored');

    // Default GET now includes it again
    const resListAfterRestore = await habitsRoute.GET(reqListActive);
    const listAfterRestore = await resListAfterRestore.json();
    assert(listAfterRestore.some(h => h.id === habitDaily.id), 'Restored habit appears in active list');

    // -------------------------------------------------------------
    // Test 17: Authentication & Cross-User Isolation
    // -------------------------------------------------------------
    console.log('\n--- 17. Authentication & Cross-User Isolation ---');
    // Unauthenticated request
    __setTestSession(null);
    const reqUnauth = createJsonRequest('http://localhost:3000/api/habits', 'GET');
    const resUnauth = await habitsRoute.GET(reqUnauth);
    assert(resUnauth.status === 401, 'Unauthenticated request returns 401 Unauthorized');

    // Cross-user isolation: User B accesses User A's habit
    __setTestSession({ user: { id: userB.id, email: userB.email } });

    // User B tries to GET User A's habit
    const reqCrossGet = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}`, 'GET');
    const resCrossGet = await habitsIdRoute.GET(reqCrossGet, { params: Promise.resolve({ id: habitDaily.id }) });
    assert(resCrossGet.status === 404, 'User B cannot GET User A habit (returns 404)');

    // User B tries to check into User A's habit
    const reqCrossCheck = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}/check`, 'POST', { date: todayStr });
    const resCrossCheck = await habitsCheckRoute.POST(reqCrossCheck, { params: Promise.resolve({ id: habitDaily.id }) });
    assert(resCrossCheck.status === 404, 'User B cannot check in to User A habit (returns 404)');

    // User B tries to PATCH User A's habit
    const reqCrossPatch = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}`, 'PATCH', { name: 'Hacked' });
    const resCrossPatch = await habitsIdRoute.PATCH(reqCrossPatch, { params: Promise.resolve({ id: habitDaily.id }) });
    assert(resCrossPatch.status === 404, 'User B cannot PATCH User A habit (returns 404)');

    // User B tries to DELETE User A's habit
    const reqCrossDel = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}`, 'DELETE');
    const resCrossDel = await habitsIdRoute.DELETE(reqCrossDel, { params: Promise.resolve({ id: habitDaily.id }) });
    assert(resCrossDel.status === 404, 'User B cannot DELETE User A habit (returns 404)');

    // Switch back to User A
    __setTestSession({ user: { id: userA.id, email: userA.email } });

    // -------------------------------------------------------------
    // Test 18: Concurrent Check-in Safety (Unique Constraint)
    // -------------------------------------------------------------
    console.log('\n--- 18. Concurrent Check-in Safety ---');
    const concurrentDate = '2026-06-15';
    // Clean up any potential log for this date
    await prisma.habitLog.deleteMany({ where: { habitId: habitDaily.id, date: concurrentDate } });

    // Fire 5 simultaneous check requests
    const promises = [1, 2, 3, 4, 5].map(() => {
      const req = createJsonRequest(`http://localhost:3000/api/habits/${habitDaily.id}/check`, 'POST', {
        date: concurrentDate,
      });
      return habitsCheckRoute.POST(req, { params: Promise.resolve({ id: habitDaily.id }) });
    });

    const results = await Promise.all(promises);
    const statuses = results.map(r => r.status);
    const successCount = statuses.filter(s => s === 201).length;
    const conflictCount = statuses.filter(s => s === 409).length;

    assert(successCount === 1, `Exactly 1 concurrent check-in succeeded (count = ${successCount})`);
    assert(conflictCount === 4, `Remaining 4 concurrent check-ins received 409 Conflict (count = ${conflictCount})`);

    const finalLogsCount = await prisma.habitLog.count({
      where: { habitId: habitDaily.id, date: concurrentDate },
    });
    assert(finalLogsCount === 1, 'Database contains exactly 1 HabitLog row after concurrent check-ins');

    // Clean up
    await prisma.habitLog.deleteMany({ where: { habitId: habitDaily.id, date: concurrentDate } });

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(` MILESTONE 2.3 INTEGRATION TEST SUITE RESULTS:`);
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

runMilestone23Suite();

