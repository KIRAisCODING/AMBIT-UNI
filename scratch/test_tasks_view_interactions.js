/**
 * AMBIT Final Pre-Merge Review — Section 2, 3, 4 Interactive & Hierarchy Suite
 * Target DB: ambit_test_db (Neon Serverless PostgreSQL)
 */

const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';

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

const tasksRoute = jiti(path.join(backendDir, 'app/api/tasks/route.ts'));
const taskDetailRoute = jiti(path.join(backendDir, 'app/api/tasks/[id]/route.ts'));
const notesRoute = jiti(path.join(backendDir, 'app/api/notes/route.ts'));
const noteDetailRoute = jiti(path.join(backendDir, 'app/api/notes/[id]/route.ts'));
const habitsRoute = jiti(path.join(backendDir, 'app/api/habits/route.ts'));
const habitToggleRoute = jiti(path.join(backendDir, 'app/api/habits/[id]/toggle/route.ts'));
const areasRoute = jiti(path.join(backendDir, 'app/api/areas/route.ts'));
const projectsRoute = jiti(path.join(backendDir, 'app/api/projects/route.ts'));
const subProjectsRoute = jiti(path.join(backendDir, 'app/api/subprojects/route.ts'));

let total = 0;
let passed = 0;

function assert(condition, desc) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${desc}`);
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    throw new Error(desc);
  }
}

function makeRequest(url, method = 'GET', body = null) {
  const reqInit = {
    method,
    headers: { 'content-type': 'application/json', 'x-timezone': 'UTC' },
  };
  if (body) reqInit.body = JSON.stringify(body);
  return new Request(url, reqInit);
}

async function run() {
  console.log('====================================================');
  console.log(' Tasks View Interactions & Hierarchy Validation Suite');
  console.log(' Target DB: ambit_test_db');
  console.log('====================================================\n');

  // Test user
  const email = `interaction_test_${Date.now()}@ambit.test`;
  const user = await prisma.user.create({
    data: { id: `usr_int_${Date.now()}`, email, name: 'Interaction Tester' },
  });

  __setTestSession({
    user: { id: user.id, email: user.email, name: user.name },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });

  // Setup hierarchy: Area -> Project (with Subproject) + Project (without Subproject)
  const areaRes = await (await areasRoute.POST(makeRequest('http://localhost:3000/api/areas', 'POST', { name: 'Engineering' }))).json();
  const areaId = areaRes.id;

  const projWithSubRes = await (await projectsRoute.POST(makeRequest('http://localhost:3000/api/projects', 'POST', { name: 'Core Engine', areaId }))).json();
  const projWithSubId = projWithSubRes.id;

  const subProjRes = await (await subProjectsRoute.POST(makeRequest('http://localhost:3000/api/subprojects', 'POST', { name: 'Parser Module', projectId: projWithSubId }))).json();
  const subProjectId = subProjRes.id;

  const projNoSubRes = await (await projectsRoute.POST(makeRequest('http://localhost:3000/api/projects', 'POST', { name: 'Direct Docs', areaId }))).json();
  const projNoSubId = projNoSubRes.id;

  console.log('--- 1. Section 2: Tasks View Interactions ---');
  // 1.1 Create Unassigned Task
  const task1Res = await (await tasksRoute.POST(makeRequest('http://localhost:3000/api/tasks', 'POST', {
    title: 'Migrate Config',
    priority: 'HIGH',
  }))).json();
  assert(task1Res.id && !task1Res.areaId && !task1Res.projectId && !task1Res.subProjectId, 'Created unassigned task');

  // Appears in unassigned query
  const unassignedList1 = await (await tasksRoute.GET(makeRequest('http://localhost:3000/api/tasks?unassigned=true'))).json();
  assert(unassignedList1.some(t => t.id === task1Res.id), 'Task appears in GET /api/tasks?unassigned=true');

  // 1.2 Assign to Area
  const assignedArea = await (await taskDetailRoute.PATCH(makeRequest(`http://localhost:3000/api/tasks/${task1Res.id}`, 'PATCH', {
    areaId,
  }), { params: Promise.resolve({ id: task1Res.id }) })).json();
  assert(assignedArea.areaId === areaId && !assignedArea.projectId, 'Assigned task to Area directly');

  // Disappears from unassigned query
  const unassignedList2 = await (await tasksRoute.GET(makeRequest('http://localhost:3000/api/tasks?unassigned=true'))).json();
  assert(!unassignedList2.some(t => t.id === task1Res.id), 'Task disappeared from unassigned filter');

  // 1.3 Assign to Project without a Subproject
  const assignedProjNoSub = await (await taskDetailRoute.PATCH(makeRequest(`http://localhost:3000/api/tasks/${task1Res.id}`, 'PATCH', {
    projectId: projNoSubId,
  }), { params: Promise.resolve({ id: task1Res.id }) })).json();
  assert(assignedProjNoSub.projectId === projNoSubId && !assignedProjNoSub.subProjectId, 'Assigned task to Project without Subproject');

  // Direct project query returns it
  const projTasks = await (await tasksRoute.GET(makeRequest(`http://localhost:3000/api/tasks?projectId=${projNoSubId}&direct=true`))).json();
  assert(projTasks.some(t => t.id === task1Res.id), 'Direct project task retrieved with direct=true query');

  // 1.4 Assign to Subproject
  const assignedSubProj = await (await taskDetailRoute.PATCH(makeRequest(`http://localhost:3000/api/tasks/${task1Res.id}`, 'PATCH', {
    areaId,
    projectId: projWithSubId,
    subProjectId,
  }), { params: Promise.resolve({ id: task1Res.id }) })).json();
  assert(assignedSubProj.subProjectId === subProjectId, 'Assigned task to Subproject');

  // 1.5 Edit and complete task without losing hierarchy
  const completedTask = await (await taskDetailRoute.PATCH(makeRequest(`http://localhost:3000/api/tasks/${task1Res.id}`, 'PATCH', {
    title: 'Migrate Config (Completed)',
    status: 'COMPLETED',
  }), { params: Promise.resolve({ id: task1Res.id }) })).json();
  assert(completedTask.status === 'COMPLETED' && completedTask.subProjectId === subProjectId, 'Completed task preserves subproject hierarchy');

  // 1.6 Filter completed vs uncompleted
  const completedList = await (await tasksRoute.GET(makeRequest('http://localhost:3000/api/tasks?status=COMPLETED'))).json();
  assert(completedList.some(t => t.id === task1Res.id), 'Task visible in completed query filter');

  const todoList = await (await tasksRoute.GET(makeRequest('http://localhost:3000/api/tasks?status=TODO'))).json();
  assert(!todoList.some(t => t.id === task1Res.id), 'Completed task excluded from TODO query filter');

  console.log('\n--- 2. Section 3: Hierarchy Presentation & Descendant Isolation ---');
  // Create a Direct Area Task
  const directAreaTask = await (await tasksRoute.POST(makeRequest('http://localhost:3000/api/tasks', 'POST', {
    title: 'Direct Engineering Review',
    areaId,
  }))).json();

  // Direct query on Area returns direct task only
  const directAreaTasks = await (await tasksRoute.GET(makeRequest(`http://localhost:3000/api/tasks?areaId=${areaId}&direct=true`))).json();
  assert(directAreaTasks.some(t => t.id === directAreaTask.id), 'Direct area query includes direct area task');
  assert(!directAreaTasks.some(t => t.id === task1Res.id), 'Direct area query EXCLUDES nested subproject task (no duplication)');

  // Recursive query on Area includes both
  const recursiveAreaTasks = await (await tasksRoute.GET(makeRequest(`http://localhost:3000/api/tasks?areaId=${areaId}`))).json();
  assert(recursiveAreaTasks.some(t => t.id === directAreaTask.id) && recursiveAreaTasks.some(t => t.id === task1Res.id), 'Recursive area query includes both direct and nested tasks for rollups');

  console.log('\n--- 3. Section 4: Notes and Habits Verification ---');
  // 3.1 Unassigned Note
  const unassignedNote = await (await notesRoute.POST(makeRequest('http://localhost:3000/api/notes', 'POST', {
    title: 'Unassigned Memo',
    content: 'Scratch content',
  }))).json();
  assert(unassignedNote.id && !unassignedNote.areaId && !unassignedNote.projectId, 'Created unassigned note');

  const unassignedNotesList = await (await notesRoute.GET(makeRequest('http://localhost:3000/api/notes?unassigned=true'))).json();
  assert(unassignedNotesList.some(n => n.id === unassignedNote.id), 'Unassigned note returned in unassigned query');

  // 3.2 Area-Assigned Note
  const areaNote = await (await notesRoute.POST(makeRequest('http://localhost:3000/api/notes', 'POST', {
    title: 'Architecture Blueprint',
    content: '# Architecture',
    areaId,
  }))).json();
  assert(areaNote.areaId === areaId, 'Created area-assigned note');

  const directAreaNotes = await (await notesRoute.GET(makeRequest(`http://localhost:3000/api/notes?areaId=${areaId}&direct=true`))).json();
  assert(directAreaNotes.some(n => n.id === areaNote.id), 'Direct area note retrieved via direct=true query');

  // 3.3 Standalone Habit
  const standaloneHabit = await (await habitsRoute.POST(makeRequest('http://localhost:3000/api/habits', 'POST', {
    name: 'Daily Meditation',
    frequency: 'DAILY',
  }))).json();
  assert(standaloneHabit.id && !standaloneHabit.areaId, 'Created standalone habit');

  // 3.4 Area-Assigned Habit
  const areaHabit = await (await habitsRoute.POST(makeRequest('http://localhost:3000/api/habits', 'POST', {
    name: 'Weekly Architecture Review',
    frequency: 'WEEKLY',
    targetDaysPerWeek: 1,
    areaId,
  }))).json();
  assert(areaHabit.areaId === areaId, 'Created area-assigned habit');

  // 3.5 Habit Toggle & Streak Preservation
  const today = new Date().toISOString().split('T')[0];
  const toggleRes = await (await habitToggleRoute.POST(makeRequest(`http://localhost:3000/api/habits/${standaloneHabit.id}/toggle`, 'POST', {
    date: today,
  }), { params: Promise.resolve({ id: standaloneHabit.id }) })).json();
  assert(toggleRes.completed === true && toggleRes.streak >= 1, 'Habit toggle records completion and increments streak');

  // 3.6 Reject Habit assigned to Project or Subproject
  const rejectHabitProj = await habitsRoute.POST(makeRequest('http://localhost:3000/api/habits', 'POST', {
    name: 'Illegal Project Habit',
    projectId: projNoSubId,
  }));
  assert(rejectHabitProj.status === 400, 'Assigning Habit to Project strictly rejected with HTTP 400');

  const rejectHabitSubProj = await habitsRoute.POST(makeRequest('http://localhost:3000/api/habits', 'POST', {
    name: 'Illegal SubProject Habit',
    subProjectId,
  }));
  assert(rejectHabitSubProj.status === 400, 'Assigning Habit to SubProject strictly rejected with HTTP 400');

  console.log('\n====================================================');
  console.log(` ALL ${passed}/${total} INTERACTION ASSERTIONS PASSED!`);
  console.log('====================================================');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});

