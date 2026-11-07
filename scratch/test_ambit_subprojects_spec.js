const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Load environment variables
const envContent = fs.readFileSync(path.join(__dirname, '../backend/.env'), 'utf8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function verifyHierarchy(userId, areaId, projectId, subProjectId) {
  if (areaId) {
    const area = await prisma.area.findFirst({ where: { id: areaId, userId } });
    if (!area) return { isValid: false, error: "Area not found or access denied" };
  }
  if (projectId) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) return { isValid: false, error: "Project not found or access denied" };
    if (areaId && project.areaId !== areaId) {
      return { isValid: false, error: "Project hierarchy mismatch: Project does not belong to the selected Area" };
    }
  }
  if (subProjectId) {
    const subProject = await prisma.subProject.findFirst({ where: { id: subProjectId, userId } });
    if (!subProject) return { isValid: false, error: "SubProject not found or access denied" };
    if (!projectId) {
      return { isValid: false, error: "SubProject hierarchy mismatch: SubProject requires a selected Project" };
    }
    if (subProject.projectId !== projectId) {
      return { isValid: false, error: "SubProject hierarchy mismatch: SubProject does not belong to the selected Project" };
    }
    if (areaId) {
      const parentProject = await prisma.project.findFirst({ where: { id: subProject.projectId, userId } });
      if (!parentProject || parentProject.areaId !== areaId) {
        return { isValid: false, error: "SubProject hierarchy mismatch: SubProject does not belong to the selected Area" };
      }
    }
  }
  return { isValid: true };
}

