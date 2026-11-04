/**
 * Interaction test for the 3D explorer (needs a running dev/preview server).
 * Usage: node scripts/e2e/explorer.mjs [baseUrl] [screenshotDir]
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://127.0.0.1:4321';
const shots = process.argv[3];
if (shots) mkdirSync(shots, { recursive: true });

const failures = [];
const check = (c, m) => {
  if (!c) failures.push(m);
  console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`);
};
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function open(viewport, hash = '', touch = false) {
  const ctx = await browser.newContext({ viewport, colorScheme: 'dark', ...(touch ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${base}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__explorer, null, { timeout: 30000 });
  await page.waitForTimeout(2200);
  return { ctx, page, errors };
}
const dbg = (page) => page.evaluate(() => window.__explorer.debug());
const at = (page, key) => page.evaluate((k) => window.__explorer.screenOf(k), key);
/** Poll the page URL (waitForURL can miss a navigation that starts during another evaluate). */
async function urlBecomes(page, re, ms = 8000) {
  for (let t = 0; t < ms; t += 150) {
    if (re.test(page.url())) return true;
    await page.waitForTimeout(150);
  }
  return re.test(page.url());
}
/** Fire wheel events at a realistic rate (one gesture) from inside the page. */
async function wheel(page, deltaY, count, at = null) {
  await page.waitForFunction(() => !window.__explorer.debug().busy, null, { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.evaluate(
    ([dy, n, p]) =>
      new Promise((res) => {
        const c = document.querySelector('#stage canvas');
        let k = 0;
        const t = setInterval(() => {
          c.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, clientX: p ? p.x : innerWidth / 2, clientY: p ? p.y : innerHeight / 2, bubbles: true, cancelable: true }));
          if (++k >= n) {
            clearInterval(t);
            res();
          }
        }, 16);
      }),
    [deltaY, count, at],
  );
}
async function clickKey(page, key, dx = 0, dy = 0) {
  await page.waitForFunction(() => !window.__explorer.debug().busy, null, { timeout: 15000 });
  const p = await at(page, key);
  if (!p) return false;
  await page.mouse.click(p.x + dx, p.y + dy);
  return true;
}

