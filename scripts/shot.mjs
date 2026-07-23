// Screenshot harness for cloud sessions: serves dist/ at /bodyos/ and
// captures key screens at 390x844. Run from the repo root:
//   node scripts/shot.mjs [outDir]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const OUT = process.argv[2] ?? 'shots';
const PORT = 4173;
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!path.startsWith('/bodyos')) path = '/bodyos' + path;
  let file = path.replace('/bodyos', '') || '/index.html';
  if (file === '/' || file === '') file = '/index.html';
  try {
    const data = await readFile(join('dist', file));
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    const data = await readFile(join('dist', 'index.html'));
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(data);
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

async function shot(name, path, { fullPage = false, before } = {}) {
  await page.goto(`http://localhost:${PORT}/bodyos${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (before) await before();
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log('shot', name);
}

// Fresh installs start EMPTY at onboarding; opt into demo data via the
// explicit link (also exercises the real first-run flow).
await page.goto(`http://localhost:${PORT}/bodyos/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/00-onboarding.png` });
const demoLink = page.getByRole('button', { name: /explore with demo data/i });
if (await demoLink.count()) {
  await demoLink.click();
  await page.waitForTimeout(600);
}

await shot('01-home', '/');
await shot('01b-home-full', '/', { fullPage: true });
await shot('02-workouts', '/workouts');
await shot('03-stats', '/stats');
await shot('04-progress', '/progress');
await shot('05-exercises', '/exercises');
await shot('06-profile', '/profile');

// Start a session from the home hero to reach Gym Mode (rest days offer
// "Train anyway" instead of "Start session").
await page.goto(`http://localhost:${PORT}/bodyos/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const start = page.getByRole('button', { name: /start session|train anyway/i }).first();
if (await start.count()) {
  await start.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/07-gym-mode.png` });
  console.log('shot 07-gym-mode');
  // Log a couple of sets to show progress + rest timer.
  for (let i = 0; i < 2; i++) {
    const log = page.getByRole('button', { name: /log set/i });
    if (await log.count()) {
      await log.click();
      await page.waitForTimeout(400);
    }
  }
  await page.screenshot({ path: `${OUT}/08-gym-mode-logged.png` });
  console.log('shot 08-gym-mode-logged');

  // Drive the whole session to reach the complete screen.
  for (let i = 0; i < 80; i++) {
    if (await page.getByRole('button', { name: /finish workout/i }).count()) break;
    const log = page.getByRole('button', { name: /log set/i });
    if (await log.count()) await log.click();
    else {
      const next = page.getByRole('button', { name: /next exercise/i });
      if (await next.count()) await next.click();
    }
    await page.waitForTimeout(120);
  }
  const finish = page.getByRole('button', { name: /finish workout/i });
  if (await finish.count()) {
    await finish.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/09-complete.png` });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/09b-complete-settled.png` });
    await page.screenshot({ path: `${OUT}/09c-complete-full.png`, fullPage: true });
    console.log('shot 09-complete');
  } else {
    console.log('never reached finish');
  }
} else {
  console.log('no start button found');
}

await browser.close();
server.close();
