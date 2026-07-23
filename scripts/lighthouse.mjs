// Lighthouse budget gate against the BUILT app (dist/), mobile emulation.
// Run: npm run build && npm run lighthouse
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const PORT = Number(process.env.LH_PORT ?? 4310);
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer(async (req, res) => {
  let file =
    decodeURIComponent(new URL(req.url, 'http://x').pathname).replace('/bodyos', '') ||
    '/index.html';
  if (file === '/' || file === '') file = '/index.html';
  try {
    const data = await readFile(join('dist', file));
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(await readFile(join('dist', 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const chrome = await launch({
  chromePath: process.env.BODYOS_CHROMIUM,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
});

// Budget: minimum acceptable score (0-1) per Lighthouse category, mobile emulation.
// Kept realistic for a client-rendered SPA on first load — not a race for 100s,
// a tripwire for regressions (e.g. a huge new dependency, a11y label removed).
const BUDGET = {
  performance: 0.45,
  accessibility: 0.85,
  'best-practices': 0.85,
  seo: 0.7,
};

let failed = false;
try {
  const result = await lighthouse(`http://localhost:${PORT}/bodyos/`, {
    port: chrome.port,
    output: 'json',
    onlyCategories: Object.keys(BUDGET),
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2 },
  });

  for (const [key, min] of Object.entries(BUDGET)) {
    const score = result.lhr.categories[key].score;
    const pct = Math.round(score * 100);
    const minPct = Math.round(min * 100);
    if (score < min) {
      failed = true;
      console.error(`FAIL ${key}: ${pct} < budget ${minPct}`);
    } else {
      console.log(`ok   ${key}: ${pct} (budget ${minPct})`);
    }
  }
} finally {
  await chrome.kill();
  server.close();
}

if (failed) {
  console.error('Lighthouse budget not met.');
  process.exit(1);
}
console.log('Lighthouse budget met.');
