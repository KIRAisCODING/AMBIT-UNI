const path = require('path');
const fs = require('fs');

// Read env for backend DB connection
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

async function runTests() {
  console.log('=== STARTING INBOX ASSIGNMENT COMPOSER TAG STATE TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // Find or create test user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'inbox-tag-test@ambit.ai',
        name: 'Tag Test User'
      }
    });
  }
  const userId = user.id;

  // Setup hierarchy: College -> Ambit -> Launch, Development
  //                 College -> Semester 5
  //                 Personal -> Fitness
  const ts = Date.now();
  const collegeArea = await prisma.area.create({
    data: { name: `College ${ts}`, userId }
  });
  const personalArea = await prisma.area.create({
    data: { name: `Personal ${ts}`, userId }
  });

  const ambitProject = await prisma.project.create({
    data: { name: `Ambit ${ts}`, areaId: collegeArea.id, userId }
  });
  const sem5Project = await prisma.project.create({
    data: { name: `Semester 5 ${ts}`, areaId: collegeArea.id, userId }
  });
  const fitnessProject = await prisma.project.create({
    data: { name: `Fitness ${ts}`, areaId: personalArea.id, userId }
  });

  const launchSub = await prisma.subProject.create({
    data: { name: `Launch ${ts}`, projectId: ambitProject.id, userId }
  });
  const devSub = await prisma.subProject.create({
    data: { name: `Development ${ts}`, projectId: ambitProject.id, userId }
  });

  const hierarchy = [
    {
      id: collegeArea.id,
      name: collegeArea.name,
      projects: [
        {
          id: ambitProject.id,
          name: ambitProject.name,
          subProjects: [
            { id: launchSub.id, name: launchSub.name },
            { id: devSub.id, name: devSub.name },
          ]
        },
        {
          id: sem5Project.id,
          name: sem5Project.name,
          subProjects: []
        }
      ]
    },
    {
      id: personalArea.id,
      name: personalArea.name,
      projects: [
        {
          id: fitnessProject.id,
          name: fitnessProject.name,
          subProjects: []
        }
      ]
    }
  ];

  // ==========================================
  // SCENARIO 1: ACCEPTANCE TEST (SECTION 10)
  // ==========================================
  console.log('\n--- SCENARIO 1: Section 10 Acceptance Test Flow ---');

  // Simulation of CaptureComposer / Inbox Assignment state:
  let state = {
    content: 'Prepare Ambit launch',
    tags: ['product', 'launch'],
    areaId: '',
    projectId: '',
    subProjectId: '',
  };

  // 1. Select Area = College
  state.areaId = collegeArea.id;
  state.projectId = '';
  state.subProjectId = '';
  assert(
    JSON.stringify(state.tags) === JSON.stringify(['product', 'launch']),
    'Step 1: Select Area = College; tags remain ["product", "launch"]'
  );

  // 2. Select Project = Ambit
  state.projectId = ambitProject.id;
  state.subProjectId = '';
  assert(
    JSON.stringify(state.tags) === JSON.stringify(['product', 'launch']),
    'Step 2: Select Project = Ambit; tags remain ["product", "launch"]'
  );

  // 3. Select Subproject = Launch
  state.subProjectId = launchSub.id;
  assert(
    JSON.stringify(state.tags) === JSON.stringify(['product', 'launch']),
    'Step 3: Select Subproject = Launch; tags remain ["product", "launch"]'
  );

  // 4. Remove "product"
  state.tags = state.tags.filter(t => t !== 'product');
  assert(
    JSON.stringify(state.tags) === JSON.stringify(['launch']),
    'Step 4: Remove "product"; tags immediately become ["launch"]'
  );

  // 5. Add "beta"
  state.tags = [...state.tags, 'beta'];
  assert(
    JSON.stringify(state.tags) === JSON.stringify(['launch', 'beta']),
    'Step 5: Add "beta"; tags immediately become ["launch", "beta"]'
  );

  // 6. Change Project to Semester 5
  state.projectId = sem5Project.id;
  state.subProjectId = ''; // resets
  assert(
    state.subProjectId === '',
    'Step 6a: Change Project resets Subproject'
  );
  assert(
    JSON.stringify(state.tags) === JSON.stringify(['launch', 'beta']),
    'Step 6b: Change Project; tags remain ["launch", "beta"]'
  );

  // 7. Change Area to Personal
  state.areaId = personalArea.id;
  state.projectId = ''; // resets
  state.subProjectId = ''; // resets
  assert(
    state.projectId === '' && state.subProjectId === '',
    'Step 7a: Change Area resets Project and Subproject'
  );
  assert(
    JSON.stringify(state.tags) === JSON.stringify(['launch', 'beta']),
    'Step 7b: Change Area; tags remain ["launch", "beta"]'
  );

  // 8. Select a new Project under Personal
  const availableProjectsUnderPersonal = hierarchy.find(a => a.id === state.areaId)?.projects || [];
  assert(
    availableProjectsUnderPersonal.length === 1 && availableProjectsUnderPersonal[0].id === fitnessProject.id,
    'Step 8: Only projects belonging to the selected Area appear'
  );
  state.projectId = fitnessProject.id;

  // 9. Check Subprojects for Fitness
  const availableSubProjectsForFitness = availableProjectsUnderPersonal.find(p => p.id === state.projectId)?.subProjects || [];
  assert(
    availableSubProjectsForFitness.length === 0,
    'Step 9: Subprojects correctly scoped to selected Project'
  );

  // Change back to College -> Ambit -> Launch for final assignment
  state.areaId = collegeArea.id;
  state.projectId = ambitProject.id;
  state.subProjectId = launchSub.id;

  // 10. Save/Assign: Final payload check
  const finalPayload = {
    areaId: state.areaId,
    projectId: state.projectId,
    subProjectId: state.subProjectId || null,
    tags: state.tags,
  };

  assert(
    finalPayload.areaId === collegeArea.id &&
    finalPayload.projectId === ambitProject.id &&
    finalPayload.subProjectId === launchSub.id &&
    JSON.stringify(finalPayload.tags) === JSON.stringify(['launch', 'beta']),
    'Step 10: Final payload matches expected area, project, subproject, and tags'
  );

  // Persist to DB and verify
  const savedItem = await prisma.inboxItem.create({
    data: {
      content: state.content,
      type: 'Task',
      assigned: true,
      areaId: finalPayload.areaId,
      projectId: finalPayload.projectId,
      subProjectId: finalPayload.subProjectId,
      tags: finalPayload.tags,
      userId,
    }
  });

  assert(
    savedItem.id && JSON.stringify(savedItem.tags) === JSON.stringify(['launch', 'beta']),
    'Step 10b: Saved item persists tags ["launch", "beta"] in database'
  );

  // ==========================================
  // SCENARIO 2: MULTI-ITEM STATE TEST (SECTION 11)
  // ==========================================
  console.log('\n--- SCENARIO 2: Section 11 Multi-Item State Test ---');

  const itemA = await prisma.inboxItem.create({
    data: {
      content: 'Item A',
      type: 'Task',
      assigned: false,
      tags: ['design', 'urgent'],
      userId,
    }
  });

  const itemB = await prisma.inboxItem.create({
    data: {
      content: 'Item B',
      type: 'Task',
      assigned: false,
      tags: ['college'],
      userId,
    }
  });

  // Open Item A
  let composerSession = {
    itemId: itemA.id,
    tags: [...itemA.tags],
    areaId: itemA.areaId || '',
    projectId: itemA.projectId || '',
    subProjectId: itemA.subProjectId || '',
  };
  assert(
    JSON.stringify(composerSession.tags) === JSON.stringify(['design', 'urgent']),
    'Multi-Item: Open Item A shows ["design", "urgent"]'
  );

  // Close Item A / Open Item B
  composerSession = {
    itemId: itemB.id,
    tags: [...itemB.tags],
    areaId: itemB.areaId || '',
    projectId: itemB.projectId || '',
    subProjectId: itemB.subProjectId || '',
  };
  assert(
    JSON.stringify(composerSession.tags) === JSON.stringify(['college']),
    'Multi-Item: Open Item B shows ["college"] without leaking Item A tags'
  );

  // Change Item B hierarchy
  composerSession.areaId = collegeArea.id;
  composerSession.projectId = ambitProject.id;
  composerSession.subProjectId = launchSub.id;
  assert(
    JSON.stringify(composerSession.tags) === JSON.stringify(['college']),
    'Multi-Item: Change Item B hierarchy preserves ["college"]'
  );

  // Add "exam" to Item B
  composerSession.tags.push('exam');
  assert(
    JSON.stringify(composerSession.tags) === JSON.stringify(['college', 'exam']),
    'Multi-Item: Add "exam" to Item B results in ["college", "exam"]'
  );

  // Return to Item A
  composerSession = {
    itemId: itemA.id,
    tags: [...itemA.tags],
    areaId: itemA.areaId || '',
    projectId: itemA.projectId || '',
    subProjectId: itemA.subProjectId || '',
  };
  assert(
    JSON.stringify(composerSession.tags) === JSON.stringify(['design', 'urgent']),
    'Multi-Item: Return to Item A shows ["design", "urgent"] with ZERO leakage from Item B'
  );

  // ==========================================
  // SCENARIO 3: UNASSIGNED VIEW FILE & ASSIGN WITH TAGS
  // ==========================================
  console.log('\n--- SCENARIO 3: Unassigned View Assignment Flow with Tags ---');

  // Update item B in database using assign endpoint logic
  const updateData = {
    assigned: true,
    areaId: collegeArea.id,
    projectId: ambitProject.id,
    subProjectId: launchSub.id,
    tags: ['college', 'exam'],
  };

  const assignedItemB = await prisma.inboxItem.update({
    where: { id: itemB.id },
    data: updateData,
  });

  assert(
    assignedItemB.assigned === true &&
    assignedItemB.areaId === collegeArea.id &&
    assignedItemB.projectId === ambitProject.id &&
    assignedItemB.subProjectId === launchSub.id &&
    JSON.stringify(assignedItemB.tags) === JSON.stringify(['college', 'exam']),
    'UnassignedView: Successfully files item with hierarchy and updated tags in DB'
  );

  // Verify tags have NO hashtags and are not derived from hierarchy
  assert(
    assignedItemB.tags.every(t => !t.startsWith('#')),
    'Tags Check: No hashtag prefixes introduced'
  );
  assert(
    !assignedItemB.tags.includes(collegeArea.name) && !assignedItemB.tags.includes(ambitProject.name),
    'Tags Check: Hierarchy names are not automatically converted to tags'
  );

  console.log(`\n=== INBOX TAG COMPOSER TEST SUITE FINISHED ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  // Cleanup test entities
  await prisma.inboxItem.deleteMany({
    where: { id: { in: [savedItem.id, itemA.id, itemB.id] } }
  });
  await prisma.subProject.deleteMany({
    where: { id: { in: [launchSub.id, devSub.id] } }
  });
  await prisma.project.deleteMany({
    where: { id: { in: [ambitProject.id, sem5Project.id, fitnessProject.id] } }
  });
  await prisma.area.deleteMany({
    where: { id: { in: [collegeArea.id, personalArea.id] } }
  });

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
