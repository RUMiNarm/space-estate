/**
 * Sun, planets, Earth's Moon and Pluto from the NASA NSSDC Planetary Fact Sheets.
 * Values from individual fact sheets (atmosphere, temperature ranges) are transcribed in SHEET_DETAILS
 * with the sheet as their source; everything else is parsed from the comparison table.
 */
import { readFileSync } from 'node:fs';
import { AU_KM, EARTH_MASS_KG, EARTH_RADIUS_KM, G0 } from '../../src/lib/constants.ts';
import type { AtmosphereStatus, Gas } from '../../src/lib/types.ts';
import { blank, type RawBody, Sources, U, val } from './body.ts';
import { num, tableRows, text } from './parse.ts';

const RAW = 'data/raw/nssdc';
const NSSDC = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet';

const NAMES: Record<string, { ja: string; slug: string; category: 'planet' | 'moon' | 'dwarf' }> = {
  MERCURY: { ja: '水星', slug: 'mercury', category: 'planet' },
  VENUS: { ja: '金星', slug: 'venus', category: 'planet' },
  EARTH: { ja: '地球', slug: 'earth', category: 'planet' },
  MOON: { ja: '月', slug: 'moon', category: 'moon' },
  MARS: { ja: '火星', slug: 'mars', category: 'planet' },
  JUPITER: { ja: '木星', slug: 'jupiter', category: 'planet' },
  SATURN: { ja: '土星', slug: 'saturn', category: 'planet' },
  URANUS: { ja: '天王星', slug: 'uranus', category: 'planet' },
  NEPTUNE: { ja: '海王星', slug: 'neptune', category: 'planet' },
  PLUTO: { ja: '冥王星', slug: 'pluto', category: 'dwarf' },
};

interface Detail {
  pressureBar?: number | null;
  pressureNote?: string;
  atmosphere: AtmosphereStatus;
  gases?: Gas[];
  tempMinK?: number;
  tempMaxK?: number;
  tempMeanK?: number;
  tempNote?: string;
  breathable?: boolean;
  hasSurface: 'yes' | 'no';
  rocky: 'yes' | 'no';
}

/** Transcribed from each body's NSSDC fact sheet (fetched into data/raw/nssdc/<body>fact.html). */
const SHEET_DETAILS: Record<string, Detail> = {
  mercury: { pressureBar: 5e-15, pressureNote: '<~5×10⁻¹⁵ bar', atmosphere: 'trace', tempMeanK: 440, tempMaxK: 725, tempNote: '太陽側 590–725 K', hasSurface: 'yes', rocky: 'yes' },
  venus: { pressureBar: 92, atmosphere: 'thick', gases: [{ gas: 'CO₂', pct: 96.5 }, { gas: 'N₂', pct: 3.5 }], tempMeanK: 737, hasSurface: 'yes', rocky: 'yes' },
  earth: { pressureBar: 1.014, atmosphere: 'thick', gases: [{ gas: 'N₂', pct: 78.08 }, { gas: 'O₂', pct: 20.95 }, { gas: 'Ar', pct: 0.934 }], tempMeanK: 288, breathable: true, hasSurface: 'yes', rocky: 'yes' },
  moon: { pressureBar: 3e-15, pressureNote: '夜間 3×10⁻¹⁵ bar', atmosphere: 'trace', tempMinK: 95, tempMaxK: 390, tempNote: '赤道の昼夜の範囲', hasSurface: 'yes', rocky: 'yes' },
  mars: { pressureBar: 0.00636, pressureNote: '平均半径での値。季節により 4.0–8.7 mb', atmosphere: 'thin', gases: [{ gas: 'CO₂', pct: 95.1 }, { gas: 'N₂', pct: 2.59 }], tempMeanK: 214, tempMinK: 184, tempMaxK: 242, tempNote: '最低・最高はバイキング1号着陸地点の日較差', hasSurface: 'yes', rocky: 'yes' },
  jupiter: { pressureBar: null, pressureNote: '地表はなく、内部では1000 barを大きく超える', atmosphere: 'thick', gases: [{ gas: 'H₂', pct: 89.8 }, { gas: 'He', pct: 10.2 }], tempMeanK: 165, tempNote: '1気圧面での温度', hasSurface: 'no', rocky: 'no' },
  saturn: { pressureBar: null, pressureNote: '地表はなく、内部では1000 barを大きく超える', atmosphere: 'thick', gases: [{ gas: 'H₂', pct: 96.3 }, { gas: 'He', pct: 3.25 }], tempMeanK: 134, tempNote: '1気圧面での温度', hasSurface: 'no', rocky: 'no' },
  uranus: { pressureBar: null, pressureNote: '地表はなく、内部では1000 barを大きく超える', atmosphere: 'thick', gases: [{ gas: 'H₂', pct: 82.5 }, { gas: 'He', pct: 15.2 }], tempMeanK: 76, tempNote: '1気圧面での温度', hasSurface: 'no', rocky: 'no' },
  neptune: { pressureBar: null, pressureNote: '地表はなく、内部では1000 barを大きく超える', atmosphere: 'thick', gases: [{ gas: 'H₂', pct: 80.0 }, { gas: 'He', pct: 19.0 }], tempMeanK: 72, tempNote: '1気圧面での温度', hasSurface: 'no', rocky: 'no' },
  pluto: { pressureBar: 1.3e-5, pressureNote: '約13マイクロバール', atmosphere: 'thin', gases: [{ gas: 'N₂', pct: 99 }, { gas: 'CH₄', pct: 0.5 }, { gas: 'CO', pct: 0.05 }], hasSurface: 'yes', rocky: 'yes' },
};

