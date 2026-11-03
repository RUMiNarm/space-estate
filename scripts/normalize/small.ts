/** Dwarf planets, asteroids, trans-Neptunian objects and comets from the JPL Small-Body Database API. */
import { readdirSync, readFileSync } from 'node:fs';
import { EARTH_RADIUS_KM } from '../../src/lib/constants.ts';
import { densityGcc, escapeKmS, gravityFromGM, gravityG, massEFromGM } from '../../src/lib/physics.ts';
import { blank, type RawBody, Sources, U, val } from './body.ts';
import { num, slugify } from './parse.ts';

const DWARF = new Set(['1', '134340', '136199', '136472', '136108']);

export const SMALL_JA: Record<string, string> = {
  Ceres: 'ケレス', Vesta: 'ベスタ', Pallas: 'パラス', Hygiea: 'ヒギエア', Eris: 'エリス', Makemake: 'マケマケ', Haumea: 'ハウメア',
  Sedna: 'セドナ', Quaoar: 'クワオアー', Gonggong: 'ゴンゴン', Orcus: 'オルクス', Salacia: 'サラキア', Ixion: 'イクシオン', Varuna: 'ヴァルナ',
  Eros: 'エロス', Bennu: 'ベンヌ', Ryugu: 'リュウグウ', Apophis: 'アポフィス', Psyche: 'プシケ',
  '1P': 'ハレー彗星', '2P': 'エンケ彗星', '9P': 'テンペル第1彗星', '19P': 'ボレリー彗星', '67P': 'チュリュモフ・ゲラシメンコ彗星',
  '81P': 'ヴィルト第2彗星', '103P': 'ハートレー第2彗星', '109P': 'スイフト・タットル彗星', 'C/1995 O1': 'ヘール・ボップ彗星',
  'C/2020 F3': 'ネオワイズ彗星', "'Oumuamua": 'オウムアムア', 'C/2019 Q4': 'ボリソフ彗星', 'C/2025 N1': 'アトラス彗星（3I/ATLAS）',
};

const SUBCLASS_JA: Record<string, string> = {
  MBA: '小惑星帯', OMB: '小惑星帯外縁', IMB: '小惑星帯内縁', TJN: '木星トロヤ群', CEN: 'ケンタウルス族', TNO: '太陽系外縁天体',
  APO: 'アポロ群（地球近傍）', ATE: 'アテン群（地球近傍）', AMO: 'アモール群（地球近傍）', HYA: '双曲線軌道', JFc: '木星族彗星',
  HTC: 'ハレー型彗星', ETc: 'エンケ型彗星', PAR: '放物線軌道', COM: '彗星', CTc: 'カイロン型彗星', MCA: '火星横断小惑星', HYP: '双曲線軌道',
};

interface Rec {
  pdes: string;
  fullName: string;
  name: string | null;
  kind: string;
  cls: string;
  diameter: number | null;
  extent: string | null;
  albedo: number | null;
  rotPer: number | null;
  gm: number | null;
  density: number | null;
  a: number | null;
  e: number | null;
  i: number | null;
  perY: number | null;
  discoveryYear?: number;
  discoveredBy?: string;
  refs: Record<string, string>;
}

function fromQuery(file: string): Rec[] {
  const d = JSON.parse(readFileSync(file, 'utf8')) as { fields: string[]; data: (string | null)[][] };
  const f = (row: (string | null)[], k: string) => row[d.fields.indexOf(k)] ?? null;
  return d.data.map((r) => ({
    pdes: String(f(r, 'pdes')),
    fullName: String(f(r, 'full_name')).trim(),
    name: f(r, 'name'),
    kind: String(f(r, 'kind')),
    cls: String(f(r, 'class')),
    diameter: num(f(r, 'diameter')),
    extent: f(r, 'extent'),
    albedo: num(f(r, 'albedo')),
    rotPer: num(f(r, 'rot_per')),
    gm: num(f(r, 'GM')),
    density: num(f(r, 'density')),
    a: num(f(r, 'a')),
    e: num(f(r, 'e')),
    i: num(f(r, 'i')),
    perY: num(f(r, 'per_y')),
    refs: {},
  }));
}

interface SbdbSingle {
  object: { des: string; fullname: string; shortname?: string; kind: string; orbit_class?: { code: string }; prefix?: string | null };
  orbit: { elements: { name: string; value: string | null }[] };
  phys_par?: { name: string; value: string; ref?: string }[];
  discovery?: { date?: string; who?: string; name?: string };
}

