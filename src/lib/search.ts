/** Client-side filtering over the compact search index. Pure functions (unit-tested). */
import type { Category, EquipmentLevel, IndexRow } from './types.ts';

export interface Filters {
  q: string;
  cats: Category[]; // empty = all
  parent: string; // moons of this body
  rocky: boolean;
  hz: 'any' | 'cons' | 'opt';
  atm: 'any' | 'notAirless' | 'known';
  includeUnknown: boolean;
  tMinC: number | null;
  tMaxC: number | null;
  gMin: number | null;
  gMax: number | null;
  dMaxLy: number | null;
  eqMax: EquipmentLevel | null;
  curatedOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  q: '', cats: [], parent: '', rocky: false, hz: 'any', atm: 'any', includeUnknown: true,
  tMinC: null, tMaxC: null, gMin: null, gMax: null, dMaxLy: null, eqMax: null, curatedOnly: false,
};

export type SortKey = 'esi' | 'distance' | 'year' | 'gravity' | 'temp' | 'name' | 'radius';

export interface Step {
  key: string;
  label: string;
  test: (r: IndexRow) => boolean;
}

const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[\s'’・\-]/g, '');

/** Ordered filter steps that are currently active (inactive ones are omitted). */
export function steps(f: Filters): Step[] {
  const u = f.includeUnknown;
  const out: Step[] = [];
  if (f.cats.length) out.push({ key: 'cat', label: '種類', test: (r) => f.cats.includes(r.c) });
  if (f.parent) out.push({ key: 'parent', label: '母天体', test: (r) => r.p === f.parent });
  if (f.curatedOnly) out.push({ key: 'curated', label: '厳選物件', test: (r) => r.cu });
  if (f.q.trim()) {
    const q = norm(f.q);
    out.push({ key: 'q', label: '名前', test: (r) => norm(r.n).includes(q) || (r.j ? norm(r.j).includes(q) : false) || norm(r.sy).includes(q) });
  }
  if (f.rocky) out.push({ key: 'rocky', label: '岩石・固体', test: (r) => r.r === 'yes' || r.r === 'likely' || (u && r.r === 'unknown') });
  if (f.hz !== 'any')
    out.push({
      key: 'hz',
      label: f.hz === 'cons' ? 'ハビタブルゾーン（保守的）' : 'ハビタブルゾーン（楽観的を含む）',
      test: (r) => r.c !== 'star' && (r.hz === 'inside' || (f.hz === 'opt' && r.hz === 'optimistic') || (u && r.hz === 'unknown')),
    });
  if (f.atm !== 'any')
    out.push({
      key: 'atm',
      label: f.atm === 'known' ? '大気が確認済み' : '大気がない天体を除く',
      test: (r) => r.at === 'thick' || r.at === 'thin' || (f.atm === 'notAirless' && u && r.at === 'unknown'),
    });
  if (f.tMinC != null || f.tMaxC != null) {
    const lo = f.tMinC == null ? -Infinity : f.tMinC + 273.15;
    const hi = f.tMaxC == null ? Infinity : f.tMaxC + 273.15;
    out.push({ key: 't', label: '気温', test: (r) => (r.t == null ? u : r.t >= lo && r.t <= hi) });
  }
  if (f.gMin != null || f.gMax != null) {
    const lo = f.gMin ?? -Infinity;
    const hi = f.gMax ?? Infinity;
    out.push({ key: 'g', label: '重力', test: (r) => (r.g == null ? u : r.g >= lo && r.g <= hi) });
  }
  if (f.dMaxLy != null) {
    const max = f.dMaxLy;
    out.push({ key: 'd', label: '距離', test: (r) => (r.sy === 'solar' ? true : r.d == null ? u : r.d <= max) });
  }
  if (f.eqMax != null) {
    const max = f.eqMax;
    out.push({ key: 'eq', label: '入居条件', test: (r) => (r.eq == null ? u && r.eqMin <= max : r.eq <= max) });
  }
  return out;
}

export interface Funnel {
  rows: IndexRow[];
  counts: { key: string; label: string; remaining: number; removed: number }[];
}

export function runFilters(all: IndexRow[], f: Filters): Funnel {
  let rows = all;
  const counts: Funnel['counts'] = [];
  for (const s of steps(f)) {
    const next = rows.filter(s.test);
    counts.push({ key: s.key, label: s.label, remaining: next.length, removed: rows.length - next.length });
    rows = next;
  }
  return { rows, counts };
}

/** For a row excluded by the filters, the label of the first step it fails. */
export function firstFailure(r: IndexRow, f: Filters): string | null {
  for (const s of steps(f)) if (!s.test(r)) return s.label;
  return null;
}

const last = (x: number | null, dir: 1 | -1) => (x == null ? Infinity : dir * x);

export function sortRows(rows: IndexRow[], key: SortKey): IndexRow[] {
  const r = [...rows];
  const by: Record<SortKey, (a: IndexRow) => number | string> = {
    esi: (a) => last(a.e, -1),
    distance: (a) => (a.sy === 'solar' ? -1 : last(a.d, 1)),
    year: (a) => last(a.y, -1),
    gravity: (a) => (a.g == null || a.g <= 0 ? Infinity : Math.abs(Math.log(a.g))),
    temp: (a) => (a.t == null ? Infinity : Math.abs(a.t - 288)),
    radius: (a) => (a.rad == null || a.rad <= 0 ? Infinity : Math.abs(Math.log(a.rad))),
    name: (a) => a.j ?? a.n,
  };
  const f = by[key];
  return r.sort((a, b) => {
    const x = f(a);
    const y = f(b);
    if (typeof x === 'string' || typeof y === 'string') return String(x).localeCompare(String(y), 'ja');
    return x - y || (a.cu === b.cu ? 0 : a.cu ? -1 : 1);
  });
}

// ---- URL state
export function toQuery(f: Filters, sort: SortKey): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.cats.length) p.set('c', f.cats.join(','));
  if (f.parent) p.set('p', f.parent);
  if (f.rocky) p.set('rocky', '1');
  if (f.hz !== 'any') p.set('hz', f.hz);
  if (f.atm !== 'any') p.set('atm', f.atm);
  if (!f.includeUnknown) p.set('unk', '0');
  if (f.tMinC != null) p.set('tmin', String(f.tMinC));
  if (f.tMaxC != null) p.set('tmax', String(f.tMaxC));
  if (f.gMin != null) p.set('gmin', String(f.gMin));
  if (f.gMax != null) p.set('gmax', String(f.gMax));
  if (f.dMaxLy != null) p.set('dmax', String(f.dMaxLy));
  if (f.eqMax != null) p.set('eq', String(f.eqMax));
  if (f.curatedOnly) p.set('cu', '1');
  if (sort !== 'esi') p.set('sort', sort);
  return p.toString();
}

