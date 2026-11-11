const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));

let rehearsalUrl = process.env.DIRECT_URL;
if (rehearsalUrl.includes('/neondb?')) {
  rehearsalUrl = rehearsalUrl.replace('/neondb?', '/ambit_rehearsal?');
} else if (rehearsalUrl.includes('/neondb')) {
  rehearsalUrl = rehearsalUrl.replace('/neondb', '/ambit_rehearsal');
}

const prisma = new PrismaClient({ datasources: { db: { url: rehearsalUrl } } });

async function verifyRehearsal() {
  console.log('======================================================');
  console.log(' VERIFYING FRESH REHEARSAL DATABASE (ambit_rehearsal)');
  console.log('======================================================\n');

  // 1. Verify foreign key constraints on _NoteTags
  const fks = await prisma.$queryRawUnsafe(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = '_NoteTags'
    ORDER BY kcu.column_name;
  `);

  console.log('--- Foreign Keys on _NoteTags ---');
  console.table(fks);

  const fkA = fks.find(f => f.column_name === 'A');
  const fkB = fks.find(f => f.column_name === 'B');

  if (!fkA || fkA.foreign_table_name !== 'notes' || fkA.foreign_column_name !== 'id') {
    throw new Error(`Expected column A to reference notes(id), got: ${JSON.stringify(fkA)}`);
  }
  if (!fkB || fkB.foreign_table_name !== 'tags' || fkB.foreign_column_name !== 'id') {
    throw new Error(`Expected column B to reference tags(id), got: ${JSON.stringify(fkB)}`);
  }
  console.log('✓ Foreign keys match Prisma canonical schema: A -> notes(id), B -> tags(id)\n');

  // 2. Functional Verification: Note + Task with shared Tag
  console.log('--- Functional Verification: Shared Tag Associations ---');
  const user = await prisma.user.create({
    data: { email: 'rehearsal_user@ambit.ai', name: 'Rehearsal User' },
  });

  const tag = await prisma.tag.create({
    data: { userId: user.id, name: 'rehearsal-tag' },
  });

  // Associate Note with Tag using Prisma client
  const note = await prisma.note.create({
    data: {
      userId: user.id,
      title: 'Rehearsal Note',
      content: '# Hello Rehearsal\nTesting Note-Tag association.',
      tags: { connect: [{ id: tag.id }] },
    },
    include: { tags: true },
  });
  console.log('✓ Note created and linked to Tag:', { noteId: note.id, tags: note.tags.map(t => t.name) });

  // Associate Task with same Tag using Prisma client
  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: 'Rehearsal Task with Shared Tag',
      tags: { connect: [{ id: tag.id }] },
    },
    include: { tags: true },
  });
  console.log('✓ Task created and linked to same Tag:', { taskId: task.id, tags: task.tags.map(t => t.name) });

  // Verify join table rows
  const [noteTagRow] = await prisma.$queryRawUnsafe(`SELECT * FROM "_NoteTags" WHERE "A" = '${note.id}' AND "B" = '${tag.id}';`);
  const [taskTagRow] = await prisma.$queryRawUnsafe(`SELECT * FROM "_TaskTags" WHERE "A" = '${tag.id}' AND "B" = '${task.id}';`);

  if (!noteTagRow) throw new Error('_NoteTags row not found with A=noteId, B=tagId');
  if (!taskTagRow) throw new Error('_TaskTags row not found with A=tagId, B=taskId');
  console.log('✓ Direct database check confirmed:');
  console.log('  _NoteTags:', noteTagRow);
  console.log('  _TaskTags:', taskTagRow);

  // 3. Deletion test: Deleting a Note removes only its Note-Tag join records
  console.log('\n--- Deletion Test: Delete Note ---');
  await prisma.note.delete({ where: { id: note.id } });
  const noteTagsAfterNoteDelete = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "_NoteTags";`);
  const taskTagsAfterNoteDelete = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "_TaskTags";`);
  const tagAfterNoteDelete = await prisma.tag.findUnique({ where: { id: tag.id } });
  const taskAfterNoteDelete = await prisma.task.findUnique({ where: { id: task.id } });

  if (noteTagsAfterNoteDelete[0].count !== 0) throw new Error('_NoteTags join record was not removed on Note deletion');
  if (taskTagsAfterNoteDelete[0].count !== 1) throw new Error('_TaskTags join record was unexpectedly modified');
  if (!tagAfterNoteDelete) throw new Error('Shared Tag was unexpectedly deleted');
  if (!taskAfterNoteDelete) throw new Error('Task was unexpectedly deleted');
  console.log('✓ Deleting Note deleted ONLY _NoteTags join record. Tag and Task remain completely intact.');

  // 4. Deletion test: Deleting a Tag removes its join records
  console.log('\n--- Deletion Test: Delete Tag ---');
  await prisma.tag.delete({ where: { id: tag.id } });
  const taskTagsAfterTagDelete = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "_TaskTags";`);
  const taskAfterTagDelete = await prisma.task.findUnique({ where: { id: task.id } });

  if (taskTagsAfterTagDelete[0].count !== 0) throw new Error('_TaskTags join record was not removed on Tag deletion');
  if (!taskAfterTagDelete) throw new Error('Task was unexpectedly deleted on Tag deletion');
  console.log('✓ Deleting Tag removed _TaskTags join record. Task remains completely intact.');

  // Clean up user
  await prisma.user.delete({ where: { id: user.id } });
  console.log('\n✓ Rehearsal test database cleaned cleanly. ALL ASSERTIONS PASSED!');
}

verifyRehearsal()
  .catch(err => {
    console.error('Rehearsal verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