/** Surface gravity relative to Earth from the 'Ratio (X/Earth)' column of the body's own fact sheet. */
function sheetGravityRatio(slug: string): { ratio: number; note: string } | null {
  if (slug === 'earth') return null;
  const rows = tableRows(readFileSync(`${RAW}/${slug}fact.html`, 'latin1'));
  const row = rows.find((r) => /gravity/i.test(r[0] ?? ''));
  const ratio = row ? num(row[3]) : null;
  if (ratio == null) return null;
  return { ratio, note: /1 bar/.test(row![0]!) ? '平均・1気圧面' : '平均' };
}

export function buildSolar(sources: Sources, moonCounts: Map<string, number>): RawBody[] {
  const idx = sources.add({ id: 'nssdc-planets', label: 'NASA Planetary Fact Sheet（比較表）', url: `${NSSDC}/`, kind: 'factsheet' });
  const html = readFileSync(`${RAW}/index.html`, 'latin1');
  const rows = tableRows(html);
  const header = rows.find((r) => r.includes('MERCURY'));
  if (!header) throw new Error('planet fact sheet header not found');
  const col = (name: string) => header.indexOf(name);
  const get = (label: RegExp, name: string) => {
    const row = rows.find((r) => label.test(r[0] ?? ''));
    return row ? row[col(name)] : undefined;
  };

  const out: RawBody[] = [];
  for (const [KEY, meta] of Object.entries(NAMES)) {
    const sheetId = sources.add({
      id: `nssdc-${meta.slug}`,
      label: `NASA ${KEY[0]}${KEY.slice(1).toLowerCase()} Fact Sheet`,
      url: `${NSSDC}/${meta.slug}fact.html`,
      kind: 'factsheet',
    });
    const d = SHEET_DETAILS[meta.slug]!;
    const massE = (num(get(/^Mass/, KEY)) ?? NaN) * 1e24 / EARTH_MASS_KG;
    const radiusE = (num(get(/^Diameter/, KEY)) ?? NaN) / 2 / EARTH_RADIUS_KM;
    const isMoon = KEY === 'MOON';
    const distKm = (num(get(/^Distance from Sun/, KEY)) ?? NaN) * 1e6;
    const meanC = num(get(/^Mean Temperature/, KEY));
    const moons = moonCounts.get(meta.slug) ?? num(get(/^Number of Moons/, KEY));
    const ring = (get(/^Ring System/, KEY) ?? '').startsWith('Yes');
    const mag = get(/^Global Magnetic Field/, KEY) ?? '';

    const b = blank({
      slug: meta.slug,
      name: KEY[0] + KEY.slice(1).toLowerCase(),
      nameJa: meta.ja,
      category: meta.category,
      system: 'solar',
      systemName: '太陽系',
      ...(isMoon ? { parent: 'earth', parentName: '地球' } : {}),
      radiusE: val(radiusE, idx, 'measured', { note: '赤道直径から' }),
      massE: val(massE, idx),
      densityGcc: val((num(get(/^Density/, KEY)) ?? NaN) / 1000, idx),
      gravityG: (() => {
        const gr = sheetGravityRatio(meta.slug);
        return gr ? val(gr.ratio, sheetId, 'measured', { note: gr.note }) : meta.slug === 'earth' ? val(1, sheetId, 'measured', { note: '基準' }) : val((num(get(/^Gravity/, KEY)) ?? NaN) / G0, idx);
      })(),
      escapeKmS: val(num(get(/^Escape Velocity/, KEY)), idx),
      rotationH: val(Math.abs(num(get(/^Length of Day/, KEY)) ?? NaN), idx, 'measured', { note: '1日の長さ（太陽日）' }),
      orbitalPeriodD: isMoon ? val(num(get(/^Orbital Period/, KEY)), idx, 'measured', { note: '地球を回る周期' }) : val(num(get(/^Orbital Period/, KEY)), idx),
      aAU: isMoon ? val(1.0, idx, 'derived', { note: '地球と同じ' }) : val(distKm / AU_KM, idx),
      ecc: val(num(get(/^Orbital Eccentricity/, KEY)), idx),
      inclDeg: val(num(get(/^Orbital Inclination/, KEY)), idx),
      obliquityDeg: val(num(get(/^Obliquity/, KEY)), idx),
      tempMeanK: d.tempMeanK != null ? val(d.tempMeanK, sheetId, 'measured', d.tempNote ? { note: d.tempNote } : {}) : val(meanC != null ? meanC + 273.15 : null, idx),
      tempMinK: d.tempMinK != null ? val(d.tempMinK, sheetId, 'measured', d.tempNote ? { note: d.tempNote } : {}) : U,
      tempMaxK: d.tempMaxK != null ? val(d.tempMaxK, sheetId, 'measured', d.tempNote ? { note: d.tempNote } : {}) : U,
      pressureBar: d.pressureBar != null ? val(d.pressureBar, sheetId, 'measured', d.pressureNote ? { note: d.pressureNote } : {}) : { v: null, c: 'unknown', note: d.pressureNote, src: sheetId },
      atmosphere: d.atmosphere,
      gases: d.gases ?? [],
      gasesSrc: d.gases ? sheetId : undefined,
      oxygenBreathable: d.breathable ?? false,
      hasSurface: d.hasSurface,
      rocky: d.rocky,
      magneticField: mag.startsWith('Yes') ? 'yes' : mag.startsWith('No') ? 'no' : 'unknown',
      moonCount: moons != null ? val(moons, moonCounts.has(meta.slug) ? 'jpl-sats-disc' : idx) : undefined,
      rings: ring,
      tidalLock: isMoon ? 'yes' : 'no',
      distanceLy: U,
    });
    out.push(b);
  }
  return out;
}