// ---- desktop flow
{
  const { ctx, page, errors } = await open({ width: 1280, height: 800 });
  check((await dbg(page)).level === 'solar', 'starts in the solar system');
  check(await page.locator('.lbl', { hasText: '木星' }).isVisible(), 'planet labels are shown');
  check(await page.locator('#back').isHidden(), 'no back button at the top level');

  await clickKey(page, 'jupiter-halo', 24, 14);
  await page.waitForTimeout(1800);
  let d = await dbg(page);
  check(d.level === 'planet' && d.focus === 'jupiter', `clicking around Jupiter zooms in (${d.level}/${d.focus})`);
  if (shots) await page.screenshot({ path: `${shots}/explorer-jupiter.png` });

  await clickKey(page, 'io');
  check(await urlBecomes(page, /\/bodies\/io\/$/), 'clicking Io opens its page');

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__explorer);
  await page.waitForTimeout(2200);
  await clickKey(page, 'saturn');
  check(await urlBecomes(page, /\/bodies\/saturn\/$/), 'clicking Saturn itself opens its page');

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__explorer);
  await page.waitForTimeout(2200);
  // wheel at Jupiter zooms into Jupiter, not the Sun
  await wheel(page, -120, 40, await at(page, 'jupiter'));
  await page.waitForTimeout(1600);
  d = await dbg(page);
  check(d.level === 'planet' && d.focus === 'jupiter', `scrolling at Jupiter zooms into Jupiter (${d.level}/${d.focus})`);
  await page.locator('#back').click();
  await page.waitForTimeout(1800);

  await wheel(page, 200, 90);
  await page.waitForTimeout(1600);
  d = await dbg(page);
  check(d.level === 'stars', `scrolling out leaves the solar system (${d.level}, dist ${d.dist.toFixed(1)})`);
  if (shots) await page.screenshot({ path: `${shots}/explorer-stars.png` });

  await page.waitForTimeout(400);
  await clickKey(page, 'sys-proxima-cen');
  await page.waitForTimeout(1500);
  d = await dbg(page);
  check(d.level === 'system', `clicking a star opens its planetary system (${d.level})`);
  await page.waitForTimeout(300);
  await clickKey(page, 'proxima-cen-b');
  check(await urlBecomes(page, /\/bodies\/proxima-cen-b\/$/), 'clicking an exoplanet opens its page');

  await page.goto(`${base}/#galaxy`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__explorer);
  await page.waitForTimeout(2600);
  check((await dbg(page)).level === 'galaxy', 'the galaxy view can be restored from the URL');
  if (shots) await page.screenshot({ path: `${shots}/explorer-galaxy.png` });
  await wheel(page, -200, 120);
  await page.waitForTimeout(1500);
  check((await dbg(page)).level === 'stars', 'scrolling into the galaxy returns to the neighbourhood');

  await page.locator('#back').click();
  await page.waitForTimeout(1500);
  check((await dbg(page)).level === 'solar', 'back button returns to the solar system');
  check(errors.length === 0, `no console errors ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---- phone (touch input)
async function tapKey(page, key) {
  await page.waitForFunction(() => !window.__explorer.debug().busy, null, { timeout: 15000 });
  const p = await at(page, key);
  if (!p) return false;
  await page.touchscreen.tap(p.x, p.y);
  return true;
}
/** Vertical two-finger pinch around (x, y) from `from` px to `to` px finger spacing, via CDP touch events. */
async function pinch(page, x, y, from, to, steps = 14) {
  const cdp = await page.context().newCDPSession(page);
  const pts = (d) => [{ x, y: y - d / 2, id: 1 }, { x, y: y + d / 2, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(from) });
  for (let k = 1; k <= steps; k++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(from + ((to - from) * k) / steps) });
    await page.waitForTimeout(30);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
{
  const { ctx, page, errors } = await open({ width: 375, height: 760 }, '', true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(overflow <= 1, `no horizontal overflow on a phone (${overflow})`);

  await tapKey(page, 'jupiter');
  await page.waitForTimeout(1800);
  let d = await dbg(page);
  check(d.level === 'planet' && d.focus === 'jupiter', `tapping Jupiter flies to it instead of opening it (${d.level}/${d.focus})`);
  check(page.url().endsWith('/') || page.url().includes('#planet'), 'first tap stays in the 3D view');
  if (shots) await page.screenshot({ path: `${shots}/explorer-phone-jupiter.png` });
  await tapKey(page, 'io');
  check(await urlBecomes(page, /\/bodies\/io\/$/), 'tapping Io (with a finger) opens its page');

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__explorer);
  await page.waitForFunction(() => !window.__explorer.debug().busy, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  const before = (await dbg(page)).dist;
  for (let k = 0; k < 3 && (await dbg(page)).level === 'solar'; k++) {
    const sp = await at(page, 'saturn');
    await pinch(page, sp.x, Math.min(Math.max(sp.y, 140), 620), 40, 260);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1600);
  d = await dbg(page);
  check(d.level === 'planet' && d.focus === 'saturn', `pinching at Saturn zooms into Saturn, not the Sun (${d.level}/${d.focus}, dist ${before.toFixed(0)}→${d.dist.toFixed(1)})`);
  if (shots) await page.screenshot({ path: `${shots}/explorer-phone-saturn.png` });

  await page.locator('#leaf').tap();
  check(await urlBecomes(page, /\/bodies\/saturn\/$/), 'tapping the focused name in the scale ladder opens its page');

  await page.goto(`${base}/#planet=jupiter`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__explorer);
  await page.waitForTimeout(1500);
  for (let k = 0; k < 4 && (await dbg(page)).level === 'planet'; k++) {
    await pinch(page, 187, 380, 300, 40);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);
  check((await dbg(page)).level === 'solar', 'pinching out of a planet returns to the solar system');
  check(errors.length === 0, `no console errors on a phone ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log('\nall explorer checks passed');
