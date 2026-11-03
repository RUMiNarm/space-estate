/**
 * Mobile layout audit: finds text squeezed into near-vertical columns, horizontal page overflow,
 * tiny tap targets and tiny text at phone widths.
 * Usage: node scripts/e2e/mobile.mjs [baseUrl] [screenshotDir]
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://127.0.0.1:4321';
const shots = process.argv[3];
if (shots) mkdirSync(shots, { recursive: true });

const PAGES = [
  '/',
  '/list/', '/search/', '/search/?hz=cons&rocky=1', '/guided/', '/compare/', '/catalog/', '/catalog/moon/?p=saturn',
  '/ranking/', '/learn/', '/method/', '/bodies/mars/', '/bodies/earth/', '/bodies/trappist-1-e/', '/bodies/kepler-22-b/',
  '/bodies/haumea/', '/bodies/titan/', '/bodies/c-2019-q4-borisov/', '/bodies/s-2004-s26/', '/bodies/koi-2513-01/',
  '/systems/solar/', '/systems/sys-trappist-1/', '/systems/sys-psr-b1257-12/', '/404/',
];

const failures = [];
const check = (c, m) => {
  if (!c) failures.push(m);
  console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const width of [360, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: width === 360 ? 'dark' : 'light' });
  const page = await ctx.newPage();
  for (const path of PAGES) {
    const res = await page.goto(base + path, { waitUntil: 'networkidle' });
    if (res?.status() !== 200 && !path.startsWith('/404')) {
      check(false, `[${width}] ${path} status ${res?.status()}`);
      continue;
    }
    await page.waitForTimeout(path === '/' ? 2500 : path.startsWith('/search') || path.startsWith('/guided') || path.startsWith('/compare') || path.startsWith('/catalog/moon') ? 900 : 100);
    const r = await page.evaluate(() => {
      const out = { overflow: document.documentElement.scrollWidth - innerWidth, squeezed: [], tiny: [], smallText: 0 };
      const all = [...document.querySelectorAll('body *')].filter((el) => !el.closest('.labels, script, style, noscript'));
      for (const el of all) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const fs = parseFloat(cs.fontSize);
        const lh = parseFloat(cs.lineHeight) || fs * 1.5;
        // squeezed: ≥ 4 chars of own text in a box narrower than 3.2 characters but taller than 2.5 lines
        if (own.length >= 4 && rect.width < fs * 3.2 && rect.height > lh * 2.5) out.squeezed.push(`${el.tagName.toLowerCase()}.${el.className || ''} "${own.slice(0, 18)}" w=${Math.round(rect.width)}`);
        if (own.length >= 2 && fs < 11.5 && !el.closest('.sr-only')) out.smallText++;
        if ((el.tagName === 'A' || el.tagName === 'BUTTON' || (el.tagName === 'INPUT' && el.type !== 'hidden') || el.tagName === 'SELECT') && !el.closest('p, li, td, dd, .crumbs, .sources, sup')) {
          if (rect.height < 32 && rect.width < 32) out.tiny.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 14)}" ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        }
      }
      return out;
    });
    check(r.overflow <= 1, `[${width}] ${path} no horizontal page scroll (${r.overflow}px)`);
    check(r.squeezed.length === 0, `[${width}] ${path} no squeezed text${r.squeezed.length ? ': ' + r.squeezed.slice(0, 4).join(' | ') : ''}`);
    if (r.tiny.length) console.log(`     note: small tap targets ${r.tiny.slice(0, 4).join(' | ')}`);
    if (r.smallText) console.log(`     note: ${r.smallText} elements with text under 11.5px`);
    if (shots) await page.screenshot({ path: `${shots}/m${width}-${path.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log('\nall mobile checks passed');
