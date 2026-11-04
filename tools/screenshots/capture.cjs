const { createServer } = require('node:http');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { resolve, join, extname, sep } = require('node:path');
const { createRequire } = require('node:module');
const root = process.env.FOCUSSCALE_SCREENSHOT_ROOT || resolve(__dirname, '../..');
const out = resolve(process.env.FOCUSSCALE_SCREENSHOT_DIR || join(root, 'docs/screenshots'));
const { chromium, expect } = require(process.env.FOCUSSCALE_PLAYWRIGHT || '@playwright/test');
async function main() {
  await mkdir(out, { recursive: true });
  const errors = [],
    shots = [];
  const server = createServer(async (req, res) => {
    try {
      const u = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const f = resolve(root, '.' + (u === '/' ? '/index.html' : u));
      if (!f.startsWith(root + sep) || u.split('/').some((x) => x.startsWith('.'))) {
        res.writeHead(403).end();
        return;
      }
      res.setHeader(
        'Content-Type',
        {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'text/javascript',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.webmanifest': 'application/manifest+json',
        }[extname(f)] || 'application/octet-stream',
      );
      res.end(await readFile(f));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    const url = 'http://127.0.0.1:' + server.address().port;
    await page.goto(url);
    await expect(page.locator('#preview svg')).toBeVisible();
    async function shot(name, p = page) {
      await p.mouse.move(1, 1);
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(500);
      const png = await p.screenshot();
      const webp = await p.evaluate(async (base64) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + base64;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.toDataURL('image/webp', 0.9).split(',')[1];
      }, png.toString('base64'));
      const bytes = Buffer.from(webp, 'base64');
      await writeFile(join(out, name + '.webp'), bytes);
      shots.push({ name, ...p.viewportSize(), bytes: bytes.length });
      console.log('Captured', name);
    }
    await shot('workspace');
    const originalLens = await page.locator('#lens').inputValue();
    await page.locator('#search').fill('施耐德47');
    await expect(page.locator('#lens option')).toHaveCount(4);
    const xl = await page
      .locator('#lens option')
      .evaluateAll((options) => options.find((o) => o.textContent.includes('XL')).value);
    await page.locator('#lens').selectOption(xl);
    await shot('lens-search');
    await page.locator('#search').fill('');
    await page.locator('#lens').selectOption(originalLens);
    await page.locator('#mode').selectOption('measured');
    await page.locator('#calibration').fill('∞, 0\n10, 12\n5, 25\n2, 65\n1, 145');
    await page
      .locator('#calibration')
      .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await shot('calibration');
    await page.locator('#mode').selectOption('theory');
    await page.locator('#rotation').fill('1080');
    await page
      .locator('.result')
      .evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await shot('multi-turn');
    const csvWait = page.waitForEvent('download');
    await page.locator('#csv').click();
    const csv = await csvWait;
    const bytes = await readFile(await csv.path());
    if (!bytes.toString().includes('距离(m)')) throw Error('CSV export failed');
    const jsonWait = page.waitForEvent('download');
    await page.locator('#export-json').click();
    const json = await jsonWait;
    JSON.parse(await readFile(await json.path(), 'utf8'));
    await page.locator('#guide').scrollIntoViewIfNeeded();
    await shot('guide');
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    const m = await mobile.newPage();
    m.on('pageerror', (e) => errors.push(e.message));
    await m.goto(url);
    await m.locator('#search').scrollIntoViewIfNeeded();
    await m.locator('#search').tap();
    await expect(m.locator('#search')).toBeFocused();
    await shot('mobile-settings', m);
    await m
      .locator('.result')
      .evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await shot('mobile-preview', m);
    if (errors.length) throw Error(errors.join('\n'));
    await writeFile(
      join(out, 'capture-report.json'),
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          source: 'built-in lens catalogue and illustrative parameters; no physical calibration',
          csvAndJsonExportVerified: true,
          shots,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
