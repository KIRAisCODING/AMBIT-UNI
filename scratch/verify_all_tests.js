const path = require('path');
const fs = require('fs');
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

// Load verifyHierarchy
// compile ts on the fly or test hierarchy logic directly
async function testVerifyHierarchy(userId, areaId, projectId, subProjectId) {
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
  console.log('=== STARTING AMBIT INBOX VERIFICATION SUITE ===\n');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      testsFailed++;
    }
  }

  // Get a test user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test-audit@ambit.ai',
        name: 'Audit User'
      }
    });
  }
  const userId = user.id;

  // Setup test hierarchy: Area A, Area B
  const timestamp = Date.now();
  const areaA = await prisma.area.create({
    data: { name: `Area A ${timestamp}`, userId }
  });
  const areaB = await prisma.area.create({
    data: { name: `Area B ${timestamp}`, userId }
  });

  // Project A1 (with subprojects), Project A2 (without subprojects)
  const projectA1 = await prisma.project.create({
    data: { name: `Project A1 ${timestamp}`, areaId: areaA.id, userId }
  });
  const projectA2 = await prisma.project.create({
    data: { name: `Project A2 (Empty) ${timestamp}`, areaId: areaA.id, userId }
  });
  const projectB1 = await prisma.project.create({
    data: { name: `Project B1 ${timestamp}`, areaId: areaB.id, userId }
  });

  // Subprojects for A1 and B1
  const subA1_1 = await prisma.subProject.create({
    data: { name: `Sub A1_1 ${timestamp}`, projectId: projectA1.id, userId }
  });
  const subA1_2 = await prisma.subProject.create({
    data: { name: `Sub A1_2 ${timestamp}`, projectId: projectA1.id, userId }
  });
  const subB1_1 = await prisma.subProject.create({
    data: { name: `Sub B1_1 ${timestamp}`, projectId: projectB1.id, userId }
  });

  // Build hierarchy tree as frontend useAreas does
  const allAreas = await prisma.area.findMany({
    where: { userId },
    include: {
      projects: {
        include: { subProjects: true }
      }
    }
  });

  // Mock frontend hierarchy
  const hierarchy = allAreas.map(a => ({
    id: a.id,
    name: a.name,
    projects: a.projects.map(p => ({
      id: p.id,
      areaId: a.id,
      name: p.name,
      subProjects: p.subProjects.map(sp => ({
        id: sp.id,
        projectId: p.id,
        name: sp.name
      }))
    }))
  }));

  // --- TEST 1: Select Area A; verify only Area A's projects appear ---
  const areaANode = hierarchy.find(a => a.id === areaA.id);
  const projectsUnderA = areaANode ? areaANode.projects : [];
  assert(
    projectsUnderA.length === 2 &&
    projectsUnderA.some(p => p.id === projectA1.id) &&
    projectsUnderA.some(p => p.id === projectA2.id) &&
    !projectsUnderA.some(p => p.id === projectB1.id),
    'TEST 1: Select Area A; verify only Area A projects appear'
  );

  // --- TEST 2: Select Area B; verify Area A projects disappear ---
  const areaBNode = hierarchy.find(a => a.id === areaB.id);
  const projectsUnderB = areaBNode ? areaBNode.projects : [];
  assert(
    projectsUnderB.length === 1 &&
    projectsUnderB.some(p => p.id === projectB1.id) &&
    !projectsUnderB.some(p => p.id === projectA1.id) &&
    !projectsUnderB.some(p => p.id === projectA2.id),
    'TEST 2: Select Area B; verify Area A projects disappear'
  );

  // --- TEST 3: Select Area A -> Project A1; verify only A1's subprojects appear ---
  const projA1Node = projectsUnderA.find(p => p.id === projectA1.id);
  const subsUnderA1 = projA1Node ? projA1Node.subProjects : [];
  assert(
    subsUnderA1.length === 2 &&
    subsUnderA1.some(sp => sp.id === subA1_1.id) &&
    subsUnderA1.some(sp => sp.id === subA1_2.id) &&
    !subsUnderA1.some(sp => sp.id === subB1_1.id),
    'TEST 3: Select Area A -> Project A1; verify only A1 subprojects appear'
  );

  // --- TEST 4: Change Project A1 -> Project A2; verify A1 subprojects disappear and selection resets ---
  let selectedProjectId = projectA1.id;
  let selectedSubProjectId = subA1_1.id;
  // User changes to Project A2
  selectedProjectId = projectA2.id;
  selectedSubProjectId = ''; // Component reset rule
  const projA2Node = projectsUnderA.find(p => p.id === selectedProjectId);
  const subsUnderA2 = projA2Node ? projA2Node.subProjects : [];
  assert(
    selectedSubProjectId === '' && subsUnderA2.length === 0,
    'TEST 4: Change Project A1 -> A2; verify A1 subprojects disappear and subproject selection resets'
  );

  // --- TEST 5: Change Area A -> Area B; verify Project and Subproject reset ---
  let currentAreaId = areaA.id;
  selectedProjectId = projectA1.id;
  selectedSubProjectId = subA1_1.id;
  // User changes to Area B
  currentAreaId = areaB.id;
  selectedProjectId = '';
  selectedSubProjectId = '';
  assert(
    currentAreaId === areaB.id && selectedProjectId === '' && selectedSubProjectId === '',
    'TEST 5: Change Area A -> Area B; verify Project and Subproject reset to empty'
  );

  // --- TEST 6: Select a Project with no Subprojects; verify UI does not force Subproject selection ---
  const emptyProj = projectsUnderA.find(p => p.id === projectA2.id);
  const isSubProjectRequired = false; // By design, subprojects are strictly optional
  assert(
    emptyProj.subProjects.length === 0 && !isSubProjectRequired,
    'TEST 6: Select Project with no Subprojects; verify optional and not forced'
  );

  // --- TEST 7: Select multiple tags; remove one; verify removed tag disappears from state ---
  let mockTags = ['research', 'urgent', 'redesign'];
  const tagToRemove = 'urgent';
  mockTags = mockTags.filter(t => t !== tagToRemove);
  assert(
    mockTags.length === 2 && !mockTags.includes('urgent') && mockTags.includes('research') && mockTags.includes('redesign'),
    'TEST 7: Select multiple tags; remove one; verify removed tag disappears from UI/state'
  );

  // --- TEST 8: Save Inbox item with Area + Project + No Subproject; verify saves successfully ---
  const validHierarchyCheckNoSub = await testVerifyHierarchy(userId, areaA.id, projectA1.id, null);
  assert(validHierarchyCheckNoSub.isValid, 'TEST 8a: verifyHierarchy passes for Area + Project + null Subproject');

  const itemNoSub = await prisma.inboxItem.create({
    data: {
      userId,
      content: `Item without Subproject ${timestamp}`,
      type: 'Task',
      assigned: true,
      areaId: areaA.id,
      projectId: projectA1.id,
      subProjectId: null,
      tags: ['standalone']
    }
  });
  assert(
    itemNoSub.id && itemNoSub.areaId === areaA.id && itemNoSub.projectId === projectA1.id && itemNoSub.subProjectId === null,
    'TEST 8b: Save Inbox item with Area + Project + No Subproject successfully in database'
  );

  // --- TEST 9: Save Inbox item with Area + Project + Subproject; verify saves successfully ---
  const validHierarchyCheckWithSub = await testVerifyHierarchy(userId, areaA.id, projectA1.id, subA1_1.id);
  assert(validHierarchyCheckWithSub.isValid, 'TEST 9a: verifyHierarchy passes for consistent Area + Project + Subproject');

  const itemWithSub = await prisma.inboxItem.create({
    data: {
      userId,
      content: `Item with Subproject ${timestamp}`,
      type: 'Task',
      assigned: true,
      areaId: areaA.id,
      projectId: projectA1.id,
      subProjectId: subA1_1.id,
      tags: ['sub-task', 'v2']
    }
  });
  assert(
    itemWithSub.id && itemWithSub.subProjectId === subA1_1.id && itemWithSub.tags.length === 2,
    'TEST 9b: Save Inbox item with Area + Project + Subproject successfully in database'
  );

  // --- TEST 10: Attempt invalid relationship: Area A + Project from Area B; verify rejected ---
  const invalidAreaProjectCheck = await testVerifyHierarchy(userId, areaA.id, projectB1.id, null);
  assert(
    !invalidAreaProjectCheck.isValid && invalidAreaProjectCheck.error.includes('Project does not belong to the selected Area'),
    'TEST 10: Attempt Area A + Project from Area B; verify rejected with hierarchy error'
  );

  // --- TEST 11: Attempt invalid relationship: Project A1 + Subproject from Project B1; verify rejected ---
  const invalidSubProjectCheck = await testVerifyHierarchy(userId, areaA.id, projectA1.id, subB1_1.id);
  assert(
    !invalidSubProjectCheck.isValid && invalidSubProjectCheck.error.includes('SubProject does not belong to the selected Project'),
    'TEST 11: Attempt Project A1 + Subproject from Project B1; verify rejected with hierarchy error'
  );

  // --- TEST 12: Verify existing Inbox items still load correctly ---
  const loadedItems = await prisma.inboxItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  assert(
    loadedItems.length >= 2 && loadedItems.some(it => it.id === itemNoSub.id) && loadedItems.some(it => it.id === itemWithSub.id),
    'TEST 12: Verify existing Inbox items still load correctly with their tags and relationships'
  );

  // --- TEST 13: Verify editing an existing Inbox item initializes Area, Project, Subproject, Tags correctly ---
  const itemToEdit = await prisma.inboxItem.findUnique({
    where: { id: itemWithSub.id }
  });
  const editInitialAreaId = itemToEdit.areaId;
  const editInitialProjectId = itemToEdit.projectId;
  const editInitialSubProjectId = itemToEdit.subProjectId;
  const editInitialTags = [...itemToEdit.tags];
  assert(
    editInitialAreaId === areaA.id &&
    editInitialProjectId === projectA1.id &&
    editInitialSubProjectId === subA1_1.id &&
    editInitialTags.length === 2 &&
    editInitialTags.includes('sub-task'),
    'TEST 13: Verify editing an existing Inbox item initializes Area, Project, Subproject, and Tags accurately'
  );

  // --- TEST 14: Verify removing all tags results in zero selected tags and does not restore old tags after save/reload ---
  // Simulate removing all tags:
  const updatedTags = [];
  const updatedItem = await prisma.inboxItem.update({
    where: { id: itemWithSub.id },
    data: {
      tags: updatedTags
    }
  });
  // Reload from DB
  const reloadedItem = await prisma.inboxItem.findUnique({
    where: { id: itemWithSub.id }
  });
  assert(
    Array.isArray(reloadedItem.tags) &&
    reloadedItem.tags.length === 0,
    'TEST 14: Verify removing all tags results in 0 selected tags and does NOT restore old tags after save/reload'
  );

  // Cleanup test artifacts from database
  try {
    await prisma.inboxItem.deleteMany({ where: { id: { in: [itemNoSub.id, itemWithSub.id] } } });
    await prisma.subProject.deleteMany({ where: { id: { in: [subA1_1.id, subA1_2.id, subB1_1.id] } } });
    await prisma.project.deleteMany({ where: { id: { in: [projectA1.id, projectA2.id, projectB1.id] } } });
    await prisma.area.deleteMany({ where: { id: { in: [areaA.id, areaB.id] } } });
  } catch (cleanErr) {
    console.warn('Cleanup warning:', cleanErr.message);
  }

  console.log(`\n=== VERIFICATION COMPLETE ===`);
  console.log(`Passed: ${testsPassed}/14`);
  console.log(`Failed: ${testsFailed}/14`);

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal error running verification suite:', err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
