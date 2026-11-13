/**
 * AMBIT — Stage 3 End-to-End Comprehensive Integration Test Suite
 * Validates complete frontend-to-backend workflows against isolated ambit_test_db
 * Covers:
 * - Milestone 3.1: Domain Type System & API Client Normalization
 * - Milestone 3.2: Capture Queue, Promotion Flow & Core Workspaces
 * - Milestone 3.3: Dashboard, Calendar & Analytics Integration with Unified Cache
 * - Milestone 3.4: Polish, Mobile & End-to-End Regression Validation
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

// Strict safety guard against accidental production database writes
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

const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
const prisma = new PrismaClient({ datasources: { db: { url: directTestUrl } } });

const { __setTestSession, LIMIT_CONFIGS } = jiti(path.join(backendDir, 'lib/rateLimit.ts'));
LIMIT_CONFIGS.write.limit = 100000;
LIMIT_CONFIGS.read.limit = 100000;

// Target route handlers
const inboxRoute = jiti(path.join(backendDir, 'app/api/inbox/route.ts'));
const inboxPromoteRoute = jiti(path.join(backendDir, 'app/api/inbox/[id]/promote/route.ts'));
const inboxTrashRoute = jiti(path.join(backendDir, 'app/api/inbox/[id]/trash/route.ts'));
const inboxRestoreRoute = jiti(path.join(backendDir, 'app/api/inbox/[id]/restore/route.ts'));
const tasksRoute = jiti(path.join(backendDir, 'app/api/tasks/route.ts'));
const taskDetailRoute = jiti(path.join(backendDir, 'app/api/tasks/[id]/route.ts'));
const taskScheduleRoute = jiti(path.join(backendDir, 'app/api/tasks/[id]/schedule/route.ts'));
const taskReorderRoute = jiti(path.join(backendDir, 'app/api/tasks/reorder/route.ts'));
const notesRoute = jiti(path.join(backendDir, 'app/api/notes/route.ts'));
const noteDetailRoute = jiti(path.join(backendDir, 'app/api/notes/[id]/route.ts'));
const notePinRoute = jiti(path.join(backendDir, 'app/api/notes/[id]/pin/route.ts'));
const noteArchiveRoute = jiti(path.join(backendDir, 'app/api/notes/[id]/archive/route.ts'));
const habitsRoute = jiti(path.join(backendDir, 'app/api/habits/route.ts'));
const habitToggleRoute = jiti(path.join(backendDir, 'app/api/habits/[id]/toggle/route.ts'));
const areasRoute = jiti(path.join(backendDir, 'app/api/areas/route.ts'));
const areaDetailRoute = jiti(path.join(backendDir, 'app/api/areas/[id]/route.ts'));
const projectsRoute = jiti(path.join(backendDir, 'app/api/projects/route.ts'));
const dashboardRoute = jiti(path.join(backendDir, 'app/api/dashboard/route.ts'));
const calendarRoute = jiti(path.join(backendDir, 'app/api/calendar/route.ts'));
const analyticsRoute = jiti(path.join(backendDir, 'app/api/analytics/route.ts'));
const resetRoute = jiti(path.join(backendDir, 'app/api/settings/reset/route.ts'));

// Assertion trackers
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

function makeRequest(url, method = 'GET', body = null, headers = {}) {
  const reqInit = {
    method,
    headers: {
      'content-type': 'application/json',
      'x-timezone': 'UTC',
      ...headers,
    },
  };
  if (body) {
    reqInit.body = JSON.stringify(body);
  }
  return new Request(url, reqInit);
}

async function runStage3Tests() {
  console.log('===============================================================');
  console.log(' AMBIT Stage 3: End-to-End Frontend Integration Test Suite');
  console.log(' Database: ambit_test_db (Neon Serverless PostgreSQL)');
  console.log('===============================================================\n');

  // Setup dedicated test user
  const testUser = await prisma.user.upsert({
    where: { email: 'stage3-e2e@example.com' },
    update: { name: 'Stage 3 E2E Tester' },
    create: {
      id: 'usr_stage3_e2e_' + Date.now(),
      email: 'stage3-e2e@example.com',
      name: 'Stage 3 E2E Tester',
    },
  });

  const session = {
    user: {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  __setTestSession(session);

  // Clean test user data
  await prisma.habitLog.deleteMany({ where: { habit: { userId: testUser.id } } });
  await prisma.habit.deleteMany({ where: { userId: testUser.id } });
  await prisma.note.deleteMany({ where: { userId: testUser.id } });
  await prisma.task.deleteMany({ where: { userId: testUser.id } });
  await prisma.capture.deleteMany({ where: { userId: testUser.id } });
  await prisma.subProject.deleteMany({ where: { project: { userId: testUser.id } } });
  await prisma.project.deleteMany({ where: { userId: testUser.id } });
  await prisma.area.deleteMany({ where: { userId: testUser.id } });

  console.log('--- 1. Capture Intake, Triage & Promotion Pipeline ---');
  let capTask, capNote, capHabit;

  // 1.1 Create Captures via POST /api/inbox
  {
    const req = makeRequest('http://localhost:3000/api/inbox', 'POST', {
      rawContent: 'Draft Quarterly Engineering Roadmap',
      type: 'TASK',
    });
    const res = await inboxRoute.POST(req);
    assert(res.status === 201, 'Create Task Capture returns HTTP 201');
    capTask = await res.json();
    assert(capTask.content === 'Draft Quarterly Engineering Roadmap', 'Capture content preserved');
    assert(capTask.status === 'INBOX', 'Capture status is INBOX');
  }

  {
    const req = makeRequest('http://localhost:3000/api/inbox', 'POST', {
      rawContent: 'Database Indexing Guidelines & Best Practices',
      type: 'NOTE',
    });
    const res = await inboxRoute.POST(req);
    assert(res.status === 201, 'Create Note Capture returns HTTP 201');
    capNote = await res.json();
    assert(capNote.content === 'Database Indexing Guidelines & Best Practices', 'Capture content preserved');
  }

  {
    const req = makeRequest('http://localhost:3000/api/inbox', 'POST', {
      rawContent: 'Morning 20-minute Technical Reading',
      type: 'HABIT',
    });
    const res = await inboxRoute.POST(req);
    assert(res.status === 201, 'Create Habit Capture returns HTTP 201');
    capHabit = await res.json();
    assert(capHabit.content === 'Morning 20-minute Technical Reading', 'Capture content preserved');
  }

  // 1.2 Query Inbox Queue
  {
    const req = makeRequest('http://localhost:3000/api/inbox?status=INBOX', 'GET');
    const res = await inboxRoute.GET(req);
    assert(res.status === 200, 'GET /api/inbox returns HTTP 200');
    const items = await res.json();
    assert(items.length === 3, `Inbox queue contains 3 items (found ${items.length})`);
  }

  // 1.3 Setup Area & Project for hierarchy placement
  let areaRecord, projectRecord;
  {
    const req = makeRequest('http://localhost:3000/api/areas', 'POST', { name: 'Engineering' });
    const res = await areasRoute.POST(req);
    assert(res.status === 201, 'Create Area Engineering returns HTTP 201');
    areaRecord = await res.json();
  }
  {
    const req = makeRequest('http://localhost:3000/api/projects', 'POST', {
      name: 'Platform Scaling',
      areaId: areaRecord.id,
    });
    const res = await projectsRoute.POST(req);
    assert(res.status === 201, 'Create Project Platform Scaling returns HTTP 201');
    projectRecord = await res.json();
  }

  // 1.4 Promote Task Capture to First-Class Task
  let promotedTask;
  {
    const req = makeRequest(`http://localhost:3000/api/inbox/${capTask.id}/promote`, 'POST', {
      target: 'TASK',
      title: 'Finalize Q1 Architecture Strategy',
      description: 'Detail database partitioning and cache invalidation.',
      priority: 'HIGH',
      dueDate: '2026-11-25',
      areaId: areaRecord.id,
      projectId: projectRecord.id,
      tags: ['architecture', 'q1'],
    });
    const res = await inboxPromoteRoute.POST(req, { params: Promise.resolve({ id: capTask.id }) });
    const body = await res.json();
    if (res.status !== 200) {
      console.error('PROMOTION FAILED with status', res.status, 'body:', body);
    }
    assert(res.status === 200, 'Promote Task Capture returns HTTP 200');
    assert(body.success === true, 'Promotion success is true');
    promotedTask = body.task;
    assert(promotedTask.title === 'Finalize Q1 Architecture Strategy', 'Promoted Task has correct title');
    assert(promotedTask.priority === 'HIGH', 'Promoted Task has priority HIGH');

    // Verify capture status transitioned to PROMOTED
    const capCheck = await prisma.capture.findUnique({ where: { id: capTask.id } });
    assert(capCheck.status === 'PROMOTED', 'Capture status updated to PROMOTED in database');
  }

  // 1.5 Promote Note Capture to First-Class Note
  let promotedNote;
  {
    const req = makeRequest(`http://localhost:3000/api/inbox/${capNote.id}/promote`, 'POST', {
      target: 'NOTE',
      title: 'Database Partitioning Notes',
      content: '# Partitioning Strategy\nUse range partitions on createdAt.',
      areaId: areaRecord.id,
      projectId: projectRecord.id,
      tags: ['postgres', 'performance'],
    });
    const res = await inboxPromoteRoute.POST(req, { params: Promise.resolve({ id: capNote.id }) });
    assert(res.status === 200, 'Promote Note Capture returns HTTP 200');
    const body = await res.json();
    promotedNote = body.note;
    assert(promotedNote.title === 'Database Partitioning Notes', 'Promoted Note has correct title');
    assert(typeof promotedNote.content === 'string' && promotedNote.content.includes('# Partitioning Strategy'), 'Promoted Note preserves markdown content');
  }

  // 1.6 Promote Habit Capture to First-Class Habit
  let promotedHabit;
  {
    const req = makeRequest(`http://localhost:3000/api/inbox/${capHabit.id}/promote`, 'POST', {
      target: 'HABIT',
      title: 'Daily Technical Reading',
      frequency: 'DAILY',
      areaId: areaRecord.id,
    });
    const res = await inboxPromoteRoute.POST(req, { params: Promise.resolve({ id: capHabit.id }) });
    assert(res.status === 200, 'Promote Habit Capture returns HTTP 200');
    const body = await res.json();
    promotedHabit = body.habit;
    assert(promotedHabit.name === 'Daily Technical Reading', 'Promoted Habit has correct name');
    assert(promotedHabit.frequency === 'DAILY', 'Promoted Habit has frequency DAILY');
  }

  // 1.7 Trash and Restore Capture
  {
    const createReq = makeRequest('http://localhost:3000/api/inbox', 'POST', {
      rawContent: 'Temporary idea to discard',
      type: 'NOTE',
    });
    const createRes = await inboxRoute.POST(createReq);
    const tempCap = await createRes.json();

    // Trash
    const trashReq = makeRequest(`http://localhost:3000/api/inbox/${tempCap.id}/trash`, 'PATCH');
    const trashRes = await inboxTrashRoute.PATCH(trashReq, { params: Promise.resolve({ id: tempCap.id }) });
    assert(trashRes.status === 200, 'PATCH /trash returns HTTP 200');

    const trashCheck = await prisma.capture.findUnique({ where: { id: tempCap.id } });
    assert(trashCheck.status === 'TRASHED', 'Capture status is TRASHED in database');

    // Restore
    const restoreReq = makeRequest(`http://localhost:3000/api/inbox/${tempCap.id}/restore`, 'PATCH');
    const restoreRes = await inboxRestoreRoute.PATCH(restoreReq, { params: Promise.resolve({ id: tempCap.id }) });
    assert(restoreRes.status === 200, 'PATCH /restore returns HTTP 200');

    const restoreCheck = await prisma.capture.findUnique({ where: { id: tempCap.id } });
    assert(restoreCheck.status === 'INBOX', 'Capture status restored to INBOX');
  }

  console.log('\n--- 2. Task Management & Scheduling Semantics ---');
  // 2.1 Schedule Task: updates scheduledDate while preserving dueDate
  {
    const req = makeRequest(`http://localhost:3000/api/tasks/${promotedTask.id}/schedule`, 'PATCH', {
      scheduledDate: '2026-11-18',
    });
    const res = await taskScheduleRoute.PATCH(req, { params: Promise.resolve({ id: promotedTask.id }) });
    assert(res.status === 200, 'PATCH /api/tasks/:id/schedule returns HTTP 200');
    const updated = await res.json();
    assert(updated.scheduledDate === '2026-11-18', 'scheduledDate updated to 2026-11-18');
    assert(updated.dueDate.startsWith('2026-11-25'), 'dueDate remains 2026-11-25 (dual-date preserved)');
  }

  // 2.2 Task Reordering
  {
    const req = makeRequest('http://localhost:3000/api/tasks/reorder', 'PATCH', {
      orderedIds: [promotedTask.id],
    });
    const res = await taskReorderRoute.PATCH(req);
    assert(res.status === 200, 'PATCH /api/tasks/reorder returns HTTP 200');
  }

  // 2.3 Task Completion Toggle
  {
    const req = makeRequest(`http://localhost:3000/api/tasks/${promotedTask.id}`, 'PATCH', {
      status: 'COMPLETED',
    });
    const res = await taskDetailRoute.PATCH(req, { params: Promise.resolve({ id: promotedTask.id }) });
    assert(res.status === 200, 'Mark task COMPLETED returns HTTP 200');
    const completedTask = await res.json();
    assert(completedTask.status === 'COMPLETED', 'Task status is COMPLETED');
    assert(completedTask.completedAt !== null, 'completedAt timestamp recorded');
  }

  console.log('\n--- 3. First-Class Notes Management ---');
  // 3.1 Toggle Pin
  {
    const req = makeRequest(`http://localhost:3000/api/notes/${promotedNote.id}/pin`, 'PATCH');
    const res = await notePinRoute.PATCH(req, { params: Promise.resolve({ id: promotedNote.id }) });
    assert(res.status === 200, 'PATCH /api/notes/:id/pin returns HTTP 200');
    const pinRes = await res.json();
    assert(pinRes.pinned === true, 'Note is now pinned');
  }

  // 3.2 Toggle Archive
  {
    const req = makeRequest(`http://localhost:3000/api/notes/${promotedNote.id}/archive`, 'PATCH');
    const res = await noteArchiveRoute.PATCH(req, { params: Promise.resolve({ id: promotedNote.id }) });
    assert(res.status === 200, 'PATCH /api/notes/:id/archive returns HTTP 200');
    const archRes = await res.json();
    assert(archRes.archived === true, 'Note is now archived');
  }

  console.log('\n--- 4. Habit Tracking & Architecture Constraint Validation ---');
  // 4.1 Reject habit attached to Project (Decision 01 & 06)
  {
    const req = makeRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Invalid Habit',
      frequency: 'DAILY',
      projectId: projectRecord.id,
    });
    const res = await habitsRoute.POST(req);
    assert(res.status === 400, 'POST /api/habits with projectId rejected with HTTP 400 Bad Request');
  }

  // 4.2 Toggle Habit Daily Check-in
  {
    const testDate = new Date().toISOString().split('T')[0];
    const req = makeRequest(`http://localhost:3000/api/habits/${promotedHabit.id}/toggle`, 'POST', {
      date: testDate,
    });
    const res = await habitToggleRoute.POST(req, { params: Promise.resolve({ id: promotedHabit.id }) });
    assert(res.status === 200, 'POST /api/habits/:id/toggle returns HTTP 200');
    const toggleRes = await res.json();
    assert(toggleRes.completed === true, 'Habit is marked completed for date');
    assert(toggleRes.streak >= 1, `Habit streak incremented to ${toggleRes.streak}`);

    // Verify HabitLog record created
    const logCheck = await prisma.habitLog.findFirst({
      where: { habitId: promotedHabit.id, date: testDate },
    });
    assert(logCheck !== null, 'HabitLog entry exists in database');
  }

  console.log('\n--- 5. Hierarchy Deletion Safety Protocols ---');
  // 5.1 Area Deletion Safeguard: Cannot delete Area with dependent projects/tasks
  {
    const req = makeRequest(`http://localhost:3000/api/areas/${areaRecord.id}`, 'DELETE');
    const res = await areaDetailRoute.DELETE(req, { params: Promise.resolve({ id: areaRecord.id }) });
    assert(res.status === 409, 'Delete Area with children blocked with HTTP 409 Conflict');
    const err = await res.json();
    assert(err.error.includes('Cannot delete Area'), 'Error explains blocking dependencies');
  }

  console.log('\n--- 6. Dashboard, Calendar & Analytics Aggregation ---');
  // 6.1 Dashboard Briefing
  {
    const req = makeRequest('http://localhost:3000/api/dashboard', 'GET');
    const res = await dashboardRoute.GET(req);
    assert(res.status === 200, 'GET /api/dashboard returns HTTP 200');
    const dash = await res.json();
    assert(dash.greeting && dash.greeting.userName, 'Dashboard greeting contains user name');
    assert(dash.todayFocus !== undefined, 'Dashboard contains todayFocus');
    assert(Array.isArray(dash.activeProjects), 'Dashboard contains activeProjects array');
    assert(Array.isArray(dash.habitsSnapshot), 'Dashboard contains habitsSnapshot array');
  }

  // 6.2 Calendar Range Query
  {
    const req = makeRequest('http://localhost:3000/api/calendar?start=2026-11-01&end=2026-11-30', 'GET');
    const res = await calendarRoute.GET(req);
    assert(res.status === 200, 'GET /api/calendar returns HTTP 200');
    const cal = await res.json();
    assert(cal.startDate === '2026-11-01', 'Calendar returns requested startDate');
    assert(cal.endDate === '2026-11-30', 'Calendar returns requested endDate');
    assert(Array.isArray(cal.tasks), 'Calendar contains tasks array');
    assert(Array.isArray(cal.habitLogs), 'Calendar contains habitLogs array');
  }

  // 6.3 Analytics Metrics
  {
    const req = makeRequest('http://localhost:3000/api/analytics?timeRange=14days', 'GET');
    const res = await analyticsRoute.GET(req);
    assert(res.status === 200, 'GET /api/analytics returns HTTP 200');
    const analytics = await res.json();
    assert(Array.isArray(analytics.momentumData), 'Analytics contains momentumData array');
    assert(analytics.trendStatus && analytics.trendStatus.text, 'Analytics contains trendStatus');
    assert(analytics.areaProgress !== undefined, 'Analytics contains areaProgress');
    assert(analytics.thisWeekMetrics !== undefined, 'Analytics contains thisWeekMetrics');
  }

  console.log('\n--- 7. System Reset Safeguard Verification ---');
  // 7.1 Reject Reset without explicit confirmation
  {
    const req = makeRequest('http://localhost:3000/api/settings/reset', 'POST', {
      action: 'clear',
    });
    const res = await resetRoute.POST(req);
    assert(res.status === 400, 'POST /api/settings/reset without confirm: true rejected with HTTP 400');
  }

  console.log('\n===============================================================');
  console.log(` Stage 3 E2E Integration Suite Finished: ${passedAssertions}/${totalAssertions} assertions passed`);
  console.log('===============================================================\n');

  await prisma.$disconnect();

  if (failedAssertions > 0) {
    console.error(`FAILED with ${failedAssertions} errors.`);
    process.exit(1);
  } else {
    console.log('ALL STAGE 3 ASSERTIONS PASSED SUCCESSFULLY.');
    process.exit(0);
  }
}

runStage3Tests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