const CATS: Category[] = ['star', 'planet', 'dwarf', 'moon', 'small', 'comet', 'exoplanet'];
const SORTS: SortKey[] = ['esi', 'distance', 'year', 'gravity', 'temp', 'name', 'radius'];

export function fromQuery(qs: string, base: Filters = DEFAULT_FILTERS): { f: Filters; sort: SortKey } {
  const p = new URLSearchParams(qs);
  const n = (k: string) => {
    const v = p.get(k);
    if (v == null || v === '') return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };
  const eq = n('eq');
  const hz = p.get('hz');
  const atm = p.get('atm');
  const sort = p.get('sort') as SortKey | null;
  return {
    f: {
      ...base,
      q: p.get('q') ?? base.q,
      cats: p.get('c') ? (p.get('c')!.split(',').filter((c) => CATS.includes(c as Category)) as Category[]) : base.cats,
      parent: p.get('p') ?? base.parent,
      rocky: p.get('rocky') === '1' || base.rocky,
      hz: hz === 'cons' || hz === 'opt' ? hz : base.hz,
      atm: atm === 'notAirless' || atm === 'known' ? atm : base.atm,
      includeUnknown: p.get('unk') === '0' ? false : base.includeUnknown,
      tMinC: n('tmin') ?? base.tMinC,
      tMaxC: n('tmax') ?? base.tMaxC,
      gMin: n('gmin') ?? base.gMin,
      gMax: n('gmax') ?? base.gMax,
      dMaxLy: n('dmax') ?? base.dMaxLy,
      eqMax: eq != null && eq >= 0 && eq <= 4 ? (eq as EquipmentLevel) : base.eqMax,
      curatedOnly: p.get('cu') === '1' || base.curatedOnly,
    },
    sort: sort && SORTS.includes(sort) ? sort : 'esi',
  };
}
