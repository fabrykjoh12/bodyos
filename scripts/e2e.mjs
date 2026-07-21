// End-to-end smoke of the core daily workflows against the BUILT app (dist/).
// Run: npm run build && npm run test:e2e
// Chromium resolution: $BODYOS_CHROMIUM (explicit executable) or the
// playwright package's managed browser (CI: npx playwright install chromium).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const PORT = Number(process.env.E2E_PORT ?? 4300);
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

const server = http.createServer(async (req, res) => {
  let file = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace('/bodyos', '') || '/index.html';
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

const browser = await chromium.launch(
  process.env.BODYOS_CHROMIUM ? { executablePath: process.env.BODYOS_CHROMIUM } : {},
);
// ONE shared context: flows build on each other's storage like a real user's
// browser session (fresh install -> onboard -> train -> review history).
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

let failures = 0;
async function flow(name, run) {
  const page = await ctx.newPage();
  try {
    await run(page);
    console.log(`ok  ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`FAIL ${name}: ${e.message}`);
    await page.screenshot({ path: `e2e-failure-${name.replace(/\W+/g, '-')}.png` }).catch(() => {});
  } finally {
    await page.close();
  }
}

const base = `http://localhost:${PORT}/bodyos/`;

await flow('fresh install starts empty at onboarding', async (page) => {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  if (!page.url().includes('onboarding')) throw new Error(`landed on ${page.url()}`);
});

await flow('real onboarding -> personalized empty home', async (page) => {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(200);
  }
  await page.getByLabel(/your name/i).fill('E2E');
  await page.getByRole('button', { name: /start training/i }).click();
  await page.waitForTimeout(800);
  const text = await page.locator('body').innerText();
  if (/Lean bulk/.test(text)) throw new Error('seed phase leaked');
  if (!/E2E/.test(text)) throw new Error('name missing from home');
});

await flow('log a partial workout offline -> honest completion', async (page) => {
  await page.context().setOffline(false);
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  // Whole workout runs with the network cut — Gym Mode must not care.
  await page.context().setOffline(true);
  await page.getByRole('button', { name: /start session|train anyway/i }).first().click();
  await page.waitForTimeout(600);
  // First-session honesty: weight starts at 0 with the set-your-weight hint.
  const objective = await page.locator('body').innerText();
  if (!/set your starting weight/i.test(objective)) throw new Error('no starting-weight state');
  await page.getByRole('button', { name: 'Increase Weight' }).click({ clickCount: 4 });
  // Log only the first exercise's sets…
  for (let i = 0; i < 3; i++) {
    const log = page.getByRole('button', { name: /log set/i });
    if (await log.count()) await log.click();
    await page.waitForTimeout(150);
  }
  // …then finish PARTIALLY via the exit sheet's "Finish now" path.
  await page.getByRole('button', { name: /exit workout/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /finish now/i }).click();
  await page.waitForTimeout(800);
  const complete = await page.locator('body').innerText();
  if (!/of \d+ exercises done/i.test(complete)) throw new Error('partial completion not honest');
  if (!/Skipped:/i.test(complete)) throw new Error('skipped list missing');
  await page.context().setOffline(false);
});

await flow('history: open a session and correct a set', async (page) => {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const demo = page.getByRole('button', { name: /explore with demo data/i });
  if (await demo.count()) {
    await demo.click();
    await page.waitForTimeout(700);
  }
  await page.locator('section:has-text("Recent sessions") .row-list button').first().click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /edit set 1/i }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Increase Reps' }).click();
  await page.getByRole('button', { name: /save correction/i }).click();
  await page.waitForTimeout(400);
  if (await page.getByRole('dialog').count()) throw new Error('edit sheet did not close');
});

await flow('demo banner appears and clears', async (page) => {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /explore with demo data/i }).click();
  await page.waitForTimeout(700);
  let text = await page.locator('body').innerText();
  if (!/demo training data/i.test(text)) throw new Error('banner missing');
  await page.getByRole('button', { name: /clear demo data/i }).click();
  await page.waitForTimeout(700);
  text = await page.locator('body').innerText();
  if (/demo training data/i.test(text)) throw new Error('banner not cleared');
});

await browser.close();
server.close();
if (failures > 0) {
  console.error(`${failures} E2E flow(s) failed`);
  process.exit(1);
}
console.log('all E2E flows passed');
