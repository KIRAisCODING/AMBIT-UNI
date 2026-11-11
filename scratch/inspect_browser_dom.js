const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 3892;
const DEBUG_PORT = 9222;

// 1. Static & Mock Server
const staticDir = path.resolve(__dirname, '../backend/public');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/assets/')) {
    const filePath = path.join(staticDir, pathname);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mime = ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  if (pathname === '/api/auth/session') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      user: { id: 'usr_test_browser', name: 'Browser Tester', email: 'test@ambit.ai' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    }));
  }

  if (pathname === '/api/settings') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      userName: 'Browser Tester',
      userEmail: 'test@ambit.ai',
      theme: 'light',
      dailyReviewReminder: true,
      streakAlerts: true,
      calendarSync: false,
      onboardingCompleted: true,
    }));
  }

  if (pathname === '/api/areas' || pathname === '/api/sidebar') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([]));
  }
  if (pathname === '/api/tasks' || pathname === '/api/inbox' || pathname === '/api/notes' || pathname === '/api/habits') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([]));
  }
  if (pathname === '/api/dashboard') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      greeting: { userName: 'Browser Tester', dateFormatted: 'Wednesday, Nov 11' },
      todayFocus: { overdueCount: 0, dueTodayCount: 0, inProgressCount: 0, tasks: [] },
      upcomingHorizon: [],
      activeProjects: [],
      habitsSnapshot: [],
      inboxSnapshot: [],
    }));
  }
  if (pathname === '/api/calendar') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      startDate: '2026-11-01', endDate: '2026-11-30',
      tasks: [], unscheduledTasks: [], habitLogs: [], habits: [], projectMilestones: []
    }));
  }
  if (pathname === '/api/analytics') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      momentumData: [], trendStatus: { text: 'Stable', color: 'text-gray-500' },
      areaProgress: {}, thisWeekMetrics: { tasksCompleted: 0, habitsMaintained: 0, activeProjects: 0 }
    }));
  }

  const indexPath = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return fs.createReadStream(indexPath).pipe(res);
  }
  res.writeHead(404);
  res.end('Not found');
});

async function inspectViewport(width, height) {
  return new Promise((resolve, reject) => {
    const chrome = spawn(CHROME_PATH, [
      '--headless=new',
      `--window-size=${width},${height}`,
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--no-sandbox',
      '--disable-gpu',
      `http://localhost:${PORT}/`,
    ]);

    setTimeout(async () => {
      try {
        const versionRes = await fetch(`http://localhost:${DEBUG_PORT}/json/version`);
        const versionData = await versionRes.json();
        
        const listRes = await fetch(`http://localhost:${DEBUG_PORT}/json/list`);
        const listData = await listRes.json();
        const page = listData.find(t => t.type === 'page');

        if (!page || !page.webSocketDebuggerUrl) {
          throw new Error('No page WebSocket URL found');
        }

        const WebSocket = require(path.join(__dirname, '../backend/node_modules/ws'));
        const ws = new WebSocket(page.webSocketDebuggerUrl);

        ws.on('open', () => {
          let id = 1;
          const evaluate = (expression) => {
            return new Promise((resEval) => {
              const reqId = id++;
              const handler = (msg) => {
                const data = JSON.parse(msg.toString());
                if (data.id === reqId) {
                  ws.removeListener('message', handler);
                  resEval(data.result?.result?.value);
                }
              };
              ws.on('message', handler);
              ws.send(JSON.stringify({
                id: reqId,
                method: 'Runtime.evaluate',
                params: { expression, returnByValue: true }
              }));
            });
          };

          (async () => {
            // Wait for React to render
            await new Promise(r => setTimeout(r, 1200));

            const inspection = await evaluate(`
              (() => {
                const drawer = document.getElementById('main-drawer');
                const hamburger = document.querySelector('button[title="Open sidebar"]');
                const navItems = Array.from(document.querySelectorAll('nav button, nav a')).map(el => el.textContent.trim()).filter(Boolean);
                const captureInput = document.getElementById('capture-input');
                const rect = drawer ? drawer.getBoundingClientRect() : null;

                return {
                  viewportWidth: window.innerWidth,
                  viewportHeight: window.innerHeight,
                  drawerFound: !!drawer,
                  drawerTransform: drawer ? window.getComputedStyle(drawer).transform : null,
                  drawerRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
                  hamburgerVisible: !!hamburger && window.getComputedStyle(hamburger).display !== 'none',
                  navItems: navItems.slice(0, 10),
                  bodyBg: window.getComputedStyle(document.body).backgroundColor,
                };
              })()
            `);

            ws.close();
            chrome.kill();
            resolve(inspection);
          })().catch(err => {
            ws.close();
            chrome.kill();
            reject(err);
          });
        });

        ws.on('error', (err) => {
          chrome.kill();
          reject(err);
        });
      } catch (err) {
        chrome.kill();
        reject(err);
      }
    }, 1500);
  });
}

async function main() {
  await new Promise(r => server.listen(PORT, r));
  console.log('Testing Chrome Viewport DOM Geometry via DevTools Protocol (CDP)...\n');

  try {
    console.log('--- Inspecting Desktop Viewport (1440 x 900) ---');
    const desktopDOM = await inspectViewport(1440, 900);
    console.log('Desktop DOM Metrics:');
    console.log(`  Viewport: ${desktopDOM.viewportWidth} x ${desktopDOM.viewportHeight}`);
    console.log(`  Drawer Found: ${desktopDOM.drawerFound}`);
    console.log(`  Drawer Box: width=${desktopDOM.drawerRect?.width}px, x=${desktopDOM.drawerRect?.x}px`);
    console.log(`  Drawer Transform: ${desktopDOM.drawerTransform}`);
    console.log(`  Floating Hamburger Visible: ${desktopDOM.hamburgerVisible}`);
    console.log(`  Nav Items Detected: ${desktopDOM.navItems.join(', ')}`);

    console.log('\n--- Inspecting Mobile Viewport (375 x 667) ---');
    const mobileDOM = await inspectViewport(375, 667);
    console.log('Mobile DOM Metrics:');
    console.log(`  Viewport: ${mobileDOM.viewportWidth} x ${mobileDOM.viewportHeight}`);
    console.log(`  Drawer Found: ${mobileDOM.drawerFound}`);
    console.log(`  Drawer Box: width=${mobileDOM.drawerRect?.width}px, x=${mobileDOM.drawerRect?.x}px`);
    console.log(`  Drawer Transform: ${mobileDOM.drawerTransform}`);
    console.log(`  Floating Hamburger Visible: ${mobileDOM.hamburgerVisible}`);

    console.log('\n--- Inspecting Tablet Viewport (768 x 1024) ---');
    const tabletDOM = await inspectViewport(768, 1024);
    console.log('Tablet DOM Metrics:');
    console.log(`  Viewport: ${tabletDOM.viewportWidth} x ${tabletDOM.viewportHeight}`);
    console.log(`  Drawer Found: ${tabletDOM.drawerFound}`);
    console.log(`  Drawer Box: width=${tabletDOM.drawerRect?.width}px, x=${tabletDOM.drawerRect?.x}px`);
    console.log(`  Drawer Transform: ${tabletDOM.drawerTransform}`);
    console.log(`  Floating Hamburger Visible: ${tabletDOM.hamburgerVisible}`);

    console.log('\n✓ Chrome DOM Inspection Completed Successfully.');
  } finally {
    server.close();
  }
}

main().catch(console.error);

