const path = require('path');
const fs = require('fs');
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

async function testWithExistingRecords() {
  console.log('========================================================================');
  console.log(' TESTING MIGRATION SAFETY WHEN _NoteTags ALREADY CONTAINS LEGACY ROWS');
  console.log('========================================================================\n');

  // Pre-cleanup in rehearsal DB
  await prisma.user.deleteMany({});

  // 1. Setup User, Tag, and Note
  const user = await prisma.user.create({
    data: { email: 'legacy_test@ambit.ai', name: 'Legacy Test User' },
  });
  const tag = await prisma.tag.create({
    data: { userId: user.id, name: 'legacy-tag' },
  });
  const note = await prisma.note.create({
    data: { userId: user.id, title: 'Legacy Note', content: 'Testing legacy migration safety' },
  });

  // 2. Temporarily set up inverted foreign keys (legacy 1_init_ambit_v1 orientation)
  console.log('Temporarily setting up inverted legacy constraints on _NoteTags...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" DROP CONSTRAINT IF EXISTS "_NoteTags_A_fkey";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" DROP CONSTRAINT IF EXISTS "_NoteTags_B_fkey";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_A_fkey" FOREIGN KEY ("A") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_B_fkey" FOREIGN KEY ("B") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);

  // 3. Insert legacy row where A = tag.id and B = note.id
  console.log('Inserting legacy row with A = tagId, B = noteId...');
  await prisma.$executeRawUnsafe(`INSERT INTO "_NoteTags" ("A", "B") VALUES ('${tag.id}', '${note.id}');`);

  const [legacyRow] = await prisma.$queryRawUnsafe(`SELECT * FROM "_NoteTags";`);
  console.log('Legacy row inserted:', legacyRow);
  if (legacyRow.A !== tag.id || legacyRow.B !== note.id) {
    throw new Error('Failed to set up legacy row');
  }

  // 4. Apply 2_correct_notetags_foreign_keys migration SQL statements
  console.log('\nExecuting 2_correct_notetags_foreign_keys migration statements...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" DROP CONSTRAINT IF EXISTS "_NoteTags_A_fkey";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" DROP CONSTRAINT IF EXISTS "_NoteTags_B_fkey";`);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM "_NoteTags" nt
        JOIN "tags" t ON nt."A" = t."id"
        JOIN "notes" n ON nt."B" = n."id"
      ) THEN
        UPDATE "_NoteTags"
        SET "A" = "B", "B" = "A"
        WHERE "A" IN (SELECT "id" FROM "tags") AND "B" IN (SELECT "id" FROM "notes");
      END IF;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_A_fkey" FOREIGN KEY ("A") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  console.log('Migration executed successfully.');

  // 5. Inspect the row after migration
  const [migratedRow] = await prisma.$queryRawUnsafe(`SELECT * FROM "_NoteTags";`);
  console.log('Row after migration:', migratedRow);

  if (migratedRow.A !== note.id || migratedRow.B !== tag.id) {
    throw new Error(`Expected row to be swapped to A=noteId (${note.id}) and B=tagId (${tag.id}), got: ${JSON.stringify(migratedRow)}`);
  }
  console.log('✓ SUCCESS: Legacy row was safely and automatically swapped in place!');

  // 6. Verify foreign keys after migration
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
  console.log('Post-migration foreign keys on _NoteTags:');
  console.table(fks);

  const fkA = fks.find(f => f.column_name === 'A');
  const fkB = fks.find(f => f.column_name === 'B');
  if (fkA.foreign_table_name !== 'notes' || fkB.foreign_table_name !== 'tags') {
    throw new Error('Foreign keys not correctly restored');
  }
  console.log('✓ Foreign keys valid and consistent with swapped data!');

  // Clean up
  await prisma.user.delete({ where: { id: user.id } });
  console.log('\nCleaned test data. ALL PRESERVATION TESTS PASSED!');
}

testWithExistingRecords()
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
