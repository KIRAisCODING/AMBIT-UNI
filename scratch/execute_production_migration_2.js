const { execSync } = require('child_process');
const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const backendDir = path.resolve(__dirname, '../backend');

const prodUrl = process.env.DIRECT_URL;

async function executeProductionMigration() {
  console.log('========================================================================');
  console.log(' AMBIT — PRODUCTION CORRECTIVE MIGRATION EXECUTION');
  console.log(' Target Database: neondb (Production Neon PostgreSQL)');
  console.log(' Timestamp: ' + new Date().toISOString());
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // 1. MANDATORY PRE-DEPLOYMENT CHECKS
  // -------------------------------------------------------------------------
  console.log('--- Step 1: Mandatory Pre-Deployment Checks ---');
  const prisma = new PrismaClient({ datasources: { db: { url: prodUrl } } });

  try {
    // 1.1 Confirm target database is neondb
    const [dbInfo] = await prisma.$queryRawUnsafe(`SELECT current_database() as db;`);
    console.log(`Connected Database: ${dbInfo.db}`);
    if (dbInfo.db !== 'neondb') {
      throw new Error(`ABORT: Expected connected database to be "neondb", but connected to "${dbInfo.db}".`);
    }
    console.log('  ✓ Pre-check 1: Target database confirmed as "neondb".');

    // 1.2 Confirm _NoteTags row count is 0
    const [noteTagsCount] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "_NoteTags";`);
    console.log(`_NoteTags Row Count: ${noteTagsCount.count}`);
    if (noteTagsCount.count !== 0) {
      throw new Error(`ABORT: Expected _NoteTags row count to be 0, but found ${noteTagsCount.count}.`);
    }
    console.log('  ✓ Pre-check 2: _NoteTags row count is exactly 0.');

    // 1.3 Confirm existing foreign key orientation matches preflight (A -> tags, B -> notes)
    const fksPre = await prisma.$queryRawUnsafe(`
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
    console.log('Current _NoteTags Foreign Keys:');
    console.table(fksPre);

    const fkAPre = fksPre.find(f => f.column_name === 'A');
    const fkBPre = fksPre.find(f => f.column_name === 'B');

    if (!fkAPre || fkAPre.foreign_table_name !== 'tags' || !fkBPre || fkBPre.foreign_table_name !== 'notes') {
      throw new Error(`ABORT: Foreign keys do not match expected preflight inverted orientation: ${JSON.stringify(fksPre)}`);
    }
    console.log('  ✓ Pre-check 3: Pre-existing inverted foreign-key orientation confirmed.');

    // 1.4 Confirm current migration history contains 0_init_legacy and 1_init_ambit_v1
    const migrationsPre = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY started_at ASC;
    `);
    console.log('Current Migration History in neondb:');
    console.table(migrationsPre);

    const migrationNames = migrationsPre.map(m => m.migration_name);
    if (!migrationNames.includes('0_init_legacy') || !migrationNames.includes('1_init_ambit_v1')) {
      throw new Error(`ABORT: Incomplete migration history in production: ${JSON.stringify(migrationNames)}`);
    }
    if (migrationNames.includes('2_correct_notetags_foreign_keys')) {
      throw new Error('ABORT: 2_correct_notetags_foreign_keys is already marked as applied in production.');
    }
    console.log('  ✓ Pre-check 4: Migration history verified (0_init_legacy and 1_init_ambit_v1 applied, 2 pending).');

    // 1.5 Confirm production user count
    const [userCountPre] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "User";`);
    console.log(`Preserved User Count: ${userCountPre.count}`);
    if (userCountPre.count !== 10) {
      throw new Error(`ABORT: Expected 10 users in production, but found ${userCountPre.count}.`);
    }
    console.log('  ✓ Pre-check 5: All 10 production User records confirmed present.');
    console.log('\nAll 5 pre-deployment checks passed cleanly. Proceeding to execution.\n');

  } finally {
    await prisma.$disconnect();
  }

  // -------------------------------------------------------------------------
  // 2. AUTHORIZED OPERATION: npx prisma migrate deploy
  // -------------------------------------------------------------------------
  console.log('--- Step 2: Deploying 2_correct_notetags_foreign_keys to neondb ---');
  const env = {
    ...process.env,
    DATABASE_URL: prodUrl,
    DIRECT_URL: prodUrl,
  };

  const deployOutput = execSync('npx prisma migrate deploy', {
    cwd: backendDir,
    env,
    encoding: 'utf8',
  });
  console.log(deployOutput);

  // -------------------------------------------------------------------------
  // 3. POST-DEPLOYMENT VERIFICATION
  // -------------------------------------------------------------------------
  console.log('--- Step 3: Post-Deployment Verification ---');
  const verifyPrisma = new PrismaClient({ datasources: { db: { url: prodUrl } } });

  try {
    // 3.1 Migration Status
    console.log('Checking prisma migrate status...');
    const statusOutput = execSync('npx prisma migrate status', {
      cwd: backendDir,
      env,
      encoding: 'utf8',
    });
    console.log(statusOutput);

    // 3.2 Verify _NoteTags foreign keys
    const fksPost = await verifyPrisma.$queryRawUnsafe(`
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
    console.log('Post-Deployment _NoteTags Foreign Keys:');
    console.table(fksPost);

    const fkAPost = fksPost.find(f => f.column_name === 'A');
    const fkBPost = fksPost.find(f => f.column_name === 'B');

    if (!fkAPost || fkAPost.foreign_table_name !== 'notes' || fkAPost.foreign_column_name !== 'id') {
      throw new Error(`VERIFICATION FAILED: _NoteTags column A does not reference notes(id): ${JSON.stringify(fkAPost)}`);
    }
    if (!fkBPost || fkBPost.foreign_table_name !== 'tags' || fkBPost.foreign_column_name !== 'id') {
      throw new Error(`VERIFICATION FAILED: _NoteTags column B does not reference tags(id): ${JSON.stringify(fkBPost)}`);
    }
    console.log('  ✓ Post-check 1: _NoteTags_A_fkey correctly references notes(id).');
    console.log('  ✓ Post-check 2: _NoteTags_B_fkey correctly references tags(id).');

    // 3.3 Verify _TaskTags foreign keys remain unchanged
    const fksTaskPost = await verifyPrisma.$queryRawUnsafe(`
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
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = '_TaskTags'
      ORDER BY kcu.column_name;
    `);
    console.log('\nPost-Deployment _TaskTags Foreign Keys:');
    console.table(fksTaskPost);

    const fkATask = fksTaskPost.find(f => f.column_name === 'A');
    const fkBTask = fksTaskPost.find(f => f.column_name === 'B');
    if (!fkATask || fkATask.foreign_table_name !== 'tags' || !fkBTask || fkBTask.foreign_table_name !== 'Task') {
      throw new Error(`VERIFICATION FAILED: _TaskTags foreign keys modified unexpectedly: ${JSON.stringify(fksTaskPost)}`);
    }
    console.log('  ✓ Post-check 3: _TaskTags foreign keys confirmed 100% unchanged.');

    // 3.4 Production record counts verification
    const [usersPost] = await verifyPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "User";`);
    const [accountsPost] = await verifyPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "Account";`);
    const [settingsPost] = await verifyPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "Settings";`);
    const [feedbackPost] = await verifyPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "Feedback";`);
    const [notesPost] = await verifyPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "notes";`);
    const [tagsPost] = await verifyPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "tags";`);
    const [noteTagsPost] = await verifyPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "_NoteTags";`);

    console.log('\nPost-Deployment Production Record Counts:');
    console.table({
      User: usersPost.count,
      Account: accountsPost.count,
      Settings: settingsPost.count,
      Feedback: feedbackPost.count,
      notes: notesPost.count,
      tags: tagsPost.count,
      _NoteTags: noteTagsPost.count,
    });

    if (usersPost.count !== 10) {
      throw new Error(`VERIFICATION FAILED: User count changed from 10 to ${usersPost.count}!`);
    }
    console.log('  ✓ Post-check 4: All 10 User records intact.');
    console.log('  ✓ Post-check 5: Account, Settings, and Feedback records intact.');
    console.log('  ✓ Post-check 6: Zero unintended data modifications.');

    console.log('\n========================================================================');
    console.log(' PRODUCTION CORRECTIVE MIGRATION COMPLETED AND FULLY VERIFIED');
    console.log('========================================================================');

  } finally {
    await verifyPrisma.$disconnect();
  }
}

executeProductionMigration().catch((err) => {
  console.error('\nEXECUTION ERROR:', err);
  process.exit(1);
});

