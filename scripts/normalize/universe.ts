/**
 * Data for the 3D explorer (public/data/universe-*.json), built from data/normalized and raw snapshots.
 * Run after scripts/normalize/index.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PC_TO_LY } from '../../src/lib/constants.ts';
import type { Body } from '../../src/lib/types.ts';
import { firstNum, num, parseCsv, tableRows, text } from './parse.ts';

const bodies = JSON.parse(readFileSync('data/normalized/bodies.json', 'utf8')) as Body[];
const systems = JSON.parse(readFileSync('data/normalized/systems.json', 'utf8')) as { slug: string; name: string; members: string[]; hzInnerAU: number | null; hzOuterAU: number | null }[];
const by = new Map(bodies.map((b) => [b.slug, b]));

const J2000 = 2451545.0;
/** IAU obliquity of the ecliptic at J2000 (deg). */
const OBLIQUITY = 23.4392911;
const r3 = (x: number | null | undefined, d = 4) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
const card = (b: Body) => ({ s: b.slug, n: b.nameJa ?? b.name, c: b.category, eq: b.equipment.level, sv: b.survival.cause });

// ---------- planets (NSSDC J2000 mean elements + rotation pole)
function sheet(slug: string) {
  const t = text(readFileSync(`data/raw/nssdc/${slug}fact.html`, 'latin1'));
  const g = (re: RegExp) => {
    const m = t.match(re);
    return m ? num(m[1]) : null;
  };
  return {
    a: g(/Semimajor axis \(AU\) ([\d.]+)/),
    e: g(/Orbital eccentricity ([\d.]+)/),
    i: g(/Orbital inclination \(deg\) ([\d.]+)/),
    node: g(/Longitude of ascending node \(deg\) (-?[\d.]+)/),
    peri: g(/Longitude of perihelion \(deg\) (-?[\d.]+)/),
    L: g(/Mean [Ll]ongitude \(deg\) (-?[\d.]+)/),
    poleRa: g(/Right Ascension\s*:\s*(-?[\d.]+)/),
    poleDec: g(/Declination\s*:\s*(-?[\d.]+)/),
  };
}

/** Equatorial (RA, Dec in deg) unit vector → ecliptic J2000 unit vector [x, y, z]. */
function eqToEcl(raDeg: number, decDeg: number): [number, number, number] {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const e = (OBLIQUITY * Math.PI) / 180;
  const x = Math.cos(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra);
  const z = Math.sin(dec);
  return [x, y * Math.cos(e) + z * Math.sin(e), -y * Math.sin(e) + z * Math.cos(e)];
}

const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const planets = PLANETS.map((slug) => {
  const b = by.get(slug)!;
  const s = sheet(slug);
  if ([s.a, s.e, s.i, s.node, s.peri, s.L].some((x) => x == null)) throw new Error(`missing elements for ${slug}`);
  // Mean motion from Kepler's third law (sidereal year 365.256363 d): the fact-sheet period is rounded (e.g. 88.0 d).
  const P = 365.256363 * s.a! ** 1.5;
  return {
    ...card(b),
    el: { a: s.a, e: s.e, i: s.i, om: s.node, w: s.peri! - s.node!, ma: s.L! - s.peri!, epoch: J2000, P },
    rKm: r3((b.radiusE.v ?? 0) * 6371, 1),
    pole: s.poleRa != null && s.poleDec != null ? eqToEcl(s.poleRa, s.poleDec).map((x) => r3(x, 5)) : null,
    rings: !!b.rings,
    moons: b.moonCount?.v ?? 0,
  };
});

// ---------- dwarf planets, small bodies, comets (SBDB elements)
interface Orb { a: number; e: number; i: number; om: number; w: number; ma: number; epoch: number }
const orbits = new Map<string, Orb>();
for (const f of ['data/raw/sbdb/orbits-diameter-ge-100.json', 'data/raw/sbdb/orbits-tno-bright.json']) {
  const d = JSON.parse(readFileSync(f, 'utf8')) as { fields: string[]; data: (string | null)[][] };
  const ix = (k: string) => d.fields.indexOf(k);
  for (const r of d.data) {
    const o = { a: num(r[ix('a')]), e: num(r[ix('e')]), i: num(r[ix('i')]), om: num(r[ix('om')]), w: num(r[ix('w')]), ma: num(r[ix('ma')]), epoch: num(r[ix('epoch')]) };
    if (Object.values(o).every((x) => x != null)) orbits.set(String(r[ix('pdes')]), o as Orb);
  }
}
import { readdirSync } from 'node:fs';
for (const f of readdirSync('data/raw/sbdb/objects')) {
  const d = JSON.parse(readFileSync(`data/raw/sbdb/objects/${f}`, 'utf8')) as { object: { des: string }; orbit: { epoch: string; elements: { name: string; value: string | null }[] } };
  const el = Object.fromEntries(d.orbit.elements.map((e) => [e.name, num(e.value)]));
  const o = { a: el.a, e: el.e, i: el.i, om: el.om, w: el.w, ma: el.ma, epoch: num(d.orbit.epoch) };
  if (Object.values(o).every((x) => x != null)) orbits.set(d.object.des, o as Orb);
}
const smallOut: unknown[] = [];
for (const b of bodies) {
  if (b.system !== 'solar' || !['dwarf', 'small', 'comet'].includes(b.category) || b.slug === 'pluto') continue;
  const pdes = b.designation?.match(/^\s*(\d+)\s/)?.[1] ?? b.designation?.match(/\(([^)]+)\)\s*$/)?.[1] ?? null;
  const keyCandidates = [b.radiusE.src, b.aAU.src].filter(Boolean).map((s) => s!.replace(/^sbdb:/, ''));
  const o = keyCandidates.map((k) => orbits.get(k)).find(Boolean) ?? (pdes ? orbits.get(pdes) : undefined);
  if (!o || !(o.a > 0) || o.e >= 1) continue; // hyperbolic orbits are not drawn
  smallOut.push({ ...card(b), el: { ...o, P: 365.256363 * o.a ** 1.5 }, rKm: r3((b.radiusE.v ?? 0) * 6371, 1), cu: b.curated });
}