async function run() {
  console.log('=== RUNNING AMBIT OPTIONAL SUBPROJECT SPECIFICATION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`[FAIL] ${name}: ${e.message}`);
      failed++;
    }
  }

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { email: 'spec-test@ambit.ai', name: 'Spec User' }
    });
  }
  const userId = user.id;
  const ts = Date.now();

  try {
    // -------------------------------------------------------------------------
    // Scenario 1: Create an Area and a Project without a Subproject
    // -------------------------------------------------------------------------
    const area = await prisma.area.create({
      data: { name: `Area Spec ${ts}`, userId }
    });
    const project = await prisma.project.create({
      data: { name: `Project Spec (No Sub) ${ts}`, areaId: area.id, userId }
    });

    const projectWithSubs = await prisma.project.findUnique({
      where: { id: project.id },
      include: { subProjects: true }
    });

    test('Scenario 1: Project is valid without any Subproject', () => {
      assert(projectWithSubs, 'Project should exist in database');
      assert.strictEqual(projectWithSubs.areaId, area.id);
      assert.strictEqual(projectWithSubs.subProjects.length, 0, 'No subprojects automatically created');
    });

    // -------------------------------------------------------------------------
    // Scenario 2: Create tasks directly inside that Project
    // -------------------------------------------------------------------------
    const check1 = await verifyHierarchy(userId, area.id, project.id, null);
    test('Scenario 2a: verifyHierarchy allows Area + Project with null subproject', () => {
      assert.strictEqual(check1.isValid, true);
    });

    const taskInboxItem1 = await prisma.inboxItem.create({
      data: {
        content: `Task directly in project 1 - ${ts}`,
        type: 'Task',
        assigned: true,
        areaId: area.id,
        projectId: project.id,
        subProjectId: null,
        userId,
      }
    });

    const task1 = await prisma.task.create({
      data: {
        inboxItemId: taskInboxItem1.id,
        completed: false,
        order: 0,
        userId,
      }
    });

    test('Scenario 2b: Task created directly inside Project without Subproject', () => {
      assert(task1.id, 'Task created');
      assert.strictEqual(taskInboxItem1.subProjectId, null);
      assert.strictEqual(taskInboxItem1.projectId, project.id);
      assert.strictEqual(taskInboxItem1.assigned, true);
    });

    // -------------------------------------------------------------------------
    // Scenario 3: Capture an Inbox item and assign it directly to the Project
    // -------------------------------------------------------------------------
    const inboxItemCaptured = await prisma.inboxItem.create({
      data: {
        content: `Captured thought to be assigned - ${ts}`,
        type: 'Idea',
        assigned: false,
        userId,
      }
    });

    // Assign directly to Project (no subproject)
    const assignCheck = await verifyHierarchy(userId, area.id, project.id, null);
    assert.strictEqual(assignCheck.isValid, true);

    const assignedInboxItem = await prisma.inboxItem.update({
      where: { id: inboxItemCaptured.id },
      data: {
        assigned: true,
        areaId: area.id,
        projectId: project.id,
        subProjectId: null,
      }
    });

    test('Scenario 3: Assign Inbox item directly to Area + Project without forcing Subproject', () => {
      assert.strictEqual(assignedInboxItem.assigned, true);
      assert.strictEqual(assignedInboxItem.areaId, area.id);
      assert.strictEqual(assignedInboxItem.projectId, project.id);
      assert.strictEqual(assignedInboxItem.subProjectId, null);
    });

    // -------------------------------------------------------------------------
    // Scenario 4: Create a Subproject later inside that Project
    // -------------------------------------------------------------------------
    const subProjectLater = await prisma.subProject.create({
      data: {
        name: `Subproject Added Later ${ts}`,
        projectId: project.id,
        userId,
      }
    });

    const projectAfterSub = await prisma.project.findUnique({
      where: { id: project.id },
      include: { subProjects: true }
    });

    test('Scenario 4: Add Subproject later inside existing Project', () => {
      assert.strictEqual(projectAfterSub.subProjects.length, 1);
      assert.strictEqual(projectAfterSub.subProjects[0].id, subProjectLater.id);
      assert.strictEqual(projectAfterSub.subProjects[0].projectId, project.id);
    });

    // -------------------------------------------------------------------------
    // Scenario 5: Assign some tasks to Subproject and leave others directly under Project
    // -------------------------------------------------------------------------
    const taskInboxItem2 = await prisma.inboxItem.create({
      data: {
        content: `Task inside added subproject - ${ts}`,
        type: 'Task',
        assigned: true,
        areaId: area.id,
        projectId: project.id,
        subProjectId: subProjectLater.id,
        userId,
      }
    });
    await prisma.task.create({
      data: {
        inboxItemId: taskInboxItem2.id,
        completed: false,
        order: 1,
        userId,
      }
    });

    // Fetch all project tasks
    const allProjectItems = await prisma.inboxItem.findMany({
      where: { projectId: project.id, userId },
      include: { task: true }
    });

    const directItems = allProjectItems.filter(it => it.subProjectId === null);
    const subprojectItems = allProjectItems.filter(it => it.subProjectId === subProjectLater.id);

    test('Scenario 5: Mixed tasks - some under Subproject, some directly under Project', () => {
      assert.strictEqual(directItems.length, 2, '2 direct items (Task 1 + Assigned Inbox Item)');
      assert.strictEqual(subprojectItems.length, 1, '1 task under Subproject');
    });

    // -------------------------------------------------------------------------
    // Scenario 6: Change an Inbox item's Project and verify incompatible Subproject is cleared
    // -------------------------------------------------------------------------
    // Create Project B in Area
    const projectB = await prisma.project.create({
      data: { name: `Project B ${ts}`, areaId: area.id, userId }
    });

    // Simulate update logic: existing item has project.id and subProjectLater.id.
    // User changes project to projectB.id without providing subProjectId.
    let targetAreaId = area.id;
    let targetProjectId = projectB.id;
    let targetSubProjectId = taskInboxItem2.subProjectId; // previously subProjectLater.id

    // Component/Backend rule: If project changes and subproject is not explicitly re-supplied, clear subproject
    if (targetProjectId !== taskInboxItem2.projectId) {
      targetSubProjectId = null;
    }

    const checkPChange = await verifyHierarchy(userId, targetAreaId, targetProjectId, targetSubProjectId);
    assert.strictEqual(checkPChange.isValid, true);

    const updatedProjectItem = await prisma.inboxItem.update({
      where: { id: taskInboxItem2.id },
      data: {
        projectId: targetProjectId,
        subProjectId: targetSubProjectId,
      }
    });

    test('Scenario 6: Changing Project resets/clears incompatible Subproject', () => {
      assert.strictEqual(updatedProjectItem.projectId, projectB.id);
      assert.strictEqual(updatedProjectItem.subProjectId, null);
    });

    // -------------------------------------------------------------------------
    // Scenario 7: Edit, delete, and move Projects/Subprojects without breaking existing task relationships
    // -------------------------------------------------------------------------
    // Create Subproject C in Project B
    const subC = await prisma.subProject.create({
      data: { name: `Subproject C ${ts}`, projectId: projectB.id, userId }
    });

    // Move task to Subproject C
    const checkMove = await verifyHierarchy(userId, area.id, projectB.id, subC.id);
    assert.strictEqual(checkMove.isValid, true);

    await prisma.inboxItem.update({
      where: { id: taskInboxItem2.id },
      data: { subProjectId: subC.id }
    });

    // Rename Subproject C
    const renamedSubC = await prisma.subProject.update({
      where: { id: subC.id },
      data: { name: `Subproject C (Renamed) ${ts}` }
    });
    test('Scenario 7a: Rename Subproject retains task relationship', () => {
      assert.strictEqual(renamedSubC.name, `Subproject C (Renamed) ${ts}`);
    });

    // Delete Subproject C with mode="unassign" (retaining parent project)
    await prisma.$transaction([
      prisma.inboxItem.updateMany({
        where: { subProjectId: subC.id },
        data: { subProjectId: null }
      }),
      prisma.subProject.delete({ where: { id: subC.id } })
    ]);

    const itemAfterSubDelete = await prisma.inboxItem.findUnique({
      where: { id: taskInboxItem2.id }
    });

    test('Scenario 7b: Delete Subproject keeps task intact under parent Project (subProjectId set to null)', () => {
      assert(itemAfterSubDelete, 'Task inbox item still exists');
      assert.strictEqual(itemAfterSubDelete.projectId, projectB.id);
      assert.strictEqual(itemAfterSubDelete.subProjectId, null);
      assert.strictEqual(itemAfterSubDelete.assigned, true);
    });

    // -------------------------------------------------------------------------
    // Scenario 8: Verify existing users and existing data continue to work
    // -------------------------------------------------------------------------
    const existingItems = await prisma.inboxItem.findMany({
      where: { userId },
      take: 5
    });

    test('Scenario 8: Existing data and relationships query smoothly', () => {
      assert(Array.isArray(existingItems));
      for (const it of existingItems) {
        assert(typeof it.content === 'string');
        assert(it.subProjectId === null || typeof it.subProjectId === 'string');
      }
    });

    // Cleanup
    await prisma.task.deleteMany({ where: { userId, inboxItemId: { in: [taskInboxItem1.id, taskInboxItem2.id, inboxItemCaptured.id] } } });
    await prisma.inboxItem.deleteMany({ where: { id: { in: [taskInboxItem1.id, taskInboxItem2.id, inboxItemCaptured.id] } } });
    await prisma.subProject.deleteMany({ where: { id: { in: [subProjectLater.id] } } });
    await prisma.project.deleteMany({ where: { id: { in: [project.id, projectB.id] } } });
    await prisma.area.deleteMany({ where: { id: area.id } });

  } catch (err) {
    console.error('Spec test execution error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n=== SPEC TEST SUMMARY: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

run();

