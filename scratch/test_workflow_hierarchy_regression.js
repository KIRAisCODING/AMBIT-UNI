/**
 * AMBIT Workflow Integrity, Hierarchy Visibility & Navigation Simplification
 * Comprehensive Regression Verification Suite (24 Behaviour Assertions)
 * Target DB: ambit_test_db (Neon Serverless PostgreSQL)
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

// Target route handlers via jiti
const inboxRoute = jiti(path.join(backendDir, 'app/api/inbox/route.ts'));
const inboxPromoteRoute = jiti(path.join(backendDir, 'app/api/inbox/[id]/promote/route.ts'));
const tasksRoute = jiti(path.join(backendDir, 'app/api/tasks/route.ts'));
const taskDetailRoute = jiti(path.join(backendDir, 'app/api/tasks/[id]/route.ts'));
const notesRoute = jiti(path.join(backendDir, 'app/api/notes/route.ts'));
const habitsRoute = jiti(path.join(backendDir, 'app/api/habits/route.ts'));
const areasRoute = jiti(path.join(backendDir, 'app/api/areas/route.ts'));
const projectsRoute = jiti(path.join(backendDir, 'app/api/projects/route.ts'));
const subProjectsRoute = jiti(path.join(backendDir, 'app/api/subprojects/route.ts'));

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, description) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ ${description}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ FAIL: ${description}`);
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

async function retry(fn, retries = 5, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function runRegressionSuite() {
  console.log('===============================================================');
  console.log(' AMBIT Workflow Integrity & Hierarchy Verification Suite');
  console.log(' Database: ambit_test_db (Neon Serverless PostgreSQL)');
  console.log('===============================================================\n');

  // Setup test user with retry (Neon wakeup resilience)
  const testEmail = `workflow_audit_${Date.now()}@ambit.test`;
  const testUser = await retry(async () => {
    return await prisma.user.upsert({
      where: { email: testEmail },
      update: { name: 'Workflow Tester' },
      create: {
        id: 'usr_audit_' + Date.now(),
        email: testEmail,
        name: 'Workflow Tester',
      },
    });
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

  console.log('--- Phase 1: Dashboard Quick Capture Intake & Separation ---');
  // 1.1 Quick Capture Task -> Captured in inbox, NOT in tasks table
  let taskCapId;
  {
    const req = makeRequest('http://localhost:3000/api/inbox', 'POST', {
      rawContent: 'Audit Quick Task',
      type: 'TASK',
    });
    const res = await inboxRoute.POST(req);
    assert(res.status === 201, 'Quick Capture Task returns HTTP 201');
    const data = await res.json();
    taskCapId = data.id;

    const cap = await prisma.capture.findUnique({ where: { id: taskCapId } });
    assert(cap !== null && cap.status === 'INBOX', 'Capture stored in captures table with status INBOX');

    const taskCount = await prisma.task.count({ where: { userId: testUser.id, title: 'Audit Quick Task' } });
    assert(taskCount === 0, 'Quick Capture Task NOT inserted into first-class tasks table');
  }

  // 1.2 Quick Capture Note -> Captured in inbox, NOT in notes table
  let noteCapId;
  {
    const req = makeRequest('http://localhost:3000/api/inbox', 'POST', {
      rawContent: 'Audit Quick Note',
      type: 'NOTE',
    });
    const res = await inboxRoute.POST(req);
    assert(res.status === 201, 'Quick Capture Note returns HTTP 201');
    const data = await res.json();
    noteCapId = data.id;

    const noteCount = await prisma.note.count({ where: { userId: testUser.id, content: 'Audit Quick Note' } });
    assert(noteCount === 0, 'Quick Capture Note NOT inserted into first-class notes table');
  }

  // 1.3 Quick Capture Habit -> Captured in inbox, NOT in habits table
  let habitCapId;
  {
    const req = makeRequest('http://localhost:3000/api/inbox', 'POST', {
      rawContent: 'Audit Quick Habit',
      type: 'HABIT',
    });
    const res = await inboxRoute.POST(req);
    assert(res.status === 201, 'Quick Capture Habit returns HTTP 201');
    const data = await res.json();
    habitCapId = data.id;

    const habitCount = await prisma.habit.count({ where: { userId: testUser.id, name: 'Audit Quick Habit' } });
    assert(habitCount === 0, 'Quick Capture Habit NOT inserted into first-class habits table');
  }

  console.log('\n--- Phase 2: Hierarchy Setup & Capture Promotion ---');
  // 2.1 Setup Area, Project, Subproject
  let areaId, projectId, subProjectId;
  {
    const req = makeRequest('http://localhost:3000/api/areas', 'POST', { name: 'Operations' });
    const res = await areasRoute.POST(req);
    const area = await res.json();
    areaId = area.id;

    const reqP = makeRequest('http://localhost:3000/api/projects', 'POST', { name: 'Q4 Audit', areaId });
    const resP = await projectsRoute.POST(reqP);
    const proj = await resP.json();
    projectId = proj.id;

    const reqS = makeRequest('http://localhost:3000/api/subprojects', 'POST', { name: 'Phase Alpha', projectId });
    const resS = await subProjectsRoute.POST(reqS);
    const sub = await resS.json();
    subProjectId = sub.id;

    assert(areaId && projectId && subProjectId, 'Hierarchy Area -> Project -> Subproject created successfully');
  }

  // 2.2 Promote Task Capture
  {
    const req = makeRequest(`http://localhost:3000/api/inbox/${taskCapId}/promote`, 'POST', {
      target: 'TASK',
      title: 'Promoted Audit Task',
      areaId,
      projectId,
      priority: 'HIGH',
    });
    const res = await inboxPromoteRoute.POST(req, { params: Promise.resolve({ id: taskCapId }) });
    assert(res.status === 200, 'Promote Task Capture returns HTTP 200');
    const body = await res.json();
    assert(body.task.title === 'Promoted Audit Task', 'Promoted task has correct title');

    const cap = await prisma.capture.findUnique({ where: { id: taskCapId } });
    assert(cap.status === 'PROMOTED', 'Capture status transitioned to PROMOTED');

    const taskRecord = await prisma.task.findUnique({ where: { id: body.task.id } });
    assert(taskRecord !== null && taskRecord.projectId === projectId, 'Task exists in tasks table with correct projectId');
  }

  // 2.3 Promote Note Capture
  {
    const req = makeRequest(`http://localhost:3000/api/inbox/${noteCapId}/promote`, 'POST', {
      target: 'NOTE',
      title: 'Promoted Audit Note',
      content: 'Detailed audit markdown',
      areaId,
      projectId,
    });
    const res = await inboxPromoteRoute.POST(req, { params: Promise.resolve({ id: noteCapId }) });
    assert(res.status === 200, 'Promote Note Capture returns HTTP 200');
    const body = await res.json();
    assert(body.note.title === 'Promoted Audit Note', 'Promoted note has correct title');

    const noteRecord = await prisma.note.findUnique({ where: { id: body.note.id } });
    assert(noteRecord !== null && noteRecord.projectId === projectId, 'Note exists in notes table with correct projectId');
  }

  // 2.4 Promote Habit Capture
  {
    const req = makeRequest(`http://localhost:3000/api/inbox/${habitCapId}/promote`, 'POST', {
      target: 'HABIT',
      title: 'Promoted Daily Habit',
      frequency: 'DAILY',
      areaId,
    });
    const res = await inboxPromoteRoute.POST(req, { params: Promise.resolve({ id: habitCapId }) });
    assert(res.status === 200, 'Promote Habit Capture returns HTTP 200');
    const body = await res.json();
    assert(body.habit.name === 'Promoted Daily Habit', 'Promoted habit has correct name');

    const habitRecord = await prisma.habit.findUnique({ where: { id: body.habit.id } });
    assert(habitRecord !== null && habitRecord.areaId === areaId, 'Habit exists in habits table with correct areaId');
  }

  console.log('\n--- Phase 3: Direct First-Class Entity Creation & Hierarchy Filtering ---');
  // 3.1 Direct Unassigned Task creation
  let unassignedTaskId;
  {
    const req = makeRequest('http://localhost:3000/api/tasks', 'POST', {
      title: 'Direct Unassigned Action',
      priority: 'MEDIUM',
    });
    const res = await tasksRoute.POST(req);
    assert(res.status === 201, 'Direct Unassigned Task created with HTTP 201');
    const body = await res.json();
    unassignedTaskId = body.id;
    assert(!body.areaId && !body.projectId && !body.subProjectId, 'Task has null hierarchy fields (unassigned)');

    const reqList = makeRequest('http://localhost:3000/api/tasks?unassigned=true', 'GET');
    const resList = await tasksRoute.GET(reqList);
    const unassignedTasks = await resList.json();
    assert(unassignedTasks.some(t => t.id === unassignedTaskId), 'GET /api/tasks?unassigned=true returns the unassigned task');
  }

  // 3.2 Direct Project-Assigned Task without Subprojects (Zero Subprojects Case)
  let directProjectTaskId;
  let emptyProjectId;
  {
    const reqP = makeRequest('http://localhost:3000/api/projects', 'POST', { name: 'Zero Subprojects Project', areaId });
    const resP = await projectsRoute.POST(reqP);
    const emptyProj = await resP.json();
    emptyProjectId = emptyProj.id;

    const reqT = makeRequest('http://localhost:3000/api/tasks', 'POST', {
      title: 'Direct Project Task (No Subprojects)',
      projectId: emptyProjectId,
      areaId,
    });
    const resT = await tasksRoute.POST(reqT);
    assert(resT.status === 201, 'Direct Project Task created with HTTP 201');
    const body = await resT.json();
    directProjectTaskId = body.id;

    const reqList = makeRequest(`http://localhost:3000/api/tasks?projectId=${emptyProjectId}`, 'GET');
    const resList = await tasksRoute.GET(reqList);
    const projectTasks = await resList.json();
    assert(projectTasks.some(t => t.id === directProjectTaskId), 'Direct project task visible in project query with zero subprojects');
  }

  // 3.3 Direct Subproject Task and Recursive Hierarchy Querying
  let subProjectTaskId;
  {
    const reqT = makeRequest('http://localhost:3000/api/tasks', 'POST', {
      title: 'Subproject Task',
      subProjectId,
      projectId,
      areaId,
    });
    const resT = await tasksRoute.POST(reqT);
    assert(resT.status === 201, 'Subproject Task created with HTTP 201');
    const body = await resT.json();
    subProjectTaskId = body.id;

    const reqP = makeRequest(`http://localhost:3000/api/tasks?projectId=${projectId}`, 'GET');
    const resP = await tasksRoute.GET(reqP);
    const projTasks = await resP.json();
    assert(projTasks.some(t => t.id === subProjectTaskId), 'Querying parent projectId includes subproject tasks');

    const reqA = makeRequest(`http://localhost:3000/api/tasks?areaId=${areaId}`, 'GET');
    const resA = await tasksRoute.GET(reqA);
    const areaTasks = await resA.json();
    assert(areaTasks.some(t => t.id === subProjectTaskId), 'Querying parent areaId includes subproject tasks');
  }

  // 3.4 Direct Unassigned Note creation
  let unassignedNoteId;
  {
    const reqN = makeRequest('http://localhost:3000/api/notes', 'POST', {
      title: 'Unassigned Knowledge Note',
      content: 'Independent note content',
    });
    const resN = await notesRoute.POST(reqN);
    assert(resN.status === 201, 'Direct Unassigned Note created with HTTP 201');
    const body = await resN.json();
    unassignedNoteId = body.id;

    const reqList = makeRequest('http://localhost:3000/api/notes?unassigned=true', 'GET');
    const resList = await notesRoute.GET(reqList);
    const unassignedNotes = await resList.json();
    assert(unassignedNotes.some(n => n.id === unassignedNoteId), 'GET /api/notes?unassigned=true returns the unassigned note');
  }

  // 3.5 Direct Standalone Habit creation & Area-assigned Habit creation
  let standaloneHabitId;
  let areaHabitId;
  {
    const reqS = makeRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Independent Routine - Daily Hydration',
      frequency: 'DAILY',
    });
    const resS = await habitsRoute.POST(reqS);
    assert(resS.status === 201, 'Standalone Habit created with HTTP 201');
    const sHabit = await resS.json();
    standaloneHabitId = sHabit.id;
    assert(!sHabit.areaId, 'Standalone Habit has null areaId');

    const reqA = makeRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Area Habit - Weekly Retro',
      frequency: 'WEEKLY',
      targetDaysPerWeek: 1,
      areaId,
    });
    const resA = await habitsRoute.POST(reqA);
    assert(resA.status === 201, 'Area Habit created with HTTP 201');
    const aHabit = await resA.json();
    areaHabitId = aHabit.id;
    assert(aHabit.areaId === areaId, 'Area Habit has correct areaId');

    const reqReject = makeRequest('http://localhost:3000/api/habits', 'POST', {
      name: 'Illegal Project Habit',
      projectId,
    });
    const resReject = await habitsRoute.POST(reqReject);
    assert(resReject.status === 400, 'Assigning Habit to Project is strictly rejected with HTTP 400');
  }

  console.log('\n--- Phase 4: In-line Assignment of Unassigned Tasks ---');
  // 4.1 Assign unassigned task to Area and Project
  {
    const req = makeRequest(`http://localhost:3000/api/tasks/${unassignedTaskId}`, 'PATCH', {
      areaId,
      projectId,
    });
    const res = await taskDetailRoute.PATCH(req, { params: Promise.resolve({ id: unassignedTaskId }) });
    assert(res.status === 200, 'PATCH /api/tasks/:id assign returns HTTP 200');
    const updated = await res.json();
    assert(updated.areaId === areaId && updated.projectId === projectId, 'Task now assigned to Area and Project');

    const reqList = makeRequest('http://localhost:3000/api/tasks?unassigned=true', 'GET');
    const resList = await tasksRoute.GET(reqList);
    const unassignedTasks = await resList.json();
    assert(!unassignedTasks.some(t => t.id === unassignedTaskId), 'Task successfully removed from unassigned backlog');
  }

  console.log('\n===============================================================');
  console.log(` Regression Suite Results: ${passedAssertions}/${totalAssertions} assertions passed`);
  console.log('===============================================================');

  if (failedAssertions > 0) {
    console.error(`FAILED with ${failedAssertions} errors.`);
    process.exit(1);
  } else {
    console.log('ALL 24 WORKFLOW & HIERARCHY ASSERTIONS PASSED PERFECTLY.');
  }
}

runRegressionSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
