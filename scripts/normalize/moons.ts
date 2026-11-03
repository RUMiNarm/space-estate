/**
 * Natural satellites from JPL Solar System Dynamics (discovery list, mean elements, physical parameters),
 * supplemented with radius/mass/density/albedo from the NSSDC satellite fact sheets.
 */
import { readFileSync } from 'node:fs';
import { EARTH_MASS_KG, EARTH_RADIUS_KM } from '../../src/lib/constants.ts';
import { densityGcc, escapeKmS, gravityG, massEFromGM } from '../../src/lib/physics.ts';
import { blank, type RawBody, Sources, U, val } from './body.ts';
import { firstNum, num, tableRows } from './parse.ts';

const PARENTS: Record<string, { slug: string; ja: string }> = {
  Mars: { slug: 'mars', ja: '火星' },
  Jupiter: { slug: 'jupiter', ja: '木星' },
  Saturn: { slug: 'saturn', ja: '土星' },
  Uranus: { slug: 'uranus', ja: '天王星' },
  Neptune: { slug: 'neptune', ja: '海王星' },
  Pluto: { slug: 'pluto', ja: '冥王星' },
};

export const MOON_JA: Record<string, string> = {
  Phobos: 'フォボス', Deimos: 'ダイモス',
  Io: 'イオ', Europa: 'エウロパ', Ganymede: 'ガニメデ', Callisto: 'カリスト', Amalthea: 'アマルテア', Himalia: 'ヒマリア',
  Thebe: 'テーベ', Metis: 'メティス', Adrastea: 'アドラステア', Elara: 'エララ', Pasiphae: 'パシファエ', Carme: 'カルメ', Ananke: 'アナンケ', Sinope: 'シノーペ', Lysithea: 'リシテア', Leda: 'レダ',
  Mimas: 'ミマス', Enceladus: 'エンケラドゥス', Tethys: 'テティス', Dione: 'ディオネ', Rhea: 'レア', Titan: 'タイタン',
  Hyperion: 'ヒペリオン', Iapetus: 'イアペトゥス', Phoebe: 'フェーベ', Pan: 'パン', Atlas: 'アトラス', Prometheus: 'プロメテウス',
  Pandora: 'パンドラ', Janus: 'ヤヌス', Epimetheus: 'エピメテウス', Daphnis: 'ダフニス', Helene: 'ヘレネ', Telesto: 'テレスト', Calypso: 'カリプソ',
  Miranda: 'ミランダ', Ariel: 'アリエル', Umbriel: 'ウンブリエル', Titania: 'チタニア', Oberon: 'オベロン', Puck: 'パック',
  Triton: 'トリトン', Nereid: 'ネレイド', Proteus: 'プロテウス', Larissa: 'ラリッサ', Naiad: 'ナイアド', Thalassa: 'タラッサ', Despina: 'デスピナ', Galatea: 'ガラテア',
  Charon: 'カロン', Nix: 'ニクス', Hydra: 'ヒドラ', Kerberos: 'ケルベロス', Styx: 'ステュクス',
};

