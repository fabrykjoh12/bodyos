// Render public/icon.svg to the PNG sizes required by iOS/Android installs.
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const svg = await readFile('public/icon.svg', 'utf8');
const browser = await chromium.launch({ executablePath: process.env.BODYOS_CHROMIUM });
const sizes = [180, 192, 512];

for (const size of sizes) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>*{margin:0}body{background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.waitForTimeout(300);
  const buf = await page.screenshot({ omitBackground: true });
  await writeFile(`public/icon-${size}.png`, buf);
  await page.close();
  console.log(`icon-${size}.png`);
}
await browser.close();
