/**
 * AMBIT Milestone 2.2 HTTP Integration Test Suite
 * Executes against dedicated isolated database: ambit_test_db
 * Tests Notes Knowledge Base & Shared Tagging API with actual HTTP Request/Response objects.
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
    '@/lib/noteUtils': path.join(backendDir, 'lib/noteUtils.ts'),
    '@': backendDir,
  },
});

const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
const prisma = new PrismaClient({ datasources: { db: { url: directTestUrl } } });

const { __setTestSession } = jiti(path.join(backendDir, 'lib/rateLimit.ts'));
const { deriveNoteDisplayTitle } = jiti(path.join(backendDir, 'lib/noteUtils.ts'));

// Route handlers
const notesRoute = jiti(path.join(backendDir, 'app/api/notes/route.ts'));
const notesIdRoute = jiti(path.join(backendDir, 'app/api/notes/[id]/route.ts'));
const notesPinRoute = jiti(path.join(backendDir, 'app/api/notes/[id]/pin/route.ts'));
const notesArchiveRoute = jiti(path.join(backendDir, 'app/api/notes/[id]/archive/route.ts'));
const notesRestoreRoute = jiti(path.join(backendDir, 'app/api/notes/[id]/restore/route.ts'));

const tagsRoute = jiti(path.join(backendDir, 'app/api/tags/route.ts'));
const tagsIdRoute = jiti(path.join(backendDir, 'app/api/tags/[id]/route.ts'));
const tasksRoute = jiti(path.join(backendDir, 'app/api/tasks/route.ts'));

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

async function runMilestone22Suite() {
  console.log('===============================================================');
  console.log(' AMBIT MILESTONE 2.2 — NOTES & TAGGING INTEGRATION SUITE');
  console.log(' Environment: Dedicated Isolated Database (ambit_test_db)');
  console.log(' Target: Notes API & Shared Workspace Tagging Handlers');
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

  // Setup Test Users in isolated test database
  const userA = await prisma.user.upsert({
    where: { email: 'userA_notes@test.ambit' },
    update: {},
    create: { email: 'userA_notes@test.ambit', name: 'User A Notes' },
  });
  const userB = await prisma.user.upsert({
    where: { email: 'userB_notes@test.ambit' },
    update: {},
    create: { email: 'userB_notes@test.ambit', name: 'User B Notes' },
  });

  const sessionA = { user: { id: userA.id, email: userA.email } };
  const sessionB = { user: { id: userB.id, email: userB.email } };

  try {
    // -------------------------------------------------------------
    // SECTION 1: Unit & Utility Validation (Display Title & Markdown)
    // -------------------------------------------------------------
    console.log('--- Section 1: Display-Title Derivation & Markdown Parsing ---');

    assert(
      deriveNoteDisplayTitle('Explicit Title', '# Heading\nContent') === 'Explicit Title',
      'Explicit title is preserved without modification'
    );
    assert(
      deriveNoteDisplayTitle(null, '# Architecture Overview\nBody content') === 'Architecture Overview',
      'Derives display title from first markdown H1 heading'
    );
    assert(
      deriveNoteDisplayTitle('', '### Deep Neural Networks\nDetails') === 'Deep Neural Networks',
      'Derives display title from markdown H3 heading when title is empty'
    );
    assert(
      deriveNoteDisplayTitle('   ', '**Bold First Line**\nNext line') === 'Bold First Line',
      'Derives display title from first non-empty line and strips formatting'
    );
    assert(
      deriveNoteDisplayTitle(null, '\n\n   \nPlain first line sentence.\nSecond line') === 'Plain first line sentence.',
      'Skips leading empty/whitespace lines to extract first meaningful line'
    );
    assert(
      deriveNoteDisplayTitle(null, '') === 'Untitled Note',
      'Returns "Untitled Note" for completely empty content'
    );
    assert(
      deriveNoteDisplayTitle(null, null) === 'Untitled Note',
      'Returns "Untitled Note" for null content'
    );

    // -------------------------------------------------------------
    // SECTION 2: Authentication & Ownership Rejection
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Authentication & Ownership Rejection ---');
    __setTestSession(null); // Unauthenticated

    const unauthGetNotes = await notesRoute.GET(new Request('http://localhost:3000/api/notes'));
    assert(unauthGetNotes.status === 401, 'Unauthenticated GET /api/notes returns 401');

    const unauthPostNotes = await notesRoute.POST(
      createJsonRequest('http://localhost:3000/api/notes', 'POST', { content: 'Test note' })
    );
    assert(unauthPostNotes.status === 401, 'Unauthenticated POST /api/notes returns 401');

    const unauthGetTags = await tagsRoute.GET(new Request('http://localhost:3000/api/tags'));
    assert(unauthGetTags.status === 401, 'Unauthenticated GET /api/tags returns 401');

    const unauthPostTags = await tagsRoute.POST(
      createJsonRequest('http://localhost:3000/api/tags', 'POST', { name: 'test-tag' })
    );
    assert(unauthPostTags.status === 401, 'Unauthenticated POST /api/tags returns 401');

    // -------------------------------------------------------------
    // SECTION 3: Note Creation, Content & Display Titles
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Note Creation & Title Semantics ---');
    __setTestSession(sessionA);

    // 3.1 Empty content rejected
    const emptyContentRes = await notesRoute.POST(
      createJsonRequest('http://localhost:3000/api/notes', 'POST', { content: '   ' })
    );
    assert(emptyContentRes.status === 400, 'POST /api/notes with empty content returns 400 Bad Request');

    // 3.2 Note created with explicit title and markdown
    const mdContent = '# Project Roadmap\n\n- [x] Phase 1\n- [ ] Phase 2\n\n```ts\nconst x = 1;\n```';
    const noteWithTitleRes = await notesRoute.POST(
      createJsonRequest('http://localhost:3000/api/notes', 'POST', {
        title: 'Explicit Roadmap Title',
        content: mdContent,
      })
    );
    assert(noteWithTitleRes.status === 201, 'POST /api/notes with title returns 201 Created');
    const noteWithTitle = await noteWithTitleRes.json();
    assert(noteWithTitle.title === 'Explicit Roadmap Title', 'Stored title matches explicit title');
    assert(noteWithTitle.displayTitle === 'Explicit Roadmap Title', 'displayTitle matches explicit title');
    assert(noteWithTitle.content === mdContent, 'Markdown content preserved byte-for-byte');
    assert(noteWithTitle.pinned === false && noteWithTitle.isPinned === false, 'Newly created Note defaults to pinned = false');
    assert(noteWithTitle.archived === false && noteWithTitle.archivedAt === null, 'Newly created Note defaults to unarchived');

    // 3.3 Note created without title (deriving displayTitle)
    const titlelessContent = '## Derived Heading\nThis note has no explicit title in storage.';
    const noteWithoutTitleRes = await notesRoute.POST(
      createJsonRequest('http://localhost:3000/api/notes', 'POST', {
        content: titlelessContent,
      })
    );
    assert(noteWithoutTitleRes.status === 201, 'POST /api/notes without title returns 201 Created');
    const noteWithoutTitle = await noteWithoutTitleRes.json();
    assert(noteWithoutTitle.title === null, 'Stored title in database is null');
    assert(noteWithoutTitle.displayTitle === 'Derived Heading', 'displayTitle dynamically derived from H2 heading');
    assert(noteWithoutTitle.content === titlelessContent, 'Markdown content preserved without modification');

    // -------------------------------------------------------------
    // SECTION 4: Note Hierarchy & Direct Placement Rule
    // -------------------------------------------------------------
    console.log('\n--- Section 4: Hierarchy Placement & Guardrails ---');

    // Create hierarchy for User A
    const areaA = await prisma.area.create({ data: { name: 'Engineering', userId: userA.id } });
    const projectA = await prisma.project.create({ data: { name: 'Architecture', areaId: areaA.id, userId: userA.id } });
    const subProjectA = await prisma.subProject.create({ data: { name: 'Core Engine', projectId: projectA.id, userId: userA.id } });

    // Create hierarchy for User B (for cross-user isolation tests)
    const areaB = await prisma.area.create({ data: { name: 'User B Area', userId: userB.id } });
    const projectB = await prisma.project.create({ data: { name: 'User B Project', areaId: areaB.id, userId: userB.id } });

    // 4.1 Standalone Note
    const standaloneRes = await notesRoute.POST(
      createJsonRequest('http://localhost:3000/api/notes', 'POST', { content: 'Standalone thought note' })
    );
    assert(standaloneRes.status === 201, 'Standalone Note returns 201 Created');
    const standaloneNote = await standaloneRes.json();
    const rawStandalone = await prisma.note.findUnique({ where: { id: standaloneNote.id } });
    assert(
      rawStandalone.areaId === null && rawStandalone.projectId === null && rawStandalone.subProjectId === null,
      'Standalone Note has all hierarchy foreign keys set to null in DB'
    );

    // 4.2 Area Note
    const areaNoteRes = await notesRoute.POST(
      createJsonRequest('http://localhost:3000/api/notes', 'POST', {
        content: 'Area direct note',
        areaId: areaA.id,
      })
    );
    assert(areaNoteRes.status === 201, 'Area Note returns 201 Created');
    const areaNote = await areaNoteRes.json();
    const rawAreaNote = await prisma.note.findUnique({ where: { id: areaNote.id } });
    assert(
      rawAreaNote.areaId === areaA.id && rawAreaNote.projectId === null && rawAreaNote.subProjectId === null,
      'Area Note stores only areaId in DB; project and subproject are null'
    );

    // 4.3 Project Note
    const projectNoteRes = await notesRoute.POST(
      createJsonRequest('http://localhost:3000/api/notes', 'POST', {
        content: 'Project direct note',
        areaId: areaA.id,
        projectId: projectA.id,
      })
    );
    assert(projectNoteRes.status === 201, 'Project Note returns 201 Created');
    const projectNote = await projectNoteRes.json();
    const rawProjectNote = await prisma.note.findUnique({ where: { id: projectNote.id } });
    assert(
      rawProjectNote.projectId === projectA.id && rawProjectNote.areaId === null && rawProjectNote.subProjectId === null,
      'Project Note stores only projectId in DB; areaId is not duplicated'
    );
    assert(projectNote.area === 'Engineering', 'API response dynamically resolves inherited Area name');

    // 4.4 Subproject Note
    const subNoteRes = await notesRoute.POST(
      createJsonRequest('http://localhost:3000/api/notes', 'POST', {
        content: 'Subproject direct note',
        areaId: areaA.id,
        projectId: projectA.id,
        subProjectId: subProjectA.id,
      })
    );
    assert(subNoteRes.status === 201, 'Subproject Note returns 201 Created');
    const subNote = await subNoteRes.json();
    const rawSubNote = await prisma.note.findUnique({ where: { id: subNote.id } });
    assert(
      rawSubNote.subProjectId === subProjectA.id && rawSubNote.projectId === null && rawSubNote.areaId === null,
      'Subproject Note stores only subProjectId in DB; inherited parent IDs are null'
    );
    assert(
      subNote.area === 'Engineering' && subNote.project === 'Architecture' && subNote.subProject === 'Core Engine',
      'API response dynamically resolves inherited Area and Project names'
    );

    // 4.5 Rejection of hierarchy mismatch
    const otherProject = await prisma.project.create({ data: { name: 'Other Proj', areaId: areaA.id, userId: userA.id } });
    const mismatchRes = await notesRoute.POST(
      createJsonRequest('http://localhost:3000/api/notes', 'POST', {
        content: 'Mismatched Note',
        projectId: otherProject.id,
        subProjectId: subProjectA.id, // belongs to projectA, not otherProject
      })
    );
    assert(mismatchRes.status === 400, 'Hierarchy mismatch returns 400 Bad Request');

    // 4.6 Rejection of cross-user hierarchy
    const crossHierarchyRes = await notesRoute.POST(
      createJsonRequest('http://localhost:3000/api/notes', 'POST', {
        content: 'Cross-user hierarchy note',
        projectId: projectB.id, // User B's project
      })
    );
    assert(crossHierarchyRes.status === 400, "Note assignment to another user's Project returns 400 Bad Request");

    // -------------------------------------------------------------
    // SECTION 5: Pinning & Archival Lifecycles
    // -------------------------------------------------------------
    console.log('\n--- Section 5: Pinning & Archival Lifecycles ---');

    // 5.1 Pin toggle via dedicated endpoint
    const pinRes = await notesPinRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/notes/${noteWithTitle.id}/pin`, 'PATCH', { pinned: true }),
      { params: Promise.resolve({ id: noteWithTitle.id }) }
    );
    assert(pinRes.status === 200, 'PATCH /api/notes/:id/pin sets pinned = true');
    const pinnedData = await pinRes.json();
    assert(pinnedData.pinned === true && pinnedData.note.pinned === true, 'Note record confirmed pinned in DB');

    // 5.2 Unpin toggle
    const unpinRes = await notesPinRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/notes/${noteWithTitle.id}/pin`, 'PATCH', { pinned: false }),
      { params: Promise.resolve({ id: noteWithTitle.id }) }
    );
    assert(unpinRes.status === 200, 'PATCH /api/notes/:id/pin unpins note (pinned = false)');
    const unpinnedData = await unpinRes.json();
    assert(unpinnedData.pinned === false && unpinnedData.note.pinned === false, 'Note confirmed unpinned');

    // 5.3 Archive note via dedicated endpoint
    const archiveRes = await notesArchiveRoute.POST(
      new Request(`http://localhost:3000/api/notes/${noteWithTitle.id}/archive`, { method: 'POST' }),
      { params: Promise.resolve({ id: noteWithTitle.id }) }
    );
    assert(archiveRes.status === 200, 'POST /api/notes/:id/archive archives note');
    const archivedBody = await archiveRes.json();
    assert(archivedBody.archived === true && archivedBody.archivedAt !== null, 'Note has archivedAt populated');

    // 5.4 Archived notes excluded from normal active listings
    const activeNotesRes = await notesRoute.GET(new Request('http://localhost:3000/api/notes'));
    const activeNotes = await activeNotesRes.json();
    const isArchivedFoundInActive = activeNotes.some((n) => n.id === noteWithTitle.id);
    assert(!isArchivedFoundInActive, 'Archived note does NOT appear in normal active GET /api/notes listing');

    // 5.5 Archived notes included when ?archived=true
    const archivedNotesRes = await notesRoute.GET(new Request('http://localhost:3000/api/notes?archived=true'));
    const archivedNotes = await archivedNotesRes.json();
    const isArchivedFoundInArchiveQuery = archivedNotes.some((n) => n.id === noteWithTitle.id);
    assert(isArchivedFoundInArchiveQuery, 'Archived note returned when querying GET /api/notes?archived=true');

    // 5.6 Restore archived note
    const restoreNoteRes = await notesRestoreRoute.POST(
      new Request(`http://localhost:3000/api/notes/${noteWithTitle.id}/restore`, { method: 'POST' }),
      { params: Promise.resolve({ id: noteWithTitle.id }) }
    );
    assert(restoreNoteRes.status === 200, 'POST /api/notes/:id/restore restores note');
    const restoredNoteBody = await restoreNoteRes.json();
    assert(restoredNoteBody.archived === false && restoredNoteBody.archivedAt === null, 'Restored note archivedAt is null');

    // -------------------------------------------------------------
    // SECTION 6: Autosave Compatibility & Partial Updates
    // -------------------------------------------------------------
    console.log('\n--- Section 6: Autosave Compatibility & Partial Updates ---');

    // 6.1 Partial update: updating content only leaves title, hierarchy, and pinning intact
    const originalNote = await prisma.note.findUnique({ where: { id: subNote.id } });
    const autosaveRes = await notesIdRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/notes/${subNote.id}`, 'PATCH', {
        content: '# Updated Content from Autosave\n\nPreserves all other fields.',
      }),
      { params: Promise.resolve({ id: subNote.id }) }
    );
    assert(autosaveRes.status === 200, 'PATCH /api/notes/:id with content-only returns 200 OK');
    const autosavedNote = await autosaveRes.json();
    const updatedInDb = await prisma.note.findUnique({ where: { id: subNote.id } });

    assert(updatedInDb.content.includes('Updated Content from Autosave'), 'Content updated accurately');
    assert(updatedInDb.subProjectId === originalNote.subProjectId, 'Hierarchy subProjectId preserved during autosave');
    assert(updatedInDb.pinned === originalNote.pinned, 'Pinned state preserved during autosave');

    // 6.2 Rapid sequential content updates preserve latest content
    for (let i = 1; i <= 3; i++) {
      await notesIdRoute.PATCH(
        createJsonRequest(`http://localhost:3000/api/notes/${subNote.id}`, 'PATCH', {
          content: `Content revision ${i}`,
        }),
        { params: Promise.resolve({ id: subNote.id }) }
      );
    }
    const finalNoteInDb = await prisma.note.findUnique({ where: { id: subNote.id } });
    assert(finalNoteInDb.content === 'Content revision 3', 'Rapid sequential updates preserve latest revision');

    // -------------------------------------------------------------
    // SECTION 7: Shared Tag System (Cross-Entity Tasks & Notes)
    // -------------------------------------------------------------
    console.log('\n--- Section 7: Shared Tag System across Tasks and Notes ---');

    // 7.1 Create shared tag via POST /api/tags
    const postTagRes = await tagsRoute.POST(
      createJsonRequest('http://localhost:3000/api/tags', 'POST', { name: 'Architecture', color: '#6366f1' })
    );
    assert(postTagRes.status === 201, 'POST /api/tags creates shared tag');
    const createdTag = await postTagRes.json();
    assert(createdTag.name === 'architecture', 'Tag name normalized to lowercase');

    // 7.2 Duplicate Tag prevention (idempotent upsert)
    const duplicateTagRes = await tagsRoute.POST(
      createJsonRequest('http://localhost:3000/api/tags', 'POST', { name: 'ARCHITECTURE', color: '#4f46e5' })
    );
    assert(duplicateTagRes.status === 201, 'Duplicate tag request succeeds via upsert');
    const duplicateTag = await duplicateTagRes.json();
    assert(duplicateTag.id === createdTag.id, 'Duplicate tag request returns same Tag ID (zero duplicates)');

    const userTagsCount = await prisma.tag.count({
      where: { userId: userA.id, name: 'architecture' },
    });
    assert(userTagsCount === 1, 'Exactly one tag record exists for (userId, name)');

    // 7.3 Attach tag to a Task
    const taskWithTagRes = await tasksRoute.POST(
      createJsonRequest('http://localhost:3000/api/tasks', 'POST', {
        title: 'Task using shared tag',
        tags: ['architecture'],
      })
    );
    assert(taskWithTagRes.status === 201, 'Task created with shared tag');
    const taskWithTag = await taskWithTagRes.json();

    // 7.4 Attach the SAME tag to a Note
    const noteWithTagRes = await notesIdRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/notes/${noteWithTitle.id}`, 'PATCH', {
        tags: ['architecture', 'research'],
      }),
      { params: Promise.resolve({ id: noteWithTitle.id }) }
    );
    assert(noteWithTagRes.status === 200, 'Note updated with shared tags');
    const noteWithTagData = await noteWithTagRes.json();
    assert(
      noteWithTagData.tagNames.includes('architecture') && noteWithTagData.tagNames.includes('research'),
      'Note tags include both architecture and research'
    );

    // 7.5 Query tags with usage counts
    const getTagsRes = await tagsRoute.GET(new Request('http://localhost:3000/api/tags'));
    assert(getTagsRes.status === 200, 'GET /api/tags returns 200 OK');
    const tagsList = await getTagsRes.json();
    const archTagEntry = tagsList.find((t) => t.name === 'architecture');
    assert(
      archTagEntry && archTagEntry.taskCount >= 1 && archTagEntry.noteCount >= 1,
      'Shared tag accurately aggregates usage count across both Tasks and Notes'
    );

    // 7.6 Tag detachment from Note without deleting Tag
    const detachTagRes = await notesIdRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/notes/${noteWithTitle.id}`, 'PATCH', {
        tags: ['research'], // 'architecture' removed
      }),
      { params: Promise.resolve({ id: noteWithTitle.id }) }
    );
    assert(detachTagRes.status === 200, 'Detached tag from note returns 200 OK');
    const detachedNoteData = await detachTagRes.json();
    assert(!detachedNoteData.tagNames.includes('architecture'), 'Architecture tag detached from Note');

    // Verify tag itself still exists in DB
    const tagStillExists = await prisma.tag.findUnique({ where: { id: createdTag.id } });
    assert(tagStillExists !== null, 'Shared Tag record preserved in database after detachment');

    // Verify Task tag association remains intact
    const taskStillTagged = await prisma.task.findUnique({
      where: { id: taskWithTag.id },
      include: { tags: true },
    });
    assert(
      taskStillTagged.tags.some((t) => t.name === 'architecture'),
      'Existing Task tag association remained 100% intact after Note tag detachment'
    );

    // -------------------------------------------------------------
    // SECTION 8: Cross-User Isolation & Security
    // -------------------------------------------------------------
    console.log('\n--- Section 8: Cross-User Isolation & Security ---');
    __setTestSession(sessionB); // Switch to User B

    // User B cannot access User A's note
    const bGetNoteA = await notesIdRoute.GET(
      new Request(`http://localhost:3000/api/notes/${noteWithTitle.id}`),
      { params: Promise.resolve({ id: noteWithTitle.id }) }
    );
    assert(bGetNoteA.status === 404, "User B cannot GET User A's note (returns 404)");

    const bPatchNoteA = await notesIdRoute.PATCH(
      createJsonRequest(`http://localhost:3000/api/notes/${noteWithTitle.id}`, 'PATCH', { content: 'Hacked by B' }),
      { params: Promise.resolve({ id: noteWithTitle.id }) }
    );
    assert(bPatchNoteA.status === 404, "User B cannot PATCH User A's note (returns 404)");

    const bDeleteNoteA = await notesIdRoute.DELETE(
      new Request(`http://localhost:3000/api/notes/${noteWithTitle.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: noteWithTitle.id }) }
    );
    assert(bDeleteNoteA.status === 404, "User B cannot DELETE User A's note (returns 404)");

    const bDeleteTagA = await tagsIdRoute.DELETE(
      new Request(`http://localhost:3000/api/tags/${createdTag.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: createdTag.id }) }
    );
    assert(bDeleteTagA.status === 404, "User B cannot DELETE User A's tag (returns 404)");

    // User B cannot see User A's tags in GET /api/tags
    const bTagsRes = await tagsRoute.GET(new Request('http://localhost:3000/api/tags'));
    const bTags = await bTagsRes.json();
    assert(bTags.length === 0, "User B's tag list is completely isolated (0 tags returned)");

    // -------------------------------------------------------------
    // SECTION 9: Deletion & Independence
    // -------------------------------------------------------------
    console.log('\n--- Section 9: Deletion & Entity Independence ---');
    __setTestSession(sessionA);

    // 9.1 Deleting a Task does not delete a Note
    await tasksRoute.GET(new Request('http://localhost:3000/api/tasks')); // ensure user session
    await prisma.task.delete({ where: { id: taskWithTag.id } });
    const noteAfterTaskDelete = await prisma.note.findUnique({ where: { id: noteWithTitle.id } });
    assert(noteAfterTaskDelete !== null, 'Deleting Task does not delete Note');

    // 9.2 Deleting a Note does not delete a Task or Tag
    const deleteNoteRes = await notesIdRoute.DELETE(
      new Request(`http://localhost:3000/api/notes/${noteWithTitle.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: noteWithTitle.id }) }
    );
    assert(deleteNoteRes.status === 200, 'DELETE /api/notes/:id returns 200 OK');
    const noteConfirmedDeleted = await prisma.note.findUnique({ where: { id: noteWithTitle.id } });
    assert(noteConfirmedDeleted === null, 'Note record permanently deleted');

    const tagAfterNoteDelete = await prisma.tag.findUnique({ where: { id: createdTag.id } });
    assert(tagAfterNoteDelete !== null, 'Shared Tag record preserved in DB after Note deletion');

  } catch (err) {
    console.error('Milestone 2.2 Test Exception:', err);
    failed++;
  } finally {
    console.log('\n--- Cleaning isolated test database ambit_test_db ---');
    await prisma.task.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.capture.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.subProject.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.area.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    console.log('Isolated test database cleaned cleanly.');
  }

  console.log('\n===============================================================');
  console.log(` MILESTONE 2.2 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

runMilestone22Suite();
