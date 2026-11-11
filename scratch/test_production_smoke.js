const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PROD_URL = 'https://ambit-uni.vercel.app';
const DEPLOYMENT_URL = 'https://ambit-8pet2lfge-harsheelchawdas-projects.vercel.app';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '../scratch/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ [PASS] ${testName}`);
    results.push({ name: testName, status: 'PASS' });
  } else {
    failed++;
    console.error(`  ✗ [FAIL] ${testName} - ${details}`);
    results.push({ name: testName, status: 'FAIL', details });
  }
}

async function runSmokeTests() {
  console.log('========================================================================');
  console.log(' AMBIT STAGE 4 — PRODUCTION DEPLOYMENT & POST-DEPLOY SMOKE TEST SUITE');
  console.log(` Target Domain: ${PROD_URL}`);
  console.log(` Deployment URL: ${DEPLOYMENT_URL}`);
  console.log(' Target Commit: e17bd33');
  console.log('========================================================================\n');

  // ---------------------------------------------------------------------------
  // SECTION 1: Production Public Endpoints, Headers & SPA Architecture
  // ---------------------------------------------------------------------------
  console.log('--- Section 1: Production Health, Security & Routing Architecture ---');

  // 1.1 Health endpoint
  try {
    const res = await fetch(`${PROD_URL}/api/health`);
    const data = await res.json();
    assert(res.status === 200 && data.status === 'ok', 'GET /api/health returns HTTP 200 { status: "ok" }');
    assert(!data.env && !data.DATABASE_URL && !data.AUTH_SECRET, 'Health endpoint does not expose environment secrets');

    // 1.2 Backend Security Headers (enforced by Next.js /api/*)
    const hsts = res.headers.get('strict-transport-security');
    const nosniff = res.headers.get('x-content-type-options');
    const frameOptions = res.headers.get('x-frame-options');
    const referrer = res.headers.get('referrer-policy');
    const csp = res.headers.get('content-security-policy');
    const permissions = res.headers.get('permissions-policy');

    assert(Boolean(hsts && hsts.includes('max-age=31536000')), 'API HSTS header enforced with max-age=31536000');
    assert(nosniff === 'nosniff', 'API X-Content-Type-Options: nosniff enforced');
    assert(frameOptions === 'DENY', 'API X-Frame-Options: DENY enforced');
    assert(referrer === 'strict-origin-when-cross-origin', 'API Referrer-Policy: strict-origin-when-cross-origin enforced');
    assert(Boolean(csp && csp.includes("default-src 'self'")), 'API Content-Security-Policy header enforced');
    assert(Boolean(permissions && permissions.includes('camera=()')), 'API Permissions-Policy header enforced');
  } catch (err) {
    assert(false, 'GET /api/health & security headers', err.message);
  }

  // 1.3 SPA Root Delivery
  try {
    const res = await fetch(`${PROD_URL}/`);
    const html = await res.text();
    assert(res.status === 200, 'GET / returns HTTP 200');
    assert(html.includes('<div id="root"></div>'), 'Root HTML delivers React SPA root mount node');
    assert(html.includes('/assets/index-'), 'Root HTML references compiled asset chunks');

    // Edge Security Headers on root
    const edgeHsts = res.headers.get('strict-transport-security');
    assert(Boolean(edgeHsts && edgeHsts.includes('max-age=')), 'Vercel Edge HSTS enforced on production domain');
  } catch (err) {
    assert(false, 'SPA Root Delivery', err.message);
  }

  // 1.4 Single-Entrypoint SPA Architecture Verification
  try {
    const res = await fetch(`${PROD_URL}/?tab=Dashboard`);
    assert(res.status === 200, 'SPA handles parameter-driven navigation at root with HTTP 200');
    const html = await res.text();
    assert(html.includes('<div id="root"></div>'), 'SPA root renders cleanly for client sessions');
  } catch (err) {
    assert(false, 'SPA Architecture Verification', err.message);
  }

  // 1.5 Static Assets Serving
  try {
    const rootRes = await fetch(`${PROD_URL}/`);
    const rootHtml = await rootRes.text();
    const cssMatch = rootHtml.match(/href="(\/assets\/index-[^"]+\.css)"/);
    const jsMatch = rootHtml.match(/src="(\/assets\/index-[^"]+\.js)"/);

    if (cssMatch && cssMatch[1]) {
      const cssRes = await fetch(`${PROD_URL}${cssMatch[1]}`);
      assert(cssRes.status === 200 && cssRes.headers.get('content-type')?.includes('text/css'), `CSS bundle ${cssMatch[1]} serves with HTTP 200 text/css`);
    } else {
      assert(false, 'CSS bundle extraction', 'No CSS asset tag found');
    }
    if (jsMatch && jsMatch[1]) {
      const jsRes = await fetch(`${PROD_URL}${jsMatch[1]}`);
      assert(jsRes.status === 200 && jsRes.headers.get('content-type')?.includes('javascript'), `JS bundle ${jsMatch[1]} serves with HTTP 200 javascript`);
    } else {
      assert(false, 'JS bundle extraction', 'No JS asset tag found');
    }
  } catch (err) {
    assert(false, 'Static asset verification', err.message);
  }

  // ---------------------------------------------------------------------------
  // SECTION 2: Authentication Handlers & Security Enforcement
  // ---------------------------------------------------------------------------
  console.log('\n--- Section 2: Authentication Handlers & Security Enforcement ---');

  // 2.1 Unauthenticated API Protection (10 core protected routes)
  const protectedApis = [
    { method: 'GET', url: '/api/tasks' },
    { method: 'POST', url: '/api/tasks', body: { title: 'Test' } },
    { method: 'GET', url: '/api/inbox' },
    { method: 'POST', url: '/api/inbox', body: { content: 'Test' } },
    { method: 'GET', url: '/api/notes' },
    { method: 'GET', url: '/api/habits' },
    { method: 'GET', url: '/api/dashboard' },
    { method: 'GET', url: '/api/calendar' },
    { method: 'GET', url: '/api/analytics' },
    { method: 'GET', url: '/api/settings' },
  ];

  for (const api of protectedApis) {
    try {
      const res = await fetch(`${PROD_URL}${api.url}`, {
        method: api.method,
        headers: { 'Content-Type': 'application/json' },
        body: api.body ? JSON.stringify(api.body) : undefined,
      });
      assert(res.status === 401, `Protected endpoint ${api.method} ${api.url} rejects unauthenticated request with HTTP 401`);
    } catch (err) {
      assert(false, `Protected endpoint ${api.method} ${api.url}`, err.message);
    }
  }

  // 2.2 Auth CSRF Token and Cookie
  let csrfToken = '';
  let cookieHeader = '';
  try {
    const res = await fetch(`${PROD_URL}/api/auth/csrf`);
    const data = await res.json();
    csrfToken = data.csrfToken;

    const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
    cookieHeader = cookies.filter(Boolean).map(c => c.split(';')[0]).join('; ');

    assert(res.status === 200 && typeof csrfToken === 'string' && csrfToken.length > 20, 'GET /api/auth/csrf returns valid CSRF token');
    assert(cookieHeader.includes('__Host-authjs.csrf-token'), 'CSRF endpoint issues secure __Host-authjs.csrf-token cookie');
  } catch (err) {
    assert(false, 'GET /api/auth/csrf', err.message);
  }

  // 2.3 Google OAuth Initiation Flow
  try {
    const params = new URLSearchParams();
    params.append('csrfToken', csrfToken);
    params.append('callbackUrl', `${PROD_URL}/`);

    const res = await fetch(`${PROD_URL}/api/auth/signin/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
      },
      body: params.toString(),
      redirect: 'manual',
    });

    const location = res.headers.get('location');
    assert(res.status === 302 && Boolean(location && location.includes('accounts.google.com')), 'POST /api/auth/signin/google initiates OAuth 2.0 with HTTP 302 redirect');
    assert(location.includes('o/oauth2/v2/auth') || location.includes('oauth2/v2/auth'), 'OAuth redirect URL targets Google OAuth 2.0 endpoint');
    assert(location.includes('response_type=code'), 'OAuth request specifies response_type=code (authorization code flow)');
    assert(location.includes('redirect_uri=https%3A%2F%2Fambit-uni.vercel.app%2Fapi%2Fauth%2Fcallback%2Fgoogle'), 'OAuth redirect_uri accurately matches production callback URL');
    assert(location.includes('code_challenge='), 'OAuth request enforces PKCE with code_challenge parameter');
  } catch (err) {
    assert(false, 'POST /api/auth/signin/google redirect', err.message);
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: Production Database Connectivity & Isolated Data Parity Check
  // ---------------------------------------------------------------------------
  console.log('\n--- Section 3: Database Connectivity & Isolated Verification ---');

  const envPath = path.resolve(__dirname, '../backend/.env');
  const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
  dotenv.config({ path: envPath });

  const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  try {
    // 3.1 Verify existing production user data integrity
    const userCount = await prisma.user.count();
    const accountCount = await prisma.account.count();
    const settingsCount = await prisma.settings.count();

    assert(userCount === 10, `Existing production Users intact (expected: 10, got: ${userCount})`);
    assert(accountCount === 9, `Existing production Accounts intact (expected: 9, got: ${accountCount})`);
    assert(settingsCount === 10, `Existing production Settings intact (expected: 10, got: ${settingsCount})`);

    // 3.2 Verify zero pending migrations in production
    const migrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at ASC;
    `);
    assert(migrations.length === 3, `All 3 production migrations confirmed applied (count: ${migrations.length})`);

    // 3.3 Execute isolated CRUD smoke test with dedicated isolated record
    const smokeEmail = 'stage4-prod-smoke@ambit.ai';
    const smokeUser = await prisma.user.upsert({
      where: { email: smokeEmail },
      update: {},
      create: {
        id: 'usr_smoke_' + Date.now(),
        email: smokeEmail,
        name: 'Stage 4 Production Smoke Tester',
      },
    });
    assert(Boolean(smokeUser.id), 'Isolated smoke-test user upserted cleanly');

    // Create Capture
    const smokeCapture = await prisma.capture.create({
      data: {
        userId: smokeUser.id,
        content: 'Production Release Smoke Capture',
        status: 'INBOX',
      },
    });
    assert(smokeCapture.content === 'Production Release Smoke Capture', 'Capture created successfully in production');

    // Create Task
    const smokeTask = await prisma.task.create({
      data: {
        userId: smokeUser.id,
        title: 'Production Verification Task',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: new Date(),
        scheduledDate: '2026-11-12',
      },
    });
    assert(smokeTask.title === 'Production Verification Task', 'Task created successfully with dual-date support');

    // Create Note
    const smokeNote = await prisma.note.create({
      data: {
        userId: smokeUser.id,
        title: 'Release Verification Note',
        content: '# Release Successful\nAll systems operational.',
        pinned: true,
      },
    });
    assert(smokeNote.pinned === true, 'Note created successfully with pinned = true');

    // Create Habit & HabitLog
    const smokeHabit = await prisma.habit.create({
      data: {
        userId: smokeUser.id,
        name: 'Daily Platform Health Check',
        frequency: 'DAILY',
      },
    });
    const smokeLog = await prisma.habitLog.create({
      data: {
        userId: smokeUser.id,
        habitId: smokeHabit.id,
        date: '2026-11-11',
      },
    });
    assert(Boolean(smokeLog.id), 'Habit and normalized HabitLog check-in created successfully');

    // Clean up isolated smoke test records immediately
    await prisma.habitLog.deleteMany({ where: { habitId: smokeHabit.id } });
    await prisma.habit.delete({ where: { id: smokeHabit.id } });
    await prisma.note.delete({ where: { id: smokeNote.id } });
    await prisma.task.delete({ where: { id: smokeTask.id } });
    await prisma.capture.delete({ where: { id: smokeCapture.id } });
    await prisma.user.delete({ where: { id: smokeUser.id } });

    // Verify existing user data counts remain exactly preserved
    const finalUserCount = await prisma.user.count();
    assert(finalUserCount === 10, 'Existing user data completely undisturbed after smoke test cleanup');
  } catch (err) {
    assert(false, 'Production Database Connectivity & Isolated CRUD', err.message);
  } finally {
    await prisma.$disconnect();
  }

  // ---------------------------------------------------------------------------
  // SECTION 4: Live Headless Chrome Visual Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- Section 4: Live Headless Chrome Production Visual Verification ---');

  function captureScreenshot(width, height, file) {
    return new Promise((resolve, reject) => {
      const args = [
        '--headless=new',
        `--window-size=${width},${height}`,
        `--screenshot=${file}`,
        '--hide-scrollbars',
        '--disable-gpu',
        '--no-sandbox',
        PROD_URL,
      ];
      const proc = spawn(CHROME_PATH, args, { stdio: 'ignore' });
      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(file)) {
          resolve({ success: true, size: fs.statSync(file).size });
        } else {
          reject(new Error(`Chrome failed with code ${code}`));
        }
      });
      proc.on('error', reject);
    });
  }

  try {
    const desktopFile = path.join(SCREENSHOT_DIR, 'prod_desktop_1440x900.png');
    const dRes = await captureScreenshot(1440, 900, desktopFile);
    assert(dRes.success, `Live Desktop viewport (1440x900) captured: ${desktopFile} (${dRes.size} bytes)`);

    const tabletFile = path.join(SCREENSHOT_DIR, 'prod_tablet_768x1024.png');
    const tRes = await captureScreenshot(768, 1024, tabletFile);
    assert(tRes.success, `Live Tablet viewport (768x1024) captured: ${tabletFile} (${tRes.size} bytes)`);

    const mobileFile = path.join(SCREENSHOT_DIR, 'prod_mobile_375x667.png');
    const mRes = await captureScreenshot(375, 667, mobileFile);
    assert(mRes.success, `Live Mobile viewport (375x667) captured: ${mobileFile} (${mRes.size} bytes)`);
  } catch (err) {
    assert(false, 'Live Chrome Visual Verification', err.message);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(` PRODUCTION SMOKE TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTests().catch((err) => {
  console.error('Smoke test suite failed:', err);
  process.exit(1);
});
