import type { AtmosphereStatus, Category, Confidence, EquipmentLevel, HzStatus, Rocky, SurvivalCause, Val } from './types.ts';

export const CATEGORY_JA: Record<Category, string> = {
  star: '恒星',
  planet: '惑星',
  dwarf: '準惑星',
  moon: '衛星',
  small: '小天体',
  comet: '彗星',
  exoplanet: '系外惑星',
};

export const HZ_JA: Record<HzStatus, string> = {
  inside: 'ハビタブルゾーン内（保守的）',
  optimistic: 'ハビタブルゾーン内（楽観的のみ）',
  tooHot: '恒星に近すぎる',
  tooCold: '恒星から遠すぎる',
  unknown: '判定できない',
};

export const ATM_JA: Record<AtmosphereStatus, string> = {
  thick: '厚い大気',
  thin: '薄い大気',
  trace: 'ほぼ真空',
  none: '大気なし',
  unknown: '不明',
};

export const ROCKY_JA: Record<Rocky, string> = {
  yes: '固体の地表（岩石・氷）',
  likely: '岩石惑星の可能性が高い',
  unlikely: '岩石惑星ではない可能性が高い',
  no: 'ガス・恒星（地表なし）',
  unknown: '不明',
};

export const CONF_JA: Record<Confidence, string> = {
  measured: '実測',
  calculated: '計算値',
  derived: '本サイト計算',
  unknown: '不明',
};

export const SURVIVAL_JA: Record<SurvivalCause, string> = {
  earth: '生活できる',
  stellar: '蒸発',
  heat: '高温',
  noSurface: '地面がない',
  vacuum: '真空',
  anoxia: '酸素がない',
  unknownAtmosphere: '大気が不明',
};

export const EQUIP: Record<EquipmentLevel | 'null', { label: string; short: string; color: string; icon: string }> = {
  0: { label: 'Lv0 普段着でOK', short: 'Lv0', color: 'var(--good)', icon: '✓' },
  1: { label: 'Lv1 酸素ボンベと寒さ・暑さ対策', short: 'Lv1', color: 'var(--warning)', icon: '!' },
  2: { label: 'Lv2 与圧服（宇宙服）が必要', short: 'Lv2', color: 'var(--serious)', icon: '!!' },
  3: { label: 'Lv3 特殊な遮蔽が必要', short: 'Lv3', color: 'var(--critical)', icon: '⚠' },
  4: { label: 'Lv4 現在の技術では入居不可', short: 'Lv4', color: 'var(--ink)', icon: '✕' },
  null: { label: '判定不能（データ不足）', short: '判定不能', color: 'var(--muted)', icon: '?' },
};

const nf = (d: number) => new Intl.NumberFormat('ja-JP', { maximumFractionDigits: d, minimumFractionDigits: 0 });

/** Format a number with sensible precision. */
export function fmt(x: number | null | undefined, digits?: number): string {
  if (x == null || !Number.isFinite(x)) return '不明';
  const a = Math.abs(x);
  if (digits == null) {
    if (a === 0) return '0';
    if (a >= 1000) digits = 0;
    else if (a >= 100) digits = 1;
    else if (a >= 1) digits = 2;
    else if (a >= 0.01) digits = 3;
    else return x.toExponential(1).replace('e', '×10^').replace('^-', '⁻').replace(/\^(\d+)/, (_, d) => superscript(d)).replace(/⁻(\d+)/, (_, d) => '⁻' + superscript(d));
  }
  return nf(digits).format(x);
}

function superscript(s: string): string {
  const m: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return s.replace(/\d/g, (d) => m[d] ?? d);
}

export const kToC = (k: number) => k - 273.15;

export function fmtTemp(k: number | null | undefined): string {
  if (k == null) return '不明';
  return `${fmt(k, k >= 100 ? 0 : 1)} K（${fmt(kToC(k), 0)}°C）`;
}

export function limPrefix(v: Val): string {
  return v.lim === 'upper' ? '≦ ' : v.lim === 'lower' ? '≧ ' : '';
}

export function fmtDays(d: number | null | undefined): string {
  if (d == null) return '—';
  if (d < 2) return `${fmt(d * 24, 1)} 時間`;
  if (d > 730) return `${fmt(d / 365.25, d > 36525 ? 0 : 1)} 年`;
  return `${fmt(d, d >= 100 ? 0 : 1)} 日`;
}

export function fmtHours(h: number | null | undefined): string {
  if (h == null) return '—';
  if (h > 72) return `${fmt(h / 24, 1)} 日（${fmt(h, 0)} 時間）`;
  return `${fmt(h, 1)} 時間`;
}

export function fmtLy(ly: number | null | undefined): string {
  if (ly == null) return '不明';
  return `${fmt(ly, ly < 10 ? 2 : ly < 1000 ? 1 : 0)} 光年`;
}

/** Travel-time scenarios (fractions of the speed of light — no external speed claims). */
export const TRAVEL_SPEEDS: { label: string; c: number }[] = [
  { label: '光速', c: 1 },
  { label: '光速の10%', c: 0.1 },
  { label: '光速の1%（約3,000 km/s）', c: 0.01 },
  { label: '光速の0.01%（約30 km/s）', c: 0.0001 },
];

export function travelYears(ly: number, c: number): string {
  const y = ly / c;
  if (y < 1) return `${fmt(y * 12, 1)} か月`;
  if (y >= 1e4) return `約${fmt(y / 1e4, 1)}万年`;
  return `${fmt(y, y < 10 ? 1 : 0)} 年`;
}

export function displayName(b: { name: string; nameJa?: string }): string {
  return b.nameJa ?? b.name;
}
