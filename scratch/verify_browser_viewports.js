const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 3891;
const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 1. Create a mock authenticated API & static server serving the production SPA bundle
const staticDir = path.resolve(__dirname, '../backend/public');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // Static assets
  if (pathname.startsWith('/assets/')) {
    const filePath = path.join(staticDir, pathname);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mime = ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // API Mock Endpoints for Authenticated Session
  if (pathname === '/api/auth/session') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      user: {
        id: 'usr_test_browser',
        name: 'Browser Test Lead',
        email: 'test@ambit.ai',
        image: null,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    }));
  }

  if (pathname === '/api/settings') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      userName: 'Browser Test Lead',
      userEmail: 'test@ambit.ai',
      theme: 'light',
      dailyReviewReminder: true,
      streakAlerts: true,
      calendarSync: false,
      onboardingCompleted: true,
    }));
  }

  if (pathname === '/api/areas') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([
      {
        id: 'area_1',
        name: 'Work',
        icon: 'briefcase',
        order: 1,
        projects: [
          {
            id: 'proj_1',
            name: 'AMBIT Release',
            status: 'ACTIVE',
            subProjects: [{ id: 'sub_1', name: 'Frontend' }],
          },
        ],
      },
    ]));
  }

  if (pathname === '/api/sidebar') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([
      {
        id: 'area_1',
        name: 'Work',
        projects: [{ id: 'proj_1', name: 'AMBIT Release', subProjects: [{ id: 'sub_1', name: 'Frontend' }] }],
      },
    ]));
  }

  if (pathname === '/api/inbox') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([
      {
        id: 'cap_1',
        content: 'Review deployment checklist',
        rawContent: 'Review deployment checklist',
        status: 'INBOX',
        createdAt: new Date().toISOString(),
      },
    ]));
  }

  if (pathname === '/api/tasks') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([
      {
        id: 'task_1',
        title: 'Verify Stage 4 Browser Viewports',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: '2026-11-20T00:00:00.000Z',
        order: 0,
      },
    ]));
  }

  if (pathname === '/api/notes') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([
      {
        id: 'note_1',
        title: 'Deployment Architecture Notes',
        displayTitle: 'Deployment Architecture Notes',
        content: '# Deployment Strategy\nVerify browser viewports across mobile and desktop.',
        pinned: true,
        tags: ['release'],
        updatedAt: new Date().toISOString(),
      },
    ]));
  }

  if (pathname === '/api/habits') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([
      {
        id: 'habit_1',
        name: 'Code Review Daily',
        frequency: 'DAILY',
        currentStreak: 5,
        longestStreak: 12,
        completedToday: true,
      },
    ]));
  }

  if (pathname === '/api/dashboard') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      greeting: { userName: 'Browser Test Lead', dateFormatted: 'Wednesday, Nov 11' },
      todayFocus: { overdueCount: 0, dueTodayCount: 1, inProgressCount: 0, tasks: [] },
      upcomingHorizon: [],
      activeProjects: [],
      habitsSnapshot: [],
      inboxSnapshot: [],
    }));
  }

  if (pathname === '/api/calendar') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      tasks: [],
      unscheduledTasks: [],
      habitLogs: [],
      habits: [],
      projectMilestones: [],
    }));
  }

  if (pathname === '/api/analytics') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      momentumData: [{ date: '2026-11-11', completedCount: 5, label: 'Wed' }],
      trendStatus: { text: 'Consistent', color: 'text-green-500' },
      areaProgress: { Work: { total: 10, completed: 8, percentage: 80 } },
      thisWeekMetrics: { tasksCompleted: 8, habitsMaintained: 1, activeProjects: 1 },
    }));
  }

  // SPA fallback: serve index.html for all page routes
  const indexPath = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return fs.createReadStream(indexPath).pipe(res);
  }

  res.writeHead(404);
  res.end('Not found');
});

function runChromeScreenshot(width, height, outputFile) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      `--window-size=${width},${height}`,
      `--screenshot=${outputFile}`,
      '--hide-scrollbars',
      '--disable-gpu',
      '--no-sandbox',
      `http://localhost:${PORT}/`,
    ];

    const proc = spawn(CHROME_PATH, args, { stdio: 'ignore' });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        resolve({ success: true, size: stats.size });
      } else {
        reject(new Error(`Chrome exited with code ${code}`));
      }
    });
    proc.on('error', reject);
  });
}

async function run() {
  console.log('Starting local SPA verification server on port', PORT);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Server listening on http://localhost:${PORT}`);

  try {
    console.log('\n--- 1. Desktop Viewport Test (1440 x 900) ---');
    const desktopFile = path.join(SCREENSHOT_DIR, 'desktop_1440x900.png');
    const desktopResult = await runChromeScreenshot(1440, 900, desktopFile);
    console.log(`✓ Desktop screenshot captured: ${desktopFile} (${desktopResult.size} bytes)`);

    console.log('\n--- 2. Tablet Viewport Test (768 x 1024) ---');
    const tabletFile = path.join(SCREENSHOT_DIR, 'tablet_768x1024.png');
    const tabletResult = await runChromeScreenshot(768, 1024, tabletFile);
    console.log(`✓ Tablet screenshot captured: ${tabletFile} (${tabletResult.size} bytes)`);

    console.log('\n--- 3. Mobile Viewport Test (375 x 667) ---');
    const mobileFile = path.join(SCREENSHOT_DIR, 'mobile_375x667.png');
    const mobileResult = await runChromeScreenshot(375, 667, mobileFile);
    console.log(`✓ Mobile screenshot captured: ${mobileFile} (${mobileResult.size} bytes)`);

    console.log('\n===============================================================');
    console.log(' ALL 3 VIEWPORT BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('===============================================================\n');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});

