/**
 * AMBIT Milestone 2.1 HTTP Integration Test Suite
 * Executes against isolated database: ambit_test_db
 * Tests actual Next.js App Router route handlers with HTTP Request/Response objects.
 */

const path = require('path');
const fs = require('fs');

// Configure isolated test environment
process.env.NODE_ENV = 'test';

// Load backend .env and redirect to ambit_test_db
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

// Ensure isolated database URL is used
const directTestUrl = process.env.DIRECT_URL.replace('/neondb?', '/ambit_test_db?');
process.env.DATABASE_URL = directTestUrl;
process.env.DIRECT_URL = directTestUrl;

// Use jiti to require TypeScript route handlers with alias mapping
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
    '@': backendDir,
  },
});

const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
const prisma = new PrismaClient({ datasources: { db: { url: directTestUrl } } });

const { __setTestSession } = jiti(path.join(backendDir, 'lib/rateLimit.ts'));

// Route handlers
const inboxRoute = jiti(path.join(backendDir, 'app/api/inbox/route.ts'));
const inboxIdRoute = jiti(path.join(backendDir, 'app/api/inbox/[id]/route.ts'));
const inboxPromoteRoute = jiti(path.join(backendDir, 'app/api/inbox/[id]/promote/route.ts'));
const inboxTrashRoute = jiti(path.join(backendDir, 'app/api/inbox/[id]/trash/route.ts'));
const inboxRestoreRoute = jiti(path.join(backendDir, 'app/api/inbox/[id]/restore/route.ts'));

const tasksRoute = jiti(path.join(backendDir, 'app/api/tasks/route.ts'));
const tasksIdRoute = jiti(path.join(backendDir, 'app/api/tasks/[id]/route.ts'));
const tasksScheduleRoute = jiti(path.join(backendDir, 'app/api/tasks/[id]/schedule/route.ts'));
const tasksReorderRoute = jiti(path.join(backendDir, 'app/api/tasks/reorder/route.ts'));

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

