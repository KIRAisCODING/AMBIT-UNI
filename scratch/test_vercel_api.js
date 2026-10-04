const http = require('http');

async function runVercelIntegrationTests() {
  console.log('=== STARTING VERCEL ARCHITECTURE & API INTEGRATION TESTS ===\n');
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

  const BASE_URL = 'http://localhost:3000';

  // 1. Health check endpoint test
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    assert(res.status === 200 && data.status === 'ok', 'Health endpoint GET /api/health returns 200 ok');
    assert(data.status === 'ok' && !data.env && !data.DATABASE_URL && !data.AUTH_SECRET, 'Health endpoint does not leak environment secrets or paths');
  } catch (err) {
    assert(false, 'Health endpoint GET /api/health', err.message);
  }

  // 2. Auth CSRF endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/auth/csrf`);
    const data = await res.json();
    assert(res.status === 200 && typeof data.csrfToken === 'string' && data.csrfToken.length > 10, 'NextAuth /api/auth/csrf generates valid CSRF token');
  } catch (err) {
    assert(false, 'NextAuth CSRF', err.message);
  }

  // 3. Unauthorized access checks (User isolation / auth verification)
  const protectedRoutes = [
    { url: '/api/tasks', method: 'GET' },
    { url: '/api/tasks', method: 'POST', body: JSON.stringify({ content: 'Test' }) },
    { url: '/api/inbox', method: 'GET' },
    { url: '/api/inbox', method: 'POST', body: JSON.stringify({ content: 'Test' }) },
    { url: '/api/habits', method: 'GET' },
    { url: '/api/habits', method: 'POST', body: JSON.stringify({ name: 'Test' }) },
    { url: '/api/sidebar', method: 'GET' },
    { url: '/api/feedback', method: 'POST', body: JSON.stringify({ rating: 5 }) },
    { url: '/api/brain/analyze', method: 'POST', body: JSON.stringify({ content: 'Test' }) },
    { url: '/api/brain/chat', method: 'POST', body: JSON.stringify({ messages: [{ text: 'Hello' }] }) },
    { url: '/api/analytics', method: 'GET' },
    { url: '/api/calendar', method: 'GET' },
    { url: '/api/settings', method: 'GET' },
  ];

  for (const route of protectedRoutes) {
    try {
      const res = await fetch(`${BASE_URL}${route.url}`, {
        method: route.method,
        headers: { 'Content-Type': 'application/json' },
        body: route.body,
      });
      const data = await res.json().catch(() => null);
      assert(res.status === 401 && (data?.error === 'Unauthorized' || data?.error?.toLowerCase().includes('unauthorized')), `Unauthenticated ${route.method} ${route.url} is blocked with 401`);
    } catch (err) {
      assert(false, `Unauthenticated ${route.method} ${route.url}`, err.message);
    }
  }

  // 4. Security Headers check
  try {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.headers.get('x-content-type-options') === 'nosniff', 'Security header: X-Content-Type-Options: nosniff');
    assert(res.headers.get('x-frame-options') === 'DENY', 'Security header: X-Frame-Options: DENY');
    assert(res.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Security header: Referrer-Policy');
    assert(Boolean(res.headers.get('permissions-policy')), 'Security header: Permissions-Policy');
    assert(Boolean(res.headers.get('content-security-policy')), 'Security header: Content-Security-Policy');
  } catch (err) {
    assert(false, 'Security headers verification', err.message);
  }

  // 5. Frontend SPA delivery
  try {
    const res = await fetch(`${BASE_URL}/`);
    const text = await res.text();
    assert(res.status === 200, 'GET / returns HTTP 200');
    assert(text.includes('<div id="root"></div>'), 'GET / delivers React SPA root element');
    assert(text.includes('src="/assets/index-'), 'GET / references compiled asset bundle');
  } catch (err) {
    assert(false, 'Frontend SPA delivery GET /', err.message);
  }

  // 6. SPA Client-Side Routing Fallback
  const clientRoutes = ['/analytics', '/habits', '/calendar', '/inbox', '/settings'];
  for (const clientRoute of clientRoutes) {
    try {
      const res = await fetch(`${BASE_URL}${clientRoute}`);
      const text = await res.text();
      assert(res.status === 200 && text.includes('<div id="root"></div>'), `Client route ${clientRoute} rewrites to SPA index.html`);
    } catch (err) {
      assert(false, `Client route ${clientRoute}`, err.message);
    }
  }

  // 7. Static Asset Serving
  try {
    const rootRes = await fetch(`${BASE_URL}/`);
    const rootHtml = await rootRes.text();
    const cssMatch = rootHtml.match(/href="(\/assets\/index-[^"]+\.css)"/);
    const jsMatch = rootHtml.match(/src="(\/assets\/index-[^"]+\.js)"/);

    if (cssMatch && cssMatch[1]) {
      const cssRes = await fetch(`${BASE_URL}${cssMatch[1]}`);
      assert(cssRes.status === 200 && cssRes.headers.get('content-type')?.includes('text/css'), `CSS bundle ${cssMatch[1]} serves with 200 text/css`);
    } else {
      assert(false, 'CSS bundle found in HTML', 'No CSS link match');
    }

    if (jsMatch && jsMatch[1]) {
      const jsRes = await fetch(`${BASE_URL}${jsMatch[1]}`);
      assert(jsRes.status === 200 && jsRes.headers.get('content-type')?.includes('javascript'), `JS bundle ${jsMatch[1]} serves with 200 javascript`);
    } else {
      assert(false, 'JS bundle found in HTML', 'No JS script match');
    }
  } catch (err) {
    assert(false, 'Static asset verification', err.message);
  }

  console.log(`\n=== VERCEL INTEGRATION TESTS COMPLETE ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVercelIntegrationTests();
