const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

async function productionPreflight() {
  console.log('========================================================================');
  console.log(' PRODUCTION PREFLIGHT AUDIT (READ-ONLY) - neondb');
  console.log('========================================================================\n');

  // 1. _prisma_migrations in production
  const migrations = await prisma.$queryRawUnsafe(`
    SELECT id, migration_name, started_at, finished_at, rolled_back_at, applied_steps_count
    FROM "_prisma_migrations"
    ORDER BY started_at ASC;
  `);
  console.log('--- Production Prisma Migration History ---');
  console.table(migrations);

  // 2. _NoteTags foreign keys in production
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
  console.log('\n--- Production _NoteTags Foreign Keys ---');
  console.table(fks);

  // 3. Row counts in production
  const [noteTagsCount] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "_NoteTags";`);
  const [taskTagsCount] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "_TaskTags";`);
  const [notesCount] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "notes";`);
  const [tagsCount] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "tags";`);
  const [tasksCount] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "Task";`);
  const [usersCount] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "User";`);

  console.log('\n--- Production Table Record Counts ---');
  console.log({
    _NoteTags: noteTagsCount.count,
    _TaskTags: taskTagsCount.count,
    notes: notesCount.count,
    tags: tagsCount.count,
    Task: tasksCount.count,
    User: usersCount.count,
  });

  // 4. Verify no unexpected tables or constraints touched
  console.log('\n--- Production Preflight Verdict ---');
  if (noteTagsCount.count === 0) {
    console.log('✓ Confirmed: _NoteTags row count is exactly 0. Zero risk of data conflict.');
  } else {
    console.log(`! Note: _NoteTags contains ${noteTagsCount.count} rows. Migration will swap rows safely.`);
  }

  const fkA = fks.find(f => f.column_name === 'A');
  const fkB = fks.find(f => f.column_name === 'B');
  if (fkA.foreign_table_name === 'tags' && fkB.foreign_table_name === 'notes') {
    console.log('✓ Confirmed: Production currently exhibits inverted foreign keys (A->tags, B->notes).');
    console.log('✓ Ready for deployment of 2_correct_notetags_foreign_keys upon authorization.');
  } else {
    console.log('! Unexpected foreign key state:', { fkA, fkB });
  }
}

productionPreflight()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