export function buildSun(sources: Sources): RawBody {
  const id = sources.add({ id: 'nssdc-sun', label: 'NASA Sun Fact Sheet', url: `${NSSDC}/sunfact.html`, kind: 'factsheet' });
  const t = text(readFileSync(`${RAW}/sunfact.html`, 'latin1'));
  const grab = (re: RegExp) => {
    const m = t.match(re);
    return m ? num(m[1]) : null;
  };
  const massKg = (grab(/Mass \(10\^?24 kg\) ([\d,.]+)/) ?? 1988400) * 1e24;
  const radiusKm = grab(/Volumetric mean radius \(km\) ([\d,.]+)/) ?? 695700;
  const teff = grab(/Effective temperature:? ([\d,.]+) ?K/);
  return blank({
    slug: 'sun',
    name: 'Sun',
    nameJa: '太陽',
    category: 'star',
    system: 'solar',
    systemName: '太陽系',
    radiusE: val(radiusKm / EARTH_RADIUS_KM, id),
    massE: val(massKg / EARTH_MASS_KG, id),
    densityGcc: val(grab(/Mean density \(kg\/m\^?3\) ([\d,.]+)/) != null ? grab(/Mean density \(kg\/m\^?3\) ([\d,.]+)/)! / 1000 : null, id),
    gravityG: val((grab(/Surface gravity \(eq\.\) \(m\/s\^?2\) ([\d,.]+)/) ?? NaN) / G0, id),
    escapeKmS: val(grab(/Escape velocity \(km\/s\) ([\d,.]+)/), id),
    rotationH: val(grab(/Sidereal rotation period \(hrs\)\*? ([\d,.]+)/), id, 'measured', { note: '緯度16度での値' }),
    tempMeanK: val(teff, id, 'measured', { note: '有効温度（光球）' }),
    hasSurface: 'no',
    rocky: 'no',
    atmosphere: 'thick',
    tidalLock: 'no',
    magneticField: 'yes',
    distanceLy: val(1.58125e-5, id, 'derived', { note: '1 au' }),
  });
}