const key = (s: string) => s.replace(/\(.*?\)/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

interface JplPhys {
  gm?: number;
  radiusKm?: number;
  density?: number;
}
interface SheetPhys {
  massKg?: number;
  radiusKm?: number;
  density?: number;
  albedo?: number;
  extent?: string;
  src: string;
}

export function moonCountsFromJpl(): Map<string, number> {
  const rows = tableRows(readFileSync('data/raw/jpl-sats/discovery.html', 'utf8'));
  const counts = new Map<string, number>();
  for (const r of rows) {
    const m = r.length === 1 && r[0]!.match(/Satellites of\s+(?:Dwarf Planet\s+)?(\w+):\s*(\d+)/);
    if (m) counts.set(PARENTS[m[1]!]?.slug ?? m[1]!.toLowerCase(), Number(m[2]));
  }
  counts.set('earth', 1);
  return counts;
}

export function buildMoons(sources: Sources, planetA: Map<string, number>): RawBody[] {
  sources.add({ id: 'jpl-sats-disc', label: 'JPL SSD: Planetary Satellite Discovery Circumstances', url: 'https://ssd.jpl.nasa.gov/sats/discovery.html', kind: 'database' });
  const elemSrc = sources.add({ id: 'jpl-sats-elem', label: 'JPL SSD: Planetary Satellite Mean Elements', url: 'https://ssd.jpl.nasa.gov/sats/elem/', kind: 'database' });
  const physSrc = sources.add({ id: 'jpl-sats-phys', label: 'JPL SSD: Planetary Satellite Physical Parameters', url: 'https://ssd.jpl.nasa.gov/sats/phys_par/', kind: 'database' });
  const titanSrc = sources.add({ id: 'nasa-titan', label: 'NASA Science: Titan Facts', url: 'https://science.nasa.gov/saturn/moons/titan/facts/', kind: 'page' });
  const tritonSrc = sources.add({ id: 'nasa-triton', label: 'NASA Science: Triton', url: 'https://science.nasa.gov/neptune/moons/triton/', kind: 'page' });
  const enceladusSrc = sources.add({ id: 'nasa-enceladus', label: 'NASA Science: Enceladus', url: 'https://science.nasa.gov/saturn/moons/enceladus/', kind: 'page' });
  const jupSrc = sources.add({ id: 'nasa-jupiter-facts', label: 'NASA Science: Jupiter Facts（磁気圏と放射線）', url: 'https://science.nasa.gov/jupiter/jupiter-facts/', kind: 'page' });

  // --- physical parameters
  const jpl = new Map<string, JplPhys>();
  for (const r of tableRows(readFileSync('data/raw/jpl-sats/phys_par.html', 'utf8'))) {
    if (r.length < 6 || !PARENTS[r[0]!]) continue;
    jpl.set(`${r[0]}|${key(r[1]!)}`, { gm: firstNum(r[3]) ?? undefined, radiusKm: firstNum(r[4]) ?? undefined, density: firstNum(r[5]) ?? undefined });
  }
  const sheet = new Map<string, SheetPhys>();
  const sheets: [string, string][] = [
    ['Jupiter', 'joviansatfact'], ['Saturn', 'saturniansatfact'], ['Uranus', 'uraniansatfact'], ['Neptune', 'neptuniansatfact'],
  ];
  for (const [planet, file] of sheets) {
    const sid = sources.add({ id: `nssdc-${file}`, label: `NASA ${planet} Satellite Fact Sheet`, url: `https://nssdc.gsfc.nasa.gov/planetary/factsheet/${file}.html`, kind: 'factsheet' });
    let inBulk = false;
    for (const r of tableRows(readFileSync(`data/raw/nssdc/${file}.html`, 'latin1'))) {
      // Only the bulk-parameter table (header 'Mass(10^20 kg)'); orbital tables follow and must not be read.
      if (/Mass/.test(r[1] ?? '')) {
        inBulk = true;
        continue;
      }
      if (inBulk && r.some((c) => /Semi|Orbital|Period|10\^?3 km|Inclination/i.test(c))) inBulk = false;
      if (!inBulk || r.length !== 5 || !r[0]) continue;
      const name = r[0].replace(/\s*\(.*\)\s*/, '').trim();
      const axes = (r[2] ?? '').split(/x/i).map((x) => num(x)).filter((x): x is number => x != null);
      if (sheet.has(`${planet}|${key(name)}`)) continue;
      sheet.set(`${planet}|${key(name)}`, {
        massKg: num(r[1]) != null ? num(r[1])! * 1e20 : undefined,
        radiusKm: axes.length === 3 ? Math.cbrt(axes[0]! * axes[1]! * axes[2]!) : axes[0],
        density: num(r[3]) != null ? num(r[3])! / 1000 : undefined,
        albedo: num(r[4]) ?? undefined,
        extent: axes.length === 3 ? `${axes.map((x) => Math.round(x * 2)).join(' × ')} km` : undefined,
        src: sid,
      });
    }
  }

  // --- mean elements
  const elems = new Map<string, string[]>();
  for (const r of tableRows(readFileSync('data/raw/jpl-sats/elem.html', 'utf8'))) {
    if (r.length < 14 || !PARENTS[r[1]!]) continue;
    const k = `${r[1]}|${key(r[2]!)}`;
    if (!elems.has(k)) elems.set(k, r);
  }

  // --- discovery list (authoritative list of moons)
  const out: RawBody[] = [];
  let planet = '';
  for (const r of tableRows(readFileSync('data/raw/jpl-sats/discovery.html', 'utf8'))) {
    if (r.length === 1) {
      const m = r[0]!.match(/Satellites of\s+(?:Dwarf Planet\s+)?(\w+)/);
      if (m) planet = m[1]!;
      continue;
    }
    if (r.length < 5 || !PARENTS[planet] || r[0] === 'IAUnumber') continue;
    const [roman, iauName, prov, year, discoverer] = r;
    const name = iauName || prov!;
    const parent = PARENTS[planet]!;
    const k1 = `${planet}|${key(name)}`;
    const k2 = prov ? `${planet}|${key(prov)}` : '';
    const j = jpl.get(k1) ?? (k2 ? jpl.get(k2) : undefined);
    const sh = sheet.get(k1) ?? (k2 ? sheet.get(k2) : undefined);
    const e = elems.get(k1) ?? (k2 ? elems.get(k2) : undefined);
    const aAU = planetA.get(parent.slug) ?? null;

    let massE: number | null = null;
    let massSrc: string | undefined;
    let massDerived = false;
    if (j?.gm != null && j.gm > 0) {
      massE = massEFromGM(j.gm);
      massSrc = physSrc;
      massDerived = true;
    } else if (sh?.massKg != null) {
      massE = sh.massKg / EARTH_MASS_KG;
      massSrc = sh.src;
    }
    const radiusKm = j?.radiusKm ?? sh?.radiusKm ?? null;
    const radiusSrc = j?.radiusKm != null ? physSrc : sh?.src;
    const radiusE = radiusKm != null ? radiusKm / EARTH_RADIUS_KM : null;
    const density = j?.density ?? sh?.density ?? null;
    const densitySrc = j?.density != null ? physSrc : sh?.src;

    const b = blank({
      slug: '',
      name,
      nameJa: iauName ? MOON_JA[iauName] : undefined,
      designation: [roman ? `${planet} ${roman}` : '', prov].filter(Boolean).join(' / ') || undefined,
      category: 'moon',
      parent: parent.slug,
      parentName: parent.ja,
      system: 'solar',
      systemName: '太陽系',
      discoveryYear: num(year) ?? undefined,
      discoveredBy: discoverer || undefined,
      radiusE: val(radiusE, radiusSrc, 'measured', sh?.extent && j?.radiusKm == null ? { note: '3軸の相乗平均' } : {}),
      dimensionsKm: sh?.extent,
      massE: val(massE, massSrc, massDerived ? 'derived' : 'measured', massDerived ? { note: 'GM から換算' } : {}),
      densityGcc: density != null ? val(density, densitySrc) : massE != null && radiusE != null ? val(densityGcc(massE, radiusE), undefined, 'derived') : U,
      gravityG: massE != null && radiusE != null ? val(gravityG(massE, radiusE), undefined, 'derived') : U,
      escapeKmS: massE != null && radiusE != null ? val(escapeKmS(massE, radiusE), undefined, 'derived') : U,
      albedo: val(sh?.albedo, sh?.src),
      aAU: val(aAU, 'nssdc-planets', 'derived', { note: `${parent.ja}と同じ距離` }),
      moonAKm: e ? val(num(e[7]), elemSrc) : U,
      orbitalPeriodD: e ? val(num(e[13]), elemSrc, 'measured', { note: `${parent.ja}を回る周期` }) : U,
      ecc: e ? val(num(e[8]), elemSrc) : U,
      inclDeg: e ? val(num(e[11]), elemSrc) : U,
      hasSurface: 'yes',
      rocky: 'yes',
      atmosphere: 'trace',
      pressureBar: { v: null, c: 'unknown', note: 'タイタン以外に厚い大気を持つ衛星は知られていない', src: titanSrc },
      distanceLy: U,
    });

    // curated, sourced details
    if (name === 'Titan') {
      b.atmosphere = 'thick';
      b.pressureBar = val(1.014 * 1.6, titanSrc, 'derived', { note: '「地球より約60%高い」から換算' });
      b.gases = [{ gas: 'N₂（主成分）' }, { gas: 'CH₄（少量）' }];
      b.gasesSrc = titanSrc;
      b.tempMeanK = val(-179 + 273.15, titanSrc);
    }
    if (name === 'Triton') {
      b.gases = [{ gas: 'N₂（主成分）' }, { gas: 'CH₄（少量）' }];
      b.gasesSrc = tritonSrc;
      b.tempMeanK = val(-235 + 273.15, tritonSrc, 'measured', { note: 'ボイジャー2号の観測' });
      b.tidalLock = 'yes';
    }
    if (name === 'Enceladus') b.tempMeanK = val(-201 + 273.15, enceladusSrc);
    if (planet === 'Jupiter' && e && (num(e[7]) ?? Infinity) <= 671_100) b.hazards = ['radiation'];
    if (b.hazards.includes('radiation')) b.hazardsSrc = jupSrc;
    out.push(b);
  }
  return out;
}