function fromSingle(file: string): Rec {
  const d = JSON.parse(readFileSync(file, 'utf8')) as SbdbSingle;
  const el = Object.fromEntries(d.orbit.elements.map((e) => [e.name, e.value]));
  const pp = Object.fromEntries((d.phys_par ?? []).map((p) => [p.name, p.value]));
  const refs = Object.fromEntries((d.phys_par ?? []).map((p) => [p.name, p.ref ?? '']));
  const full = d.object.fullname.trim();
  const m = full.match(/^\d+\s+([^()]+?)\s*\(/) ?? full.match(/^([A-Za-z'][^()]*?)\s*\(/);
  const name = d.discovery?.name ?? m?.[1] ?? null;
  return {
    pdes: d.object.des,
    fullName: full,
    name: name && !/^\d/.test(name) ? name : null,
    kind: d.object.kind,
    cls: d.object.orbit_class?.code ?? '',
    diameter: num(pp.diameter),
    extent: pp.extent ?? null,
    albedo: num(pp.albedo),
    rotPer: num(pp.rot_per),
    gm: num(pp.GM),
    density: num(pp.density),
    a: num(el.a),
    e: num(el.e),
    i: num(el.i),
    perY: el.per != null ? (num(el.per) ?? NaN) / 365.25 : null,
    discoveryYear: d.discovery?.date ? Number(d.discovery.date.slice(0, 4)) || undefined : undefined,
    discoveredBy: d.discovery?.who ?? undefined,
    refs,
  };
}

export function buildSmall(sources: Sources): RawBody[] {
  const recs = new Map<string, Rec>();
  for (const r of [...fromQuery('data/raw/sbdb/query-diameter-ge-100.json'), ...fromQuery('data/raw/sbdb/query-tno-bright.json')]) recs.set(r.pdes, r);
  const singles = new Set<string>();
  for (const f of readdirSync('data/raw/sbdb/objects')) {
    const r = fromSingle(`data/raw/sbdb/objects/${f}`);
    const prev = recs.get(r.pdes);
    recs.set(r.pdes, { ...prev, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v != null)) } as Rec);
    singles.add(r.pdes);
  }

  const out: RawBody[] = [];
  for (const r of recs.values()) {
    if (r.pdes === '134340') continue; // Pluto comes from the NSSDC fact sheet
    const src = sources.add({
      id: `sbdb:${r.pdes}`,
      label: `JPL Small-Body Database: ${r.fullName}`,
      url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(r.pdes)}`,
      kind: 'database',
    });
    const isComet = r.kind.startsWith('c') || /^(\d+P|C\/|P\/)/.test(r.pdes);
    // Site rule: eccentricity well above 1 (unbound) → interstellar object (1I, 2I, 3I in this dataset).
    const hyperbolic = r.e != null && r.e > 1;
    const interstellar = r.e != null && r.e > 1.1;
    const radiusE = r.diameter != null ? r.diameter / 2 / EARTH_RADIUS_KM : null;
    const massE = r.gm != null && r.gm > 0 ? massEFromGM(r.gm) : null;
    const display = r.name ?? r.fullName.replace(/^\d+\s+/, '').replace(/^\((.*)\)$/, '$1');
    const cometKey = r.fullName.match(/^(\d+P|C\/\d{4} [A-Z]+\d*)/)?.[1];
    const nameJa = (cometKey && SMALL_JA[cometKey]) || (r.name ? SMALL_JA[r.name] : undefined);
    const category = DWARF.has(r.pdes) ? 'dwarf' : isComet ? 'comet' : 'small';
    const slugBase = DWARF.has(r.pdes) || singles.has(r.pdes) ? (r.name ?? r.pdes) : `${r.pdes} ${r.name ?? ''}`;
    const extra = (k: string) => (r.refs[k] ? { note: r.refs[k]!.slice(0, 120) } : {});

    out.push(
      blank({
        slug: slugify(isComet ? r.fullName : slugBase),
        name: isComet ? r.fullName : display,
        nameJa,
        designation: r.fullName,
        category,
        subclass: interstellar ? '恒星間天体' : SUBCLASS_JA[r.cls] ?? (r.cls || undefined),
        system: 'solar',
        systemName: '太陽系',
        discoveryYear: r.discoveryYear,
        discoveredBy: r.discoveredBy,
        radiusE: val(radiusE, src, 'measured', extra('diameter')),
        dimensionsKm: r.extent ? `${r.extent.replace(/\s*x\s*/g, ' × ')} km` : undefined,
        massE: val(massE, src, 'derived', { note: 'GM から換算' }),
        densityGcc: r.density != null ? val(r.density, src) : massE != null && radiusE != null ? val(densityGcc(massE, radiusE), undefined, 'derived') : U,
        gravityG: r.gm != null && r.diameter != null ? val(gravityFromGM(r.gm, r.diameter / 2), undefined, 'derived') : massE != null && radiusE != null ? val(gravityG(massE, radiusE), undefined, 'derived') : U,
        escapeKmS: massE != null && radiusE != null ? val(escapeKmS(massE, radiusE), undefined, 'derived') : U,
        rotationH: val(r.rotPer, src, 'measured', extra('rot_per')),
        orbitalPeriodD: hyperbolic ? { v: null, c: 'unknown', note: '双曲線軌道のため周期なし', src } : val(r.perY != null && r.perY > 0 ? r.perY * 365.25 : null, src),
        aAU: val(r.a != null && r.a > 0 ? r.a : null, src),
        ecc: val(r.e, src),
        inclDeg: val(r.i, src),
        albedo: val(r.albedo, src),
        hasSurface: 'yes',
        rocky: 'yes',
        atmosphere: 'trace',
        pressureBar: { v: null, c: 'unknown', note: '観測値なし（本サイトでは真空として扱う）' },
        distanceLy: U,
      }),
    );
  }
  return out;
}
