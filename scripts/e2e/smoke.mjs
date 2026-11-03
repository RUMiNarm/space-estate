/**
 * Smoke test against a running preview server (pnpm build && pnpm preview).
 * Usage: node scripts/e2e/smoke.mjs [baseUrl] [screenshotDir]
 * Uses the system Playwright (require('playwright')).
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://127.0.0.1:4321';
const shots = process.argv[3];
if (shots) mkdirSync(shots, { recursive: true });

const failures = [];
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
};

const browser = await chromium.launch();
for (const [label, viewport, scheme] of [
  ['desktop-light', { width: 1280, height: 900 }, 'light'],
  ['mobile-dark', { width: 375, height: 800 }, 'dark'],
]) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  const visit = async (path, name) => {
    const res = await page.goto(base + path, { waitUntil: 'networkidle' });
    check(res?.status() === 200, `[${label}] ${path} → 200`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, `[${label}] ${path} has no horizontal scroll (overflow ${overflow}px)`);
    if (shots) await page.screenshot({ path: `${shots}/${label}-${name}.png`, fullPage: false });
  };

  await visit('/', 'home');
  check((await page.locator('h1').innerText()).includes('地球'), `[${label}] home h1`);

  await visit('/bodies/mars/', 'mars');
  check(await page.getByText('与圧服').first().isVisible(), `[${label}] Mars shows pressure-suit verdict`);
  check((await page.locator('ol.sources li').count()) > 0, `[${label}] Mars has sources`);

  await visit('/bodies/trappist-1-e/', 'trappist1e');
  await visit('/bodies/kepler-22-b/', 'kepler22b');
  check(await page.getByText('≦ ').first().isVisible(), `[${label}] Kepler-22b shows upper-limit mass`);

  await visit('/systems/sys-trappist-1/', 'trappist-system');
  check((await page.locator('figure.hzd svg circle').count()) >= 7, `[${label}] TRAPPIST-1 diagram plots planets`);

  await visit('/search/?c=moon&p=saturn', 'search-saturn-moons');
  await page.waitForSelector('.res-list .res');
  const funnel = await page.locator('.funnel').innerText();
  check(/→\s*293\s*件|293 件/.test(funnel.replace(/,/g, '')), `[${label}] Saturn moons search → 293 (${funnel.replace(/\s+/g, ' ')})`);

  await visit('/guided/', 'guided');
  await page.waitForSelector('.count');
  const counts = await page.locator('.count').allInnerTexts();
  check(counts.length === 4, `[${label}] guided shows 4 step counts`);
  const step3 = await page.locator('.stages > li').nth(2).innerText();
  check(step3.includes('月'), `[${label}] guided step 3 drops the Moon`);

  await visit('/compare/', 'compare');
  await page.waitForSelector('.bar-row');
  check((await page.locator('.legend .chip').count()) === 4, `[${label}] compare preloads 4 bodies`);

  await visit('/method/', 'method');
  check((await page.locator('#factcheck tbody tr').count()) >= 20, `[${label}] fact-check table rendered`);
  await visit('/ranking/', 'ranking');
  await visit('/learn/', 'learn');
  await visit('/catalog/', 'catalog');
  await visit('/bodies/sun/', 'sun');
  await visit('/bodies/titan/', 'titan');

  check(errors.length === 0, `[${label}] no console/page errors ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log('\nall smoke checks passed');