// ---------- moons (JPL SSD mean elements)
const key = (s: string) => s.replace(/\(.*?\)/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const elems = new Map<string, string[]>();
for (const r of tableRows(readFileSync('data/raw/jpl-sats/elem.html', 'utf8'))) {
  if (r.length < 14) continue;
  const k = `${r[1]}|${key(r[2]!)}`;
  if (!elems.has(k)) elems.set(k, r);
}
const PARENT_NAME: Record<string, string> = { earth: 'Earth', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto' };
const moons: Record<string, unknown[]> = {};
for (const b of bodies) {
  if (b.category !== 'moon' || !b.parent) continue;
  const pn = PARENT_NAME[b.parent];
  const prov = b.designation?.split(' / ').at(-1) ?? '';
  const e = elems.get(`${pn}|${key(b.name)}`) ?? elems.get(`${pn}|${key(prov)}`);
  if (!e) continue;
  const [, , , , , frame, , aKm, ecc, w, M, inc, node, P] = e;
  (moons[b.parent] ??= []).push({
    ...card(b),
    el: { a: firstNum(aKm), e: firstNum(ecc), i: firstNum(inc), om: firstNum(node), w: firstNum(w), ma: firstNum(M), epoch: J2000, P: firstNum(P) },
    frame: /laplace/i.test(frame ?? '') ? 'laplace' : 'ecliptic',
    rKm: r3((b.radiusE.v ?? 0) * 6371, 1),
    cu: b.curated,
  });
}

writeFileSync(
  'public/data/universe-solar.json',
  JSON.stringify({ sun: { ...card(by.get('sun')!), rKm: 695700 }, planets, small: smallOut, moons }),
);

// ---------- exoplanet host stars (galactic coordinates, light years)
/** ICRS → galactic rotation matrix (J2000). */
const T = [
  [-0.0548755604, -0.873437090, -0.4838350155],
  [0.4941094279, -0.44482963, 0.7469822445],
  [-0.867666149, -0.1980763734, 0.4559837762],
];
const hostPos = new Map<string, { ra: number; dec: number; dPc: number }>();
for (const r of parseCsv(readFileSync('data/raw/exoplanet-archive/hosts.csv', 'utf8'))) {
  const ra = num(r.ra);
  const dec = num(r.dec);
  const d = num(r.sy_dist);
  if (ra != null && dec != null && d != null && !hostPos.has(r.hostname!)) hostPos.set(r.hostname!, { ra, dec, dPc: d });
}
const stars: unknown[] = [];
for (const s of systems) {
  if (s.slug === 'solar') continue;
  const p = hostPos.get(s.name);
  if (!p) continue;
  const ra = (p.ra * Math.PI) / 180;
  const dec = (p.dec * Math.PI) / 180;
  const v = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const g = T.map((row) => row[0]! * v[0]! + row[1]! * v[1]! + row[2]! * v[2]!);
  const dLy = p.dPc * PC_TO_LY;
  const members = s.members.map((m) => by.get(m)!).filter(Boolean);
  const host = members[0]?.host;
  stars.push({
    s: s.slug,
    n: s.name,
    d: r3(dLy, 2),
    g: g.map((x) => r3(x, 5)), // unit vector, galactic frame (x → galactic centre)
    t: r3(host?.teffK.v ?? null, 0),
    hz: s.hzInnerAU != null ? [r3(s.hzInnerAU), r3(s.hzOuterAU)] : null,
    p: members.map((m) => ({ s: m.slug, n: m.nameJa ?? m.name, a: r3(m.aAU.v), e: r3(m.ecc.v, 3), P: r3(m.orbitalPeriodD.v, 3), r: r3(m.radiusE.v, 3), hz: m.hz.status, eq: m.equipment.level, cu: m.curated })),
  });
}
writeFileSync('public/data/universe-stars.json', JSON.stringify({ stars }));
console.log(`universe: ${planets.length} planets, ${smallOut.length} small bodies, ${Object.values(moons).flat().length} moons, ${stars.length} star systems`);
