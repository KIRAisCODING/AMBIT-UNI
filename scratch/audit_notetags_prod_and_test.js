const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));

const prodDirectUrl = process.env.DIRECT_URL;
let testDirectUrl = process.env.DIRECT_URL;
if (testDirectUrl.includes('/neondb?')) {
  testDirectUrl = testDirectUrl.replace('/neondb?', '/ambit_test_db?');
} else if (testDirectUrl.includes('/neondb')) {
  testDirectUrl = testDirectUrl.replace('/neondb', '/ambit_test_db');
}

async function auditDatabase(name, url) {
  console.log(`\n======================================================`);
  console.log(` AUDITING DATABASE: ${name}`);
  console.log(`======================================================`);

  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    // 1. Migration History
    const migrations = await client.$queryRawUnsafe(`
      SELECT id, migration_name, finished_at, rolled_back_at, applied_steps_count
      FROM "_prisma_migrations"
      ORDER BY started_at ASC;
    `);
    console.log('\n--- Prisma Migrations ---');
    console.table(migrations);

    // 2. _NoteTags Columns
    const columns = await client.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = '_NoteTags'
      ORDER BY ordinal_position ASC;
    `);
    console.log('\n--- _NoteTags Columns ---');
    console.table(columns);

    // 3. _NoteTags Constraints & Foreign Keys
    const fks = await client.$queryRawUnsafe(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = '_NoteTags'
      ORDER BY tc.constraint_type, tc.constraint_name, kcu.column_name;
    `);
    console.log('\n--- _NoteTags Constraints ---');
    console.table(fks);

    // 4. _NoteTags Indexes
    const indexes = await client.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = '_NoteTags';
    `);
    console.log('\n--- _NoteTags Indexes ---');
    console.table(indexes);

    // 5. Counts
    const [noteTagsCount] = await client.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "_NoteTags";`);
    const [taskTagsCount] = await client.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "_TaskTags";`);
    const [notesCount] = await client.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "notes";`);
    const [tagsCount] = await client.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "tags";`);

    console.log('\n--- Table Counts ---');
    console.log({
      _NoteTags: noteTagsCount.count,
      _TaskTags: taskTagsCount.count,
      notes: notesCount.count,
      tags: tagsCount.count,
    });

  } finally {
    await client.$disconnect();
  }
}

async function main() {
  await auditDatabase('PRODUCTION (neondb)', prodDirectUrl);
  await auditDatabase('TEST DATABASE (ambit_test_db)', testDirectUrl);
}

main().catch(console.error);

