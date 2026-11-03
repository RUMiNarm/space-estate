/**
 * Normalize raw snapshots into data/normalized/*.json and public/data/index.json.
 * Run after `pnpm run data:fetch`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CURATED, CURATED_SOURCES } from '../../src/data/curated.ts';
import { METHOD_SOURCES, SUN_TEFF } from '../../src/lib/constants.ts';
import { esi } from '../../src/lib/esi.ts';
import { habitableZone } from '../../src/lib/habitableZone.ts';
import { equilibriumTempK } from '../../src/lib/physics.ts';
import { estimateSurvival, representativeTempK, requiredEquipment } from '../../src/lib/survival.ts';
import type { Body, IndexRow } from '../../src/lib/types.ts';
import { type RawBody, Sources, val } from './body.ts';
import { buildExoplanets, NEA_OVERVIEW } from './exoplanets.ts';
import { buildMoons, moonCountsFromJpl } from './moons.ts';
import { buildSolar, buildSun } from './solar.ts';
import { buildSmall } from './small.ts';
import { slugify } from './parse.ts';

const sources = new Sources();
for (const [id, s] of Object.entries(METHOD_SOURCES)) sources.add({ id, ...s });
for (const [id, s] of Object.entries(CURATED_SOURCES)) sources.add({ id, ...s, kind: 'page' });
sources.add({ id: 'site-calc', label: '本サイトによる計算（一次ソースの値から。式は「判定方法と出典」ページに掲載）', url: '/method/#formulas', kind: 'page' });

const moonCounts = moonCountsFromJpl();
const solar = buildSolar(sources, moonCounts);
const sun = buildSun(sources);
const planetA = new Map(solar.map((b) => [b.slug, b.aAU.v ?? NaN]));
const moons = buildMoons(sources, planetA);
const small = buildSmall(sources);
const exo = buildExoplanets(sources);

// ---- unique slugs (solar-system names win over exoplanets, then by order)
const raw: RawBody[] = [sun, ...solar, ...moons, ...small, ...exo];
const used = new Set<string>();
for (const b of raw) {
  let base = b.slug || slugify(b.name) || 'body';
  if (b.category === 'moon' && used.has(base)) base = `${base}-${b.parent}`;
  let candidate = base;
  for (let n = 2; used.has(candidate); n++) candidate = `${base}-${n}`;
  b.slug = candidate;
  used.add(candidate);
}

// ---- curated physical notes with sources
const leger = sources.add({ id: 'leger2011', label: 'Léger et al. 2011, Icarus 213, 1 “The extreme physical properties of the CoRoT-7b super-Earth”', url: 'https://arxiv.org/abs/1102.1629', kind: 'paper' });
const ribas = sources.add({ id: 'ribas2016', label: 'Ribas et al. 2016, A&A 596, A111 “The habitability of Proxima Centauri b. I.”', url: 'https://arxiv.org/abs/1608.06813', kind: 'paper' });
const espinoza = sources.add({ id: 'espinoza2025', label: 'Espinoza et al. 2025 “JWST-TST DREAMS: NIRSpec/PRISM Transmission Spectroscopy of TRAPPIST-1 e”', url: 'https://arxiv.org/abs/2509.05414', kind: 'paper' });
const glidden = sources.add({ id: 'glidden2025', label: 'Glidden et al. 2025 “JWST-TST DREAMS: Secondary Atmosphere Constraints for TRAPPIST-1 e”', url: 'https://arxiv.org/abs/2509.05407', kind: 'paper' });
const ortiz = sources.add({ id: 'ortiz2017', label: 'Ortiz et al. 2017, Nature 550, 219 “The size, shape, density and ring of the dwarf planet Haumea”', url: 'https://arxiv.org/abs/2006.03113', kind: 'paper' });
const bySlug = new Map(raw.map((b) => [b.slug, b]));
const patch = (slug: string, f: (b: RawBody) => void) => {
  const b = bySlug.get(slug);
  if (!b) throw new Error(`patch target missing: ${slug}`);
  f(b);
};
patch('corot-7-b', (b) => {
  b.tidalLock = 'likely';
  b.tidalLockSrc = leger;
  b.tempMaxK = val(2474, leger, 'measured', { note: '恒星直下点のモデル推定値（±71 K）' });
});
patch('proxima-cen-b', (b) => {
  b.hazards = ['stellar-xuv'];
  b.hazardsSrc = ribas;
});
patch('trappist-1-e', (b) => {
  b.hazardsSrc = espinoza;
  b.gasesSrc = glidden;
});
patch('haumea', (b) => {
  b.dimensionsKm = '最長軸 2,322 km 以上（掩蔽時の断面 1,704 × 1,138 km）';
  b.radiusE = { ...b.radiusE, src: b.radiusE.src ?? ortiz };
});
const nasaDwarf = (slug: string, km: number, label: string) => {
  const id = sources.add({ id: `nasa-${slug}`, label: `NASA Science: ${label}`, url: `https://science.nasa.gov/dwarf-planets/${slug}/`, kind: 'page' });
  patch(slug, (b) => {
    if (b.radiusE.v == null) b.radiusE = val(km / 2 / 6371, id, 'measured', { note: `直径 約${km.toLocaleString('en-US')} km` });
  });
};
nasaDwarf('eris', 2400, 'Eris');
nasaDwarf('haumea', 1740, 'Haumea（赤道直径）');
nasaDwarf('makemake', 1430, 'Makemake');
patch('pluto', (b) => {
  b.discoveryYear = 1930;
  b.discoveredBy = 'C. W. Tombaugh';
});

// ---- derived values
const bodies: Body[] = raw.map((b) => {
  const isSolar = b.system === 'solar';
  // Stellar luminosity fallback (Stefan–Boltzmann): L/L☉ = (R/R☉)² (T/T☉)⁴ when the archive has no st_lum.
  if (b.host && b.host.lumLogSun.v == null && b.host.radiusSun.v != null && b.host.teffK.v != null) {
    const L = b.host.radiusSun.v ** 2 * (b.host.teffK.v / SUN_TEFF) ** 4;
    b.host.lumLogSun = val(Math.log10(L), undefined, 'derived', { note: '半径と有効温度から計算' });
    if (b.insolE.v == null && b.aAU.v != null) b.insolE = val(L / b.aAU.v ** 2, undefined, 'derived');
  }
  if (isSolar && b.category !== 'star' && b.aAU.v != null) {
    if (b.insolE.v == null) b.insolE = val(1 / b.aAU.v ** 2, undefined, 'derived', { note: '太陽からの距離から計算' });
    if (b.tempEqK.v == null)
      b.tempEqK = val(equilibriumTempK(SUN_TEFF, 1, b.aAU.v), undefined, 'derived', { note: '放射平衡温度（アルベド0・熱が全体に行き渡ると仮定）' });
  }
  const hz =
    b.category === 'star'
      ? { innerAU: null, outerAU: null, optInnerAU: null, optOuterAU: null, status: 'unknown' as const }
      : isSolar
        ? habitableZone(SUN_TEFF, 1, b.aAU.v)
        : habitableZone(b.host?.teffK.v, b.host?.lumLogSun.v != null ? 10 ** b.host.lumLogSun.v : null, b.aAU.v);
  const radiusForEsi = b.radiusE.v;
  const e = b.category === 'star' ? null : esi(b.insolE.v, radiusForEsi, b.massE.lim ? null : b.massE.v);
  const body = { ...b, hz, esi: e != null ? Math.round(e * 1000) / 1000 : null, curated: b.slug in CURATED } as Body;
  if (CURATED[b.slug]?.nameJa && !body.nameJa) body.nameJa = CURATED[b.slug]!.nameJa;
  body.survival = estimateSurvival(body);
  body.equipment = requiredEquipment(body);
  return body;
});

for (const [slug, c] of Object.entries(CURATED)) {
  if (!bodies.some((b) => b.slug === slug)) throw new Error(`curated slug not found in data: ${slug}`);
  for (const r of c.refs ?? []) if (!sources.map.has(r)) throw new Error(`curated ref ${r} (${slug}) not in sources`);
}

// ---- systems
interface System {
  slug: string;
  name: string;
  distanceLy: number | null;
  host?: Body['host'];
  hzInnerAU: number | null;
  hzOuterAU: number | null;
  members: string[];
  overviewUrl?: string;
}
const systems = new Map<string, System>();
for (const b of bodies) {
  if (b.category === 'moon') continue;
  let s = systems.get(b.system);
  if (!s) {
    s = { slug: b.system, name: b.systemName, distanceLy: b.system === 'solar' ? 0 : b.distanceLy.v, host: b.host, hzInnerAU: b.hz.innerAU, hzOuterAU: b.hz.outerAU, members: [] };
    if (b.host) s.overviewUrl = NEA_OVERVIEW(b.host.name);
    systems.set(b.system, s);
  }
  if (s.hzInnerAU == null && b.hz.innerAU != null) {
    s.hzInnerAU = b.hz.innerAU;
    s.hzOuterAU = b.hz.outerAU;
  }
  s.members.push(b.slug);
}
const solarSys = systems.get('solar')!;
solarSys.hzInnerAU = habitableZone(SUN_TEFF, 1, 1).innerAU;
solarSys.hzOuterAU = habitableZone(SUN_TEFF, 1, 1).outerAU;

// ---- search index
const index: IndexRow[] = bodies.map((b) => ({
  s: b.slug,
  n: b.name,
  ...(b.nameJa ? { j: b.nameJa } : {}),
  c: b.category,
  ...(b.subclass ? { sc: b.subclass } : {}),
  sy: b.system,
  ...(b.parent ? { p: b.parent } : {}),
  r: b.rocky,
  hz: b.hz.status,
  at: b.atmosphere,
  t: round(representativeTempK(b), 0),
  g: round(b.gravityG.v, 3),
  rad: round(b.radiusE.v, 3),
  ...(b.radiusE.c === 'calculated' ? { rc: 1 as const } : {}),
  d: round(b.distanceLy.v, 2),
  e: b.esi,
  y: b.discoveryYear ?? null,
  eq: b.equipment.level,
  eqMin: b.equipment.minLevel,
  sv: b.survival.cause,
  tl: b.tidalLock,
  cu: b.curated,
}));
function round(x: number | null | undefined, d: number) {
  if (x == null || !Number.isFinite(x)) return null;
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

// ---- report
const count = (f: (b: Body) => boolean) => bodies.filter(f).length;
const manifest = JSON.parse(readFileSync('data/raw/manifest.json', 'utf8')) as { fetchedAt: string };
const report = {
  fetchedAt: manifest.fetchedAt,
  normalizedAt: new Date().toISOString(),
  total: bodies.length,
  byCategory: Object.fromEntries(['star', 'planet', 'dwarf', 'moon', 'small', 'comet', 'exoplanet'].map((c) => [c, count((b) => b.category === c)])),
  systems: systems.size,
  moonCountsJpl: Object.fromEntries(moonCounts),
  equipmentUndetermined: count((b) => b.equipment.level == null),
  hzInside: count((b) => b.hz.status === 'inside'),
  hzUnknown: count((b) => b.hz.status === 'unknown' && b.category !== 'star'),
  esiAvailable: count((b) => b.esi != null),
  curated: count((b) => b.curated),
  sources: sources.map.size,
};

mkdirSync('data/normalized', { recursive: true });
mkdirSync('public/data', { recursive: true });
writeFileSync('data/normalized/bodies.json', JSON.stringify(bodies));
writeFileSync('data/normalized/systems.json', JSON.stringify([...systems.values()]));
writeFileSync('data/normalized/sources.json', JSON.stringify(Object.fromEntries(sources.map)));
writeFileSync('data/normalized/report.json', JSON.stringify(report, null, 2));
// compact: drop null fields and false flags (the client restores defaults)
writeFileSync('public/data/index.json', JSON.stringify(index, (_k, v) => (v === null || v === false ? undefined : v)));
console.log(JSON.stringify(report, null, 2));
