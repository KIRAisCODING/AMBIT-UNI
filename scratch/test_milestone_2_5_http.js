/**
 * AMBIT Milestone 2.5 HTTP Integration Test Suite
 * Executes against dedicated isolated database: ambit_test_db
 * Tests Projects & Areas Hierarchy API, cascading deletion/preservation engine,
 * transactional subproject promotion, strict Area emptiness guardrails, and cross-user security.
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
    '@/lib/deleteHierarchy': path.join(backendDir, 'lib/deleteHierarchy.ts'),
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

// Route handlers
const areasRoute = jiti(path.join(backendDir, 'app/api/areas/route.ts'));
const areasIdRoute = jiti(path.join(backendDir, 'app/api/areas/[id]/route.ts'));
const projectsRoute = jiti(path.join(backendDir, 'app/api/projects/route.ts'));
const projectsIdRoute = jiti(path.join(backendDir, 'app/api/projects/[id]/route.ts'));
const subprojectsRoute = jiti(path.join(backendDir, 'app/api/subprojects/route.ts'));
const subprojectsIdRoute = jiti(path.join(backendDir, 'app/api/subprojects/[id]/route.ts'));
const sidebarRoute = jiti(path.join(backendDir, 'app/api/sidebar/route.ts'));

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

async function runMilestone25Suite() {
  console.log('========================================================================');
  console.log(' AMBIT MILESTONE 2.5 — PROJECTS & AREAS HIERARCHY INTEGRATION SUITE');
  console.log(' Environment: Dedicated Isolated Database (ambit_test_db)');
  console.log(' Target: Areas CRUD & Emptiness Guardrail, Projects & Cascading Policies,');
  console.log('         Subproject Promotion, and Cross-User Security');
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
      where: { email: 'hier_tester_a@ambit.local' },
      update: {},
      create: {
        id: 'user_hier_a_' + Date.now(),
        email: 'hier_tester_a@ambit.local',
        name: 'Hierarchy Tester A',
      },
    });

    const userB = await prisma.user.upsert({
      where: { email: 'hier_tester_b@ambit.local' },
      update: {},
      create: {
        id: 'user_hier_b_' + Date.now(),
        email: 'hier_tester_b@ambit.local',
        name: 'Hierarchy Tester B',
      },
    });

    console.log(`Test User A ID: ${userA.id}`);
    console.log(`Test User B ID: ${userB.id}\n`);

    // Clean up test data for both users
    async function cleanUserData(userId) {
      await prisma.habitLog.deleteMany({ where: { userId } });
      await prisma.task.deleteMany({ where: { userId } });
      await prisma.note.deleteMany({ where: { userId } });
      await prisma.habit.deleteMany({ where: { userId } });
      await prisma.subProject.deleteMany({ where: { userId } });
      await prisma.project.deleteMany({ where: { userId } });
      await prisma.area.deleteMany({ where: { userId } });
    }

    await cleanUserData(userA.id);
    await cleanUserData(userB.id);

    // ========================================================================
    // SUITE 1: AREA LIFECYCLE, ORDERING, AND ARCHIVAL
    // ========================================================================
    console.log('--- SUITE 1: Area Lifecycle, Ordering & Archival ---');
    __setTestSession({ user: { id: userA.id, email: userA.email } });

    // 1.1 Create Area 1 with full fields
    const resA1 = await areasRoute.POST(
      createJsonRequest('http://localhost/api/areas', 'POST', {
        name: 'Health & Fitness',
        description: 'Physical fitness and nutrition',
        icon: 'Heart',
        order: 2,
      })
    );
    assert(resA1.status === 201, '1.1 POST /api/areas returns 201');
    const areaA1 = await resA1.json();
    assert(areaA1.name === 'Health & Fitness', '1.1 Area name matches');
    assert(areaA1.icon === 'Heart', '1.1 Area icon matches');
    assert(areaA1.order === 2, '1.1 Area order matches');

    // 1.2 Create Area 2 with lower order (should sort before Area 1)
    const resA2 = await areasRoute.POST(
      createJsonRequest('http://localhost/api/areas', 'POST', {
        name: 'Career & Work',
        description: 'Professional engineering',
        icon: 'Briefcase',
        order: 1,
      })
    );
    const areaA2 = await resA2.json();

    // 1.3 Verify GET /api/areas returns deterministic order (order 1 then order 2)
    const resGetAreas = await areasRoute.GET(
      createJsonRequest('http://localhost/api/areas', 'GET')
    );
    assert(resGetAreas.status === 200, '1.3 GET /api/areas returns 200');
    const areasList = await resGetAreas.json();
    assert(areasList.length === 2, '1.3 Exactly 2 areas returned');
    assert(areasList[0].name === 'Career & Work', '1.3 Area sorted first by order: 1');
    assert(areasList[1].name === 'Health & Fitness', '1.3 Area sorted second by order: 2');

    // 1.4 Update Area metadata via PATCH /api/areas/:id
    const resPatchArea = await areasIdRoute.PATCH(
      createJsonRequest(`http://localhost/api/areas/${areaA1.id}`, 'PATCH', {
        name: 'Health, Longevity & Wellness',
        description: 'Comprehensive health domain',
        icon: 'Activity',
      }),
      { params: Promise.resolve({ id: areaA1.id }) }
    );
    assert(resPatchArea.status === 200, '1.4 PATCH /api/areas/:id returns 200');
    const updatedA1 = await resPatchArea.json();
    assert(updatedA1.name === 'Health, Longevity & Wellness', '1.4 Name updated');
    assert(updatedA1.icon === 'Activity', '1.4 Icon updated');

    // 1.5 Archive Area
    const resArchiveArea = await areasIdRoute.PATCH(
      createJsonRequest(`http://localhost/api/areas/${areaA1.id}`, 'PATCH', {
        archived: true,
      }),
      { params: Promise.resolve({ id: areaA1.id }) }
    );
    assert(resArchiveArea.status === 200, '1.5 Area archived');
    const archivedA1 = await resArchiveArea.json();
    assert(archivedA1.archivedAt !== null, '1.5 archivedAt is populated');

    // 1.6 Verify default GET excludes archived, includeArchived includes it
    const resGetActiveOnly = await areasRoute.GET(
      createJsonRequest('http://localhost/api/areas', 'GET')
    );
    const activeOnly = await resGetActiveOnly.json();
    assert(activeOnly.length === 1 && activeOnly[0].id === areaA2.id, '1.6 Default GET excludes archived Area');

    const resGetAll = await areasRoute.GET(
      createJsonRequest('http://localhost/api/areas?includeArchived=true', 'GET')
    );
    const allAreas = await resGetAll.json();
    assert(allAreas.length === 2, '1.6 ?includeArchived=true returns both active and archived');

    // 1.7 Unarchive Area
    const resUnarchive = await areasIdRoute.PATCH(
      createJsonRequest(`http://localhost/api/areas/${areaA1.id}`, 'PATCH', {
        archived: false,
      }),
      { params: Promise.resolve({ id: areaA1.id }) }
    );
    const unarchivedA1 = await resUnarchive.json();
    assert(unarchivedA1.archivedAt === null, '1.7 Area unarchived');

    // ========================================================================
    // SUITE 2: AREA DELETION EMPTINESS GUARDRAIL (Decision 02)
    // ========================================================================
    console.log('\n--- SUITE 2: Area Deletion Emptiness Guardrail ---');

    // 2.1 Block deletion when containing a Project
    const projGuard = await prisma.project.create({
      data: {
        userId: userA.id,
        areaId: areaA1.id,
        name: 'Marathon 2026',
      },
    });

    const resDelBlockedByProject = await areasIdRoute.DELETE(
      createJsonRequest(`http://localhost/api/areas/${areaA1.id}`, 'DELETE'),
      { params: Promise.resolve({ id: areaA1.id }) }
    );
    assert(resDelBlockedByProject.status === 409, '2.1 DELETE blocked with 409 Conflict when Project exists');
    const blockedBody1 = await resDelBlockedByProject.json();
    assert(blockedBody1.code === 'AREA_NOT_EMPTY', '2.1 Rejection code is AREA_NOT_EMPTY');
    assert(blockedBody1.counts.projects === 1, '2.1 Accurately reports 1 project');

    // Clean up project
    await prisma.project.delete({ where: { id: projGuard.id } });

    // 2.2 Block deletion when containing a direct Task
    const taskGuard = await prisma.task.create({
      data: {
        userId: userA.id,
        areaId: areaA1.id,
        title: 'Direct Maintenance Task',
      },
    });

    const resDelBlockedByTask = await areasIdRoute.DELETE(
      createJsonRequest(`http://localhost/api/areas/${areaA1.id}`, 'DELETE'),
      { params: Promise.resolve({ id: areaA1.id }) }
    );
    assert(resDelBlockedByTask.status === 409, '2.2 DELETE blocked with 409 when direct Task exists');
    const blockedBody2 = await resDelBlockedByTask.json();
    assert(blockedBody2.counts.tasks === 1, '2.2 Accurately reports 1 task');

    await prisma.task.delete({ where: { id: taskGuard.id } });

    // 2.3 Block deletion when containing a direct Note
    const noteGuard = await prisma.note.create({
      data: {
        userId: userA.id,
        areaId: areaA1.id,
        title: 'Area Health SOP',
        content: 'Baseline metrics',
      },
    });

    const resDelBlockedByNote = await areasIdRoute.DELETE(
      createJsonRequest(`http://localhost/api/areas/${areaA1.id}`, 'DELETE'),
      { params: Promise.resolve({ id: areaA1.id }) }
    );
    assert(resDelBlockedByNote.status === 409, '2.3 DELETE blocked with 409 when direct Note exists');
    const blockedBody3 = await resDelBlockedByNote.json();
    assert(blockedBody3.counts.notes === 1, '2.3 Accurately reports 1 note');

    await prisma.note.delete({ where: { id: noteGuard.id } });

    // 2.4 Block deletion when containing a Habit
    const habitGuard = await prisma.habit.create({
      data: {
        userId: userA.id,
        areaId: areaA1.id,
        name: 'Morning Hydration',
      },
    });

    const resDelBlockedByHabit = await areasIdRoute.DELETE(
      createJsonRequest(`http://localhost/api/areas/${areaA1.id}`, 'DELETE'),
      { params: Promise.resolve({ id: areaA1.id }) }
    );
    assert(resDelBlockedByHabit.status === 409, '2.4 DELETE blocked with 409 when Habit exists');
    const blockedBody4 = await resDelBlockedByHabit.json();
    assert(blockedBody4.counts.habits === 1, '2.4 Accurately reports 1 habit');

    await prisma.habit.delete({ where: { id: habitGuard.id } });

    // 2.5 Delete empty Area successfully
    const resDelEmpty = await areasIdRoute.DELETE(
      createJsonRequest(`http://localhost/api/areas/${areaA1.id}`, 'DELETE'),
      { params: Promise.resolve({ id: areaA1.id }) }
    );
    assert(resDelEmpty.status === 200, '2.5 DELETE returns 200 on completely empty Area');
    const delResult = await resDelEmpty.json();
    assert(delResult.success === true, '2.5 Success: true returned');

    const areaCheck = await prisma.area.findUnique({ where: { id: areaA1.id } });
    assert(areaCheck === null, '2.5 Area permanently deleted from database');

    // ========================================================================
    // SUITE 3: PROJECT LIFECYCLE, STATUS & COMPLETION
    // ========================================================================
    console.log('\n--- SUITE 3: Project Lifecycle, Status & Completion ---');

    // 3.1 Create Project under active Area
    const resProjCreate = await projectsRoute.POST(
      createJsonRequest('http://localhost/api/projects', 'POST', {
        name: 'AMBIT Redesign 2.0',
        areaId: areaA2.id,
        description: 'Complete architecture overhaul',
        targetDate: '2026-12-31T00:00:00.000Z',
        order: 1,
      })
    );
    assert(resProjCreate.status === 201, '3.1 POST /api/projects returns 201');
    const project1 = await resProjCreate.json();
    assert(project1.name === 'AMBIT Redesign 2.0', '3.1 Project name matches');
    assert(project1.status === 'ACTIVE', '3.1 Default status is ACTIVE');

    // 3.2 Reject Project creation in archived Area
    const archivedAreaTest = await prisma.area.create({
      data: {
        userId: userA.id,
        name: 'Archived Domain',
        archivedAt: new Date(),
      },
    });

    const resProjUnderArchived = await projectsRoute.POST(
      createJsonRequest('http://localhost/api/projects', 'POST', {
        name: 'Forbidden Project',
        areaId: archivedAreaTest.id,
      })
    );
    assert(resProjUnderArchived.status === 400, '3.2 Rejects project creation under archived Area with 400 Bad Request');
    const rejArchivedArea = await resProjUnderArchived.json();
    assert(rejArchivedArea.error.includes('archived Area'), '3.2 Error mentions archived Area');

    // 3.3 Status transition to COMPLETED sets completedAt automatically
    const resCompleteProj = await projectsIdRoute.PATCH(
      createJsonRequest(`http://localhost/api/projects/${project1.id}`, 'PATCH', {
        status: 'COMPLETED',
      }),
      { params: Promise.resolve({ id: project1.id }) }
    );
    assert(resCompleteProj.status === 200, '3.3 Status transition returns 200');
    const completedProj = await resCompleteProj.json();
    assert(completedProj.status === 'COMPLETED', '3.3 Project status is COMPLETED');
    assert(completedProj.completedAt !== null, '3.3 completedAt automatically timestamped');

    // 3.4 Revert status to ACTIVE clears completedAt
    const resRevertProj = await projectsIdRoute.PATCH(
      createJsonRequest(`http://localhost/api/projects/${project1.id}`, 'PATCH', {
        status: 'ACTIVE',
      }),
      { params: Promise.resolve({ id: project1.id }) }
    );
    const revertedProj = await resRevertProj.json();
    assert(revertedProj.status === 'ACTIVE', '3.4 Project status reverted to ACTIVE');
    assert(revertedProj.completedAt === null, '3.4 completedAt cleared to null');

    // 3.5 Independent Archival: archiving leaves status intact
    const resArchiveProj = await projectsIdRoute.PATCH(
      createJsonRequest(`http://localhost/api/projects/${project1.id}`, 'PATCH', {
        archived: true,
      }),
      { params: Promise.resolve({ id: project1.id }) }
    );
    const archivedProj = await resArchiveProj.json();
    assert(archivedProj.archivedAt !== null, '3.5 Project archived');
    assert(archivedProj.status === 'ACTIVE', '3.5 Project status remains ACTIVE despite archival');

    // Unarchive project for subsequent tests
    await projectsIdRoute.PATCH(
      createJsonRequest(`http://localhost/api/projects/${project1.id}`, 'PATCH', {
        archived: false,
      }),
      { params: Promise.resolve({ id: project1.id }) }
    );

    // 3.6 GET /api/projects/:id with progress metrics
    await prisma.task.create({
      data: {
        userId: userA.id,
        projectId: project1.id,
        title: 'Finished Task',
        status: TaskStatus.COMPLETED,
      },
    });
    await prisma.task.create({
      data: {
        userId: userA.id,
        projectId: project1.id,
        title: 'Open Task',
        status: TaskStatus.TODO,
      },
    });

    const resGetSingleProj = await projectsIdRoute.GET(
      createJsonRequest(`http://localhost/api/projects/${project1.id}`, 'GET'),
      { params: Promise.resolve({ id: project1.id }) }
    );
    assert(resGetSingleProj.status === 200, '3.6 GET /api/projects/:id returns 200');
    const singleProjData = await resGetSingleProj.json();
    assert(singleProjData.progress.hasTasks === true, '3.6 Progress reports hasTasks: true');
    assert(singleProjData.progress.totalCount === 2, '3.6 Total tasks count: 2');
    assert(singleProjData.progress.completedCount === 1, '3.6 Completed tasks count: 1');
    assert(singleProjData.progress.progressPct === 50, '3.6 Progress percentage: 50%');

    // ========================================================================
    // SUITE 4: PROJECT MOVEMENT ACROSS AREAS
    // ========================================================================
    console.log('\n--- SUITE 4: Project Movement Across Areas ---');

    // Create target Area
    const areaA3 = await prisma.area.create({
      data: {
        userId: userA.id,
        name: 'New Department Area',
      },
    });

    // 4.1 Move Project from areaA2 to areaA3
    const resMoveProj = await projectsIdRoute.PATCH(
      createJsonRequest(`http://localhost/api/projects/${project1.id}`, 'PATCH', {
        areaId: areaA3.id,
      }),
      { params: Promise.resolve({ id: project1.id }) }
    );
    assert(resMoveProj.status === 200, '4.1 Move project returns 200');
    const movedProj = await resMoveProj.json();
    assert(movedProj.areaId === areaA3.id, '4.1 Project areaId successfully updated to target area');

    // 4.2 Verify child tasks still point to project
    const childTasks = await prisma.task.findMany({ where: { projectId: project1.id } });
    assert(childTasks.length === 2, '4.2 All child tasks remain attached to project');

    // 4.3 Reject move to archived Area
    const resMoveToArchived = await projectsIdRoute.PATCH(
      createJsonRequest(`http://localhost/api/projects/${project1.id}`, 'PATCH', {
        areaId: archivedAreaTest.id,
      }),
      { params: Promise.resolve({ id: project1.id }) }
    );
    assert(resMoveToArchived.status === 400, '4.3 Reject move to archived Area with 400 Bad Request');

    // ========================================================================
    // SUITE 5: PROJECT DELETION ENGINE (PRESERVE VS DESTRUCTIVE)
    // ========================================================================
    console.log('\n--- SUITE 5: Project Deletion Engine ---');

    // 5.1 Reject deletion when policy is missing
    const resDelNoPolicy = await projectsIdRoute.DELETE(
      createJsonRequest(`http://localhost/api/projects/${project1.id}`, 'DELETE'),
      { params: Promise.resolve({ id: project1.id }) }
    );
    assert(resDelNoPolicy.status === 400, '5.1 Reject DELETE without policy with 400 Bad Request');
    const noPolicyErr = await resDelNoPolicy.json();
    assert(noPolicyErr.error.includes('Explicit deletion policy'), '5.1 Error requires explicit policy');

    // 5.2 PRESERVE Policy: unassigns tasks and notes, deletes project & subprojects
    const projPreserve = await prisma.project.create({
      data: {
        userId: userA.id,
        areaId: areaA3.id,
        name: 'Project to Preserve',
      },
    });

    const subprojPreserve = await prisma.subProject.create({
      data: {
        userId: userA.id,
        projectId: projPreserve.id,
        name: 'Subproject A',
      },
    });

    const taskP1 = await prisma.task.create({
      data: {
        userId: userA.id,
        projectId: projPreserve.id,
        title: 'Direct Project Task',
      },
    });

    const taskP2 = await prisma.task.create({
      data: {
        userId: userA.id,
        subProjectId: subprojPreserve.id,
        title: 'Subproject Task',
      },
    });

    const noteP1 = await prisma.note.create({
      data: {
        userId: userA.id,
        projectId: projPreserve.id,
        title: 'Project Note',
        content: 'Preserved content',
      },
    });

    const habitPreserve = await prisma.habit.create({
      data: {
        userId: userA.id,
        areaId: areaA3.id,
        name: 'Area Habit That Must Survive',
      },
    });

    const resDelPreserve = await projectsIdRoute.DELETE(
      createJsonRequest(`http://localhost/api/projects/${projPreserve.id}?policy=preserve`, 'DELETE'),
      { params: Promise.resolve({ id: projPreserve.id }) }
    );
    assert(resDelPreserve.status === 200, '5.2 DELETE ?policy=preserve returns 200');
    const delPreserveBody = await resDelPreserve.json();
    assert(delPreserveBody.policy === 'preserve', '5.2 Policy executed is preserve');

    // Verify Project and Subproject are deleted
    const checkProjP = await prisma.project.findUnique({ where: { id: projPreserve.id } });
    const checkSubP = await prisma.subProject.findUnique({ where: { id: subprojPreserve.id } });
    assert(checkProjP === null, '5.2 Project row deleted');
    assert(checkSubP === null, '5.2 Subproject row deleted');

    // Verify Tasks are preserved as UNASSIGNED (null hierarchy)
    const checkTaskP1 = await prisma.task.findUnique({ where: { id: taskP1.id } });
    const checkTaskP2 = await prisma.task.findUnique({ where: { id: taskP2.id } });
    assert(checkTaskP1 !== null && checkTaskP1.projectId === null && checkTaskP1.areaId === null, '5.2 Direct Task preserved and unassigned');
    assert(checkTaskP2 !== null && checkTaskP2.subProjectId === null && checkTaskP2.projectId === null, '5.2 Subproject Task preserved and unassigned');

    // Verify Note is preserved as UNASSIGNED
    const checkNoteP1 = await prisma.note.findUnique({ where: { id: noteP1.id } });
    assert(checkNoteP1 !== null && checkNoteP1.projectId === null, '5.2 Note preserved and unassigned');

    // Verify Habit is completely unaffected
    const checkHabitP = await prisma.habit.findUnique({ where: { id: habitPreserve.id } });
    assert(checkHabitP !== null, '5.2 Habit completely unaffected by Project deletion');

    // 5.3 DESTRUCTIVE Policy: deletes tasks, notes, subprojects, and project
    const projDestruct = await prisma.project.create({
      data: {
        userId: userA.id,
        areaId: areaA3.id,
        name: 'Project to Destroy',
      },
    });

    const subprojDestruct = await prisma.subProject.create({
      data: {
        userId: userA.id,
        projectId: projDestruct.id,
        name: 'Subproject D',
      },
    });

    const taskD1 = await prisma.task.create({
      data: {
        userId: userA.id,
        projectId: projDestruct.id,
        title: 'Task D1',
      },
    });

    const noteD1 = await prisma.note.create({
      data: {
        userId: userA.id,
        subProjectId: subprojDestruct.id,
        title: 'Note D1',
        content: 'Doomed content',
      },
    });

    const resDelDestruct = await projectsIdRoute.DELETE(
      createJsonRequest(`http://localhost/api/projects/${projDestruct.id}?policy=destructive`, 'DELETE'),
      { params: Promise.resolve({ id: projDestruct.id }) }
    );
    assert(resDelDestruct.status === 200, '5.3 DELETE ?policy=destructive returns 200');

    // Verify all rows permanently deleted
    const checkProjD = await prisma.project.findUnique({ where: { id: projDestruct.id } });
    const checkSubD = await prisma.subProject.findUnique({ where: { id: subprojDestruct.id } });
    const checkTaskD = await prisma.task.findUnique({ where: { id: taskD1.id } });
    const checkNoteD = await prisma.note.findUnique({ where: { id: noteD1.id } });
    assert(checkProjD === null, '5.3 Project destroyed');
    assert(checkSubD === null, '5.3 Subproject destroyed');
    assert(checkTaskD === null, '5.3 Child Task destroyed');
    assert(checkNoteD === null, '5.3 Child Note destroyed');

    // ========================================================================
    // SUITE 6: SUBPROJECT LIFECYCLE & ANTI-NESTING
    // ========================================================================
    console.log('\n--- SUITE 6: Subproject Lifecycle & Anti-Nesting ---');

    // 6.1 Create Subproject under project
    const resCreateSub = await subprojectsRoute.POST(
      createJsonRequest('http://localhost/api/subprojects', 'POST', {
        name: 'Backend API & Routes',
        projectId: project1.id,
        description: 'Server side architecture',
        order: 1,
      })
    );
    assert(resCreateSub.status === 201, '6.1 POST /api/subprojects returns 201');
    const subproj1 = await resCreateSub.json();
    assert(subproj1.name === 'Backend API & Routes', '6.1 Subproject name matches');
    assert(subproj1.projectId === project1.id, '6.1 Subproject projectId matches parent');

    // 6.2 Reject Subproject under archived Project
    const projArchivedTest = await prisma.project.create({
      data: {
        userId: userA.id,
        areaId: areaA3.id,
        name: 'Archived Project Initiatve',
        archivedAt: new Date(),
      },
    });

    const resSubUnderArchived = await subprojectsRoute.POST(
      createJsonRequest('http://localhost/api/subprojects', 'POST', {
        name: 'Illegal Subproject',
        projectId: projArchivedTest.id,
      })
    );
    assert(resSubUnderArchived.status === 400, '6.2 Reject subproject in archived project with 400 Bad Request');

    // 6.3 Update Subproject metadata
    const resPatchSub = await subprojectsIdRoute.PATCH(
      createJsonRequest(`http://localhost/api/subprojects/${subproj1.id}`, 'PATCH', {
        name: 'Core Backend API Overhaul',
      }),
      { params: Promise.resolve({ id: subproj1.id }) }
    );
    assert(resPatchSub.status === 200, '6.3 PATCH /api/subprojects/:id returns 200');
    const patchedSub = await resPatchSub.json();
    assert(patchedSub.name === 'Core Backend API Overhaul', '6.3 Subproject name updated');

    // ========================================================================
    // SUITE 7: SUBPROJECT DELETION ENGINE (TRANSACTIONAL PROMOTION)
    // ========================================================================
    console.log('\n--- SUITE 7: Subproject Deletion Engine (Transactional Promotion) ---');

    // Add Tasks and Notes to subproj1
    const subTask1 = await prisma.task.create({
      data: {
        userId: userA.id,
        subProjectId: subproj1.id,
        title: 'Subproject Task 1',
      },
    });
    const subTask2 = await prisma.task.create({
      data: {
        userId: userA.id,
        subProjectId: subproj1.id,
        title: 'Subproject Task 2',
      },
    });
    const subNote1 = await prisma.note.create({
      data: {
        userId: userA.id,
        subProjectId: subproj1.id,
        title: 'Subproject Architecture Note',
        content: 'Transactional promotion proof',
      },
    });

    // 7.1 Delete Subproject
    const resDelSub = await subprojectsIdRoute.DELETE(
      createJsonRequest(`http://localhost/api/subprojects/${subproj1.id}`, 'DELETE'),
      { params: Promise.resolve({ id: subproj1.id }) }
    );
    assert(resDelSub.status === 200, '7.1 DELETE /api/subprojects/:id returns 200');
    const delSubBody = await resDelSub.json();
    assert(delSubBody.reassignedToProjectId === project1.id, '7.1 Confirms reassigned to parent project');

    // 7.2 Verify Subproject row is gone
    const checkSubDeleted = await prisma.subProject.findUnique({ where: { id: subproj1.id } });
    assert(checkSubDeleted === null, '7.2 Subproject row deleted');

    // 7.3 Verify Tasks are promoted to parent project
    const checkSubTask1 = await prisma.task.findUnique({ where: { id: subTask1.id } });
    const checkSubTask2 = await prisma.task.findUnique({ where: { id: subTask2.id } });
    assert(checkSubTask1 !== null && checkSubTask1.subProjectId === null && checkSubTask1.projectId === project1.id,
      '7.3 Task 1 promoted: subProjectId=null and projectId=parentProjectId');
    assert(checkSubTask2 !== null && checkSubTask2.subProjectId === null && checkSubTask2.projectId === project1.id,
      '7.3 Task 2 promoted: subProjectId=null and projectId=parentProjectId');

    // 7.4 Verify Note is promoted to parent project
    const checkSubNote1 = await prisma.note.findUnique({ where: { id: subNote1.id } });
    assert(checkSubNote1 !== null && checkSubNote1.subProjectId === null && checkSubNote1.projectId === project1.id,
      '7.4 Note promoted: subProjectId=null and projectId=parentProjectId');

    // ========================================================================
    // SUITE 8: SIDEBAR CONSOLIDATED HIERARCHY
    // ========================================================================
    console.log('\n--- SUITE 8: Sidebar Consolidated Hierarchy ---');

    const resSidebar = await sidebarRoute.GET(
      createJsonRequest('http://localhost/api/sidebar', 'GET')
    );
    assert(resSidebar.status === 200, '8.1 GET /api/sidebar returns 200');
    const sidebarData = await resSidebar.json();
    assert(Array.isArray(sidebarData), '8.1 Sidebar returns array of Areas');
    assert(sidebarData.length >= 1, '8.1 Contains active areas');
    const foundArea = sidebarData.find((a) => a.id === areaA3.id);
    assert(foundArea !== undefined, '8.1 Contains areaA3');
    assert(foundArea.projects.some((p) => p.id === project1.id), '8.1 Area contains project1 in sidebar tree');

    // ========================================================================
    // SUITE 9: CROSS-USER AUTHORIZATION & SECURITY
    // ========================================================================
    console.log('\n--- SUITE 9: Cross-User Security & Isolation ---');
    __setTestSession({ user: { id: userB.id, email: userB.email } });

    // 9.1 User B cannot read User A's Area
    const resCrossGetArea = await areasIdRoute.GET(
      createJsonRequest(`http://localhost/api/areas/${areaA3.id}`, 'GET'),
      { params: Promise.resolve({ id: areaA3.id }) }
    );
    assert(resCrossGetArea.status === 404, '9.1 User B receives 404 attempting to GET User A Area');

    // 9.2 User B cannot mutate User A's Project
    const resCrossPatchProj = await projectsIdRoute.PATCH(
      createJsonRequest(`http://localhost/api/projects/${project1.id}`, 'PATCH', {
        name: 'Hacked by User B',
      }),
      { params: Promise.resolve({ id: project1.id }) }
    );
    assert(resCrossPatchProj.status === 404, '9.2 User B receives 404 attempting to PATCH User A Project');

    // 9.3 User B cannot delete User A's Area
    const resCrossDelArea = await areasIdRoute.DELETE(
      createJsonRequest(`http://localhost/api/areas/${areaA3.id}`, 'DELETE'),
      { params: Promise.resolve({ id: areaA3.id }) }
    );
    assert(resCrossDelArea.status === 404, '9.3 User B receives 404 attempting to DELETE User A Area');

    // 9.4 User B cannot create a Project referencing User A's Area
    const resCrossCreateProj = await projectsRoute.POST(
      createJsonRequest('http://localhost/api/projects', 'POST', {
        name: 'Cross Tenant Project',
        areaId: areaA3.id,
      })
    );
    assert(resCrossCreateProj.status === 404, '9.4 User B cannot attach Project to User A Area (404)');

    // Clean up test data
    console.log('\n--- Cleaning up test records ---');
    await cleanUserData(userA.id);
    await cleanUserData(userB.id);
    console.log('Test data cleaned up successfully.\n');

  } catch (error) {
    console.error('Unexpected test error:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('========================================================================');
  console.log(` MILESTONE 2.5 INTEGRATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestone25Suite();