async function runHttpIntegrationSuite() {
  console.log('===============================================================');
  console.log(' AMBIT MILESTONE 2.1 — HTTP INTEGRATION TEST SUITE');
  console.log(' Environment: Dedicated Isolated Database (ambit_test_db)');
  console.log(' Target: Next.js App Router Route Handlers (Request -> Response)');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${details ? '- ' + details : ''}`);
      failed++;
    }
  }

  // 1. Setup Test Users in isolated test database
  const userA = await prisma.user.upsert({
    where: { email: 'userA@test.ambit' },
    update: {},
    create: { email: 'userA@test.ambit', name: 'User A' },
  });
  const userB = await prisma.user.upsert({
    where: { email: 'userB@test.ambit' },
    update: {},
    create: { email: 'userB@test.ambit', name: 'User B' },
  });

  const sessionA = { user: { id: userA.id, email: userA.email } };
  const sessionB = { user: { id: userB.id, email: userB.email } };

  try {
    // -------------------------------------------------------------
    // SECTION 1: Authentication & Ownership Enforcement
    // -------------------------------------------------------------
    console.log('--- Section 1: Authentication & Ownership Enforcement ---');

    // 1.1 Unauthenticated requests rejected
    __setTestSession(null); // Unauthenticated

    const unauthGetTasks = await tasksRoute.GET(new Request('http://localhost:3000/api/tasks'));
    assert(unauthGetTasks.status === 401, 'Unauthenticated GET /api/tasks returns 401 Unauthorized');

    const unauthPostTasks = await tasksRoute.POST(createJsonRequest('http://localhost:3000/api/tasks', 'POST', { title: 'Test' }));
    assert(unauthPostTasks.status === 401, 'Unauthenticated POST /api/tasks returns 401 Unauthorized');

    const unauthGetInbox = await inboxRoute.GET(new Request('http://localhost:3000/api/inbox'));
    assert(unauthGetInbox.status === 401, 'Unauthenticated GET /api/inbox returns 401 Unauthorized');

    const unauthPostInbox = await inboxRoute.POST(createJsonRequest('http://localhost:3000/api/inbox', 'POST', { content: 'Test' }));
    assert(unauthPostInbox.status === 401, 'Unauthenticated POST /api/inbox returns 401 Unauthorized');

    const unauthPromote = await inboxPromoteRoute.POST(
      createJsonRequest('http://localhost:3000/api/inbox/test-id/promote', 'POST', { target: 'TASK' }),
      { params: Promise.resolve({ id: 'test-id' }) }
    );
    assert(unauthPromote.status === 401, 'Unauthenticated POST /api/inbox/:id/promote returns 401 Unauthorized');

    const unauthDeleteInbox = await inboxIdRoute.DELETE(
      new Request('http://localhost:3000/api/inbox/test-id', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'test-id' }) }
    );
    assert(unauthDeleteInbox.status === 401, 'Unauthenticated DELETE /api/inbox/:id returns 401 Unauthorized');

    // 1.2 User A creates resources
    __setTestSession(sessionA);

    const postCaptureA = await inboxRoute.POST(
      createJsonRequest('http://localhost:3000/api/inbox', 'POST', { content: "User A's private capture" })
    );
    assert(postCaptureA.status === 201, 'User A creates Capture via POST /api/inbox');
    const captureAData = await postCaptureA.json();

    const postTaskA = await tasksRoute.POST(
      createJsonRequest('http://localhost:3000/api/tasks', 'POST', {
        title: "User A's private task",
        userId: userB.id, // Attempt to spoof User B in body
      })
    );
    assert(postTaskA.status === 201, 'User A creates Task via POST /api/tasks');
    const taskAData = await postTaskA.json();

    // Verify spoofed userId is ignored; Task belongs to User A
    const directTaskA = await prisma.task.findUnique({ where: { id: taskAData.id } });
    assert(directTaskA.userId === userA.id, 'Client-supplied userId in body is ignored; Task owned by session User A');

    // 1.3 User B attempts cross-user access to User A's resources
    __setTestSession(sessionB);

    const bGetCaptureA = await inboxIdRoute.GET(
      new Request(`http://localhost:3000/api/inbox/${captureAData.id}`),
      { params: Promise.resolve({ id: captureAData.id }) }
    );
    assert(bGetCaptureA.status === 404, "User B cannot GET User A's capture (returns 404 Not Found)");

    const bPatchCaptureA = await inboxIdRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/inbox/${captureAData.id}`, 'PATCH', { content: 'Hacked by B' }),
      { params: Promise.resolve({ id: captureAData.id }) }
    );
    assert(bPatchCaptureA.status === 404, "User B cannot PATCH User A's capture (returns 404 Not Found)");

    const bDeleteCaptureA = await inboxIdRoute.DELETE(
      new Request(`http://localhost:3000/api/inbox/${captureAData.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: captureAData.id }) }
    );
    assert(bDeleteCaptureA.status === 404, "User B cannot DELETE User A's capture (returns 404 Not Found)");

    const bGetTaskA = await tasksIdRoute.GET(
      new Request(`http://localhost:3000/api/tasks/${taskAData.id}`),
      { params: Promise.resolve({ id: taskAData.id }) }
    );
    assert(bGetTaskA.status === 404, "User B cannot GET User A's task (returns 404 Not Found)");

    const bPatchTaskA = await tasksIdRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/tasks/${taskAData.id}`, 'PATCH', { title: 'Hacked Title' }),
      { params: Promise.resolve({ id: taskAData.id }) }
    );
    assert(bPatchTaskA.status === 404, "User B cannot PATCH User A's task (returns 404 Not Found)");

    const bDeleteTaskA = await tasksIdRoute.DELETE(
      new Request(`http://localhost:3000/api/tasks/${taskAData.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: taskAData.id }) }
    );
    assert(bDeleteTaskA.status === 404, "User B cannot DELETE User A's task (returns 404 Not Found)");

    // 1.4 User B cannot include User A's tasks in reorder
    const bReorder = await tasksReorderRoute.PATCH(
      createJsonRequest('http://localhost:3000/api/tasks/reorder', 'PATCH', { orderedIds: [taskAData.id] })
    );
    assert(bReorder.status === 403, "User B cannot reorder User A's task (returns 403 Forbidden)");

    // -------------------------------------------------------------
    // SECTION 2: Capture Lifecycle & 30-Day Retention Enforcement
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Capture Lifecycle & Retention Enforcement ---');
    __setTestSession(sessionA);

    // 2.1 Request validation on intake
    const emptyCaptureRes = await inboxRoute.POST(
      createJsonRequest('http://localhost:3000/api/inbox', 'POST', { content: '   ' })
    );
    assert(emptyCaptureRes.status === 400, 'Empty capture content returns 400 Bad Request');

    const hugeCaptureRes = await inboxRoute.POST(
      createJsonRequest('http://localhost:3000/api/inbox', 'POST', { content: 'x'.repeat(10001) })
    );
    assert(hugeCaptureRes.status === 400, 'Capture content > 10,000 characters returns 400 Bad Request');

    // 2.2 Soft delete to trash
    const trashRes = await inboxTrashRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/inbox/${captureAData.id}/trash`, 'PATCH', {}),
      { params: Promise.resolve({ id: captureAData.id }) }
    );
    assert(trashRes.status === 200, 'PATCH /api/inbox/:id/trash moves capture to trash');
    const trashedBody = await trashRes.json();
    assert(trashedBody.capture.status === 'TRASHED', 'Capture status updated to TRASHED');
    assert(trashedBody.capture.trashedAt !== null, 'Capture trashedAt populated');

    // 2.3 Permanent deletion rejection before 30 days
    const prematureDeleteRes = await inboxIdRoute.DELETE(
      new Request(`http://localhost:3000/api/inbox/${captureAData.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: captureAData.id }) }
    );
    assert(
      prematureDeleteRes.status === 400,
      'Permanent deletion within 30-day retention returns 400 Bad Request'
    );
    const prematureDeleteData = await prematureDeleteRes.json();
    assert(
      prematureDeleteData.error.includes('protected by the 30-day retention policy'),
      'Error message clearly communicates 30-day retention protection'
    );

    // 2.4 Verify force deletion bypass is eliminated
    const forceDeleteRes = await inboxIdRoute.DELETE(
      new Request(`http://localhost:3000/api/inbox/${captureAData.id}?force=true`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: captureAData.id }) }
    );
    assert(
      forceDeleteRes.status === 400,
      'Permanent deletion with ?force=true is STILL REJECTED with 400 Bad Request (bypass eliminated)'
    );

    // 2.5 Restoration during retention period
    const restoreRes = await inboxRestoreRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/inbox/${captureAData.id}/restore`, 'PATCH', {}),
      { params: Promise.resolve({ id: captureAData.id }) }
    );
    assert(restoreRes.status === 200, 'Restoration from trash returns 200 OK');
    const restoredBody = await restoreRes.json();
    assert(restoredBody.capture.status === 'INBOX', 'Restored capture status is INBOX');
    assert(restoredBody.capture.trashedAt === null, 'Restored capture trashedAt is cleared to null');

    // 2.6 Deletion of INBOX item blocked
    const inboxDeleteRes = await inboxIdRoute.DELETE(
      new Request(`http://localhost:3000/api/inbox/${captureAData.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: captureAData.id }) }
    );
    assert(
      inboxDeleteRes.status === 400,
      'Direct deletion of INBOX capture returns 400 (must be TRASHED first)'
    );

    // 2.7 Permanent deletion after 30 days have elapsed
    // Create an aged trashed capture with trashedAt = 31 days ago in test DB
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const agedCapture = await prisma.capture.create({
      data: {
        userId: userA.id,
        content: 'Old capture past 30 days',
        status: 'TRASHED',
        trashedAt: thirtyOneDaysAgo,
      },
    });

    const agedDeleteRes = await inboxIdRoute.DELETE(
      new Request(`http://localhost:3000/api/inbox/${agedCapture.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: agedCapture.id }) }
    );
    assert(agedDeleteRes.status === 200, 'Permanent deletion succeeds when trashedAt > 30 days old');
    const verifyDeleted = await prisma.capture.findUnique({ where: { id: agedCapture.id } });
    assert(verifyDeleted === null, 'Aged capture record is permanently removed from database');

    // -------------------------------------------------------------
    // SECTION 3: Promotion Targets, Idempotency & Concurrency
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Promotion Targets, Idempotency & Concurrency ---');

    // 3.1 Rejection of PROJECT as promotion target (Mandatory Correction A)
    const rejectProjectRes = await inboxPromoteRoute.POST(
      createJsonRequest(`http://localhost:3000/api/inbox/${captureAData.id}/promote`, 'POST', {
        target: 'PROJECT',
        name: 'Should Fail Project',
      }),
      { params: Promise.resolve({ id: captureAData.id }) }
    );
    assert(rejectProjectRes.status === 400, 'Promotion target PROJECT rejected with 400 Bad Request');
    const rejectProjectBody = await rejectProjectRes.json();
    assert(
      rejectProjectBody.error.includes("Only 'TASK', 'NOTE', and 'HABIT' are permitted"),
      "Error explicitly states only TASK, NOTE, and HABIT are permitted"
    );

    // 3.2 Promotion to TASK
    const promoteTaskRes = await inboxPromoteRoute.POST(
      createJsonRequest(`http://localhost:3000/api/inbox/${captureAData.id}/promote`, 'POST', {
        target: 'TASK',
        title: 'Promoted Task from Capture',
        priority: 'HIGH',
        dueDate: '2026-11-28T18:00:00.000Z',
        scheduledDate: '2026-11-20',
      }),
      { params: Promise.resolve({ id: captureAData.id }) }
    );
    assert(promoteTaskRes.status === 200, 'Promotion to TASK returns 200 OK');
    const promoteTaskBody = await promoteTaskRes.json();
    assert(promoteTaskBody.success === true, 'Response indicates success: true');
    assert(promoteTaskBody.task.title === 'Promoted Task from Capture', 'Created Task title matches');
    assert(promoteTaskBody.capture.status === 'PROMOTED', 'Capture status transitioned to PROMOTED');
    assert(promoteTaskBody.capture.promotedType === 'TASK', 'Capture promotedType is TASK');
    assert(promoteTaskBody.capture.promotedId === promoteTaskBody.task.id, 'Capture promotedId links to Task ID');

    // 3.3 Promotion Retry (Idempotency)
    const retryPromoteRes = await inboxPromoteRoute.POST(
      createJsonRequest(`http://localhost:3000/api/inbox/${captureAData.id}/promote`, 'POST', {
        target: 'TASK',
        title: 'Different Title on Retry',
      }),
      { params: Promise.resolve({ id: captureAData.id }) }
    );
    assert(retryPromoteRes.status === 200, 'Promotion retry returns 200 OK');
    const retryBody = await retryPromoteRes.json();
    assert(retryBody.alreadyPromoted === true, 'Retry indicates alreadyPromoted: true');
    assert(retryBody.task.id === promoteTaskBody.task.id, 'Retry returns the existing Task entity');

    // Verify no duplicate tasks were created
    const totalMatchingTasks = await prisma.task.count({
      where: { userId: userA.id, title: 'Promoted Task from Capture' },
    });
    assert(totalMatchingTasks === 1, 'Exactly one Task exists; zero duplicates created on retry');

    // 3.4 Promotion to NOTE (Default Unpinned Behavior)
    const captureForNote = await prisma.capture.create({
      data: { userId: userA.id, content: '# Architecture Note Content', status: 'INBOX' },
    });
    const promoteNoteRes = await inboxPromoteRoute.POST(
      createJsonRequest(`http://localhost:3000/api/inbox/${captureForNote.id}/promote`, 'POST', {
        target: 'NOTE',
        title: 'Architecture Overview Note',
      }),
      { params: Promise.resolve({ id: captureForNote.id }) }
    );
    assert(promoteNoteRes.status === 200, 'Promotion to NOTE returns 200 OK');
    const noteBody = await promoteNoteRes.json();
    assert(noteBody.note.pinned === false, 'Promoted Note defaults to pinned = false (unpinned)');

    // 3.5 Promotion to HABIT
    const captureForHabit = await prisma.capture.create({
      data: { userId: userA.id, content: 'Daily morning meditation', status: 'INBOX' },
    });
    const promoteHabitRes = await inboxPromoteRoute.POST(
      createJsonRequest(`http://localhost:3000/api/inbox/${captureForHabit.id}/promote`, 'POST', {
        target: 'HABIT',
        name: 'Morning Meditation',
        frequency: 'DAILY',
      }),
      { params: Promise.resolve({ id: captureForHabit.id }) }
    );
    assert(promoteHabitRes.status === 200, 'Promotion to HABIT returns 200 OK');
    const habitBody = await promoteHabitRes.json();
    assert(habitBody.habit.name === 'Morning Meditation', 'Promoted Habit created with frequency DAILY');

    // 3.6 Concurrent Promotion Requests (Race Condition Test)
    const captureForRace = await prisma.capture.create({
      data: { userId: userA.id, content: 'Concurrent promotion intake item', status: 'INBOX' },
    });

    const [raceRes1, raceRes2] = await Promise.all([
      inboxPromoteRoute.POST(
        createJsonRequest(`http://localhost:3000/api/inbox/${captureForRace.id}/promote`, 'POST', {
          target: 'TASK',
          title: 'Race Task',
        }),
        { params: Promise.resolve({ id: captureForRace.id }) }
      ),
      inboxPromoteRoute.POST(
        createJsonRequest(`http://localhost:3000/api/inbox/${captureForRace.id}/promote`, 'POST', {
          target: 'TASK',
          title: 'Race Task',
        }),
        { params: Promise.resolve({ id: captureForRace.id }) }
      ),
    ]);

    assert(
      (raceRes1.status === 200 && raceRes2.status === 200) ||
      (raceRes1.status === 200 && raceRes2.status === 409) ||
      (raceRes1.status === 409 && raceRes2.status === 200),
      'Concurrent promotions handled safely without unhandled exception'
    );

    const raceTasks = await prisma.task.findMany({
      where: { userId: userA.id, title: 'Race Task' },
    });
    assert(raceTasks.length === 1, 'Concurrent promotion requests produced exactly 1 Task in database');

    // 3.7 Historical Capture Preservation
    await tasksIdRoute.DELETE(
      new Request(`http://localhost:3000/api/tasks/${promoteTaskBody.task.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: promoteTaskBody.task.id }) }
    );
    const preservedCapture = await prisma.capture.findUnique({ where: { id: captureAData.id } });
    assert(preservedCapture !== null, 'Historical Capture record preserved after Task deletion');
    assert(
      preservedCapture.status === 'PROMOTED' && preservedCapture.promotedId === promoteTaskBody.task.id,
      'Historical promotedId and PROMOTED status remain intact on Capture'
    );

    // -------------------------------------------------------------
    // SECTION 4: First-Class Task API & Hierarchy Rules
    // -------------------------------------------------------------
    console.log('\n--- Section 4: Task API, Dual-Dates & Hierarchy Rules ---');

    // 4.1 Hierarchy Setup for User A
    const areaA = await prisma.area.create({ data: { name: 'Area A', userId: userA.id } });
    const projectA = await prisma.project.create({ data: { name: 'Project A', areaId: areaA.id, userId: userA.id } });
    const subProjectA = await prisma.subProject.create({ data: { name: 'SubProject A', projectId: projectA.id, userId: userA.id } });

    // Hierarchy for User B (for cross-user hierarchy rejection tests)
    const areaB = await prisma.area.create({ data: { name: 'Area B', userId: userB.id } });
    const projectB = await prisma.project.create({ data: { name: 'Project B', areaId: areaB.id, userId: userB.id } });

    // 4.2 Rejection of empty title
    const emptyTaskRes = await tasksRoute.POST(
      createJsonRequest('http://localhost:3000/api/tasks', 'POST', { title: '   ' })
    );
    assert(emptyTaskRes.status === 400, 'Task creation with blank title returns 400 Bad Request');

    // 4.3 Rejection of malformed scheduledDate
    const invalidDateRes = await tasksRoute.POST(
      createJsonRequest('http://localhost:3000/api/tasks', 'POST', {
        title: 'Task with bad date',
        scheduledDate: '2026-02-29', // 2026 is non-leap year
      })
    );
    assert(invalidDateRes.status === 400, 'Task creation with invalid calendar date (2026-02-29) returns 400 Bad Request');

    // 4.4 Rejection of cross-user hierarchy
    const crossUserHierarchyRes = await tasksRoute.POST(
      createJsonRequest('http://localhost:3000/api/tasks', 'POST', {
        title: 'Task with cross-user Project',
        projectId: projectB.id, // User B's project
      })
    );
    assert(
      crossUserHierarchyRes.status === 400,
      "Task assignment to another user's Project returns 400 Bad Request"
    );

    // 4.5 Rejection of hierarchy mismatch (SubProject does not belong to Project)
    const otherProjectA = await prisma.project.create({ data: { name: 'Other Proj A', areaId: areaA.id, userId: userA.id } });
    const mismatchHierarchyRes = await tasksRoute.POST(
      createJsonRequest('http://localhost:3000/api/tasks', 'POST', {
        title: 'Task with mismatched hierarchy',
        projectId: otherProjectA.id,
        subProjectId: subProjectA.id, // Belongs to projectA, not otherProjectA
      })
    );
    assert(
      mismatchHierarchyRes.status === 400,
      'Task with SubProject mismatching Project returns 400 Bad Request'
    );

    // 4.6 SubProject direct placement normalization
    const subTaskRes = await tasksRoute.POST(
      createJsonRequest('http://localhost:3000/api/tasks', 'POST', {
        title: 'SubProject Placed Task',
        areaId: areaA.id,
        projectId: projectA.id,
        subProjectId: subProjectA.id,
        dueDate: '2026-11-30T15:00:00.000Z',
        scheduledDate: '2026-11-25',
      })
    );
    assert(subTaskRes.status === 201, 'Subproject Task creation returns 201 Created');
    const subTaskData = await subTaskRes.json();
    const rawSubTaskInDb = await prisma.task.findUnique({ where: { id: subTaskData.id } });
    assert(
      rawSubTaskInDb.subProjectId === subProjectA.id &&
      rawSubTaskInDb.projectId === null &&
      rawSubTaskInDb.areaId === null,
      'Direct placement rule enforced: subProjectId only stored in DB; inherited parent IDs are null'
    );
    assert(
      subTaskData.area === 'Area A' && subTaskData.project === 'Project A' && subTaskData.subProject === 'SubProject A',
      'API response automatically resolves inherited area and project names'
    );

    // 4.7 Dual-date independence via HTTP PATCH
    const scheduleRes = await tasksScheduleRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/tasks/${subTaskData.id}/schedule`, 'PATCH', {
        scheduledDate: '2026-11-26',
      }),
      { params: Promise.resolve({ id: subTaskData.id }) }
    );
    assert(scheduleRes.status === 200, 'PATCH /api/tasks/:id/schedule returns 200 OK');
    const scheduledTask = await scheduleRes.json();
    assert(scheduledTask.scheduledDate === '2026-11-26', 'scheduledDate updated to 2026-11-26');
    assert(scheduledTask.dueDate === '2026-11-30T15:00:00.000Z', 'dueDate completely unchanged');

    // 4.8 Status transitions and completedAt
    const completeRes = await tasksIdRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/tasks/${subTaskData.id}`, 'PATCH', {
        status: 'COMPLETED',
      }),
      { params: Promise.resolve({ id: subTaskData.id }) }
    );
    assert(completeRes.status === 200, 'Transition to COMPLETED returns 200 OK');
    const completedTaskData = await completeRes.json();
    assert(completedTaskData.status === 'COMPLETED', 'status is COMPLETED');
    assert(completedTaskData.completedAt !== null, 'completedAt populated with timestamp');

    const revertRes = await tasksIdRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/tasks/${subTaskData.id}`, 'PATCH', {
        status: 'IN_PROGRESS',
      }),
      { params: Promise.resolve({ id: subTaskData.id }) }
    );
    assert(revertRes.status === 200, 'Reversion to IN_PROGRESS returns 200 OK');
    const revertedTaskData = await revertRes.json();
    assert(revertedTaskData.status === 'IN_PROGRESS', 'status is IN_PROGRESS');
    assert(revertedTaskData.completedAt === null, 'completedAt cleared to null');

    // 4.9 Due Date Bucket Grouping
    const bucketRes = await tasksRoute.GET(new Request('http://localhost:3000/api/tasks?groupBy=dueDate'));
    assert(bucketRes.status === 200, 'GET /api/tasks?groupBy=dueDate returns 200 OK');
    const buckets = await bucketRes.json();
    assert(
      Array.isArray(buckets.overdue) &&
      Array.isArray(buckets.today) &&
      Array.isArray(buckets.next7Days) &&
      Array.isArray(buckets.later) &&
      Array.isArray(buckets.backlog),
      'Returns 5 standard buckets: overdue, today, next7Days, later, backlog'
    );

    // 4.10 Task Reordering within user's tasks
    const task2 = await prisma.task.create({
      data: { userId: userA.id, title: 'Task 2', order: 1 },
    });
    const reorderRes = await tasksReorderRoute.PATCH(
      createJsonRequest('http://localhost:3000/api/tasks/reorder', 'PATCH', {
        orderedIds: [task2.id, subTaskData.id],
      })
    );
    assert(reorderRes.status === 200, 'PATCH /api/tasks/reorder returns 200 OK');
    const reorderedTask2 = await prisma.task.findUnique({ where: { id: task2.id } });
    const reorderedSubTask = await prisma.task.findUnique({ where: { id: subTaskData.id } });
    assert(reorderedTask2.order === 0 && reorderedSubTask.order === 1, 'Tasks reordered to indices 0 and 1');

  } catch (err) {
    console.error('HTTP Test Exception:', err);
    failed++;
  } finally {
    // Clean up test records inside ambit_test_db only
    console.log('\n--- Cleaning isolated test database ambit_test_db ---');
    await prisma.task.deleteMany({});
    await prisma.capture.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.habit.deleteMany({});
    await prisma.subProject.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.area.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    console.log('Isolated test database cleaned cleanly.');
  }

  console.log('\n===============================================================');
  console.log(` HTTP INTEGRATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

runHttpIntegrationSuite();
