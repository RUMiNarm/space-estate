/** Template text generated from data for bodies without hand-written copy (段階B). */
import { CATEGORY_JA, fmt, fmtDays, fmtLy, kToC } from './format.ts';
import { representativeTempK } from './survival.ts';
import type { Body } from './types.ts';

export interface AutoText {
  summary: string;
  pros: string[];
  cons: string[];
  earthLife: string[];
}

export function autoText(b: Body): AutoText {
  const pros: string[] = [];
  const cons: string[] = [];
  const life: string[] = [];
  const t = representativeTempK(b);
  const g = b.gravityG.v;

  // location
  if (b.hz.status === 'inside') {
    pros.push('保守的なハビタブルゾーンの内側にある。');
  } else if (b.hz.status === 'optimistic') {
    pros.push('楽観的なハビタブルゾーンの内側にある（保守的な基準では外側）。');
  } else if (b.hz.status === 'tooHot') cons.push('ハビタブルゾーンより恒星に近い。');
  else if (b.hz.status === 'tooCold') cons.push('ハビタブルゾーンより外側にある。');
  if (b.hz.extrapolated) cons.push('主星の温度がハビタブルゾーンのモデルの適用範囲（2,600〜7,200 K）外のため、判定は参考値。');

  // size & surface
  if (b.rocky === 'likely') {
    pros.push('大きさや質量から、岩石惑星の可能性が高い。');
  } else if (b.rocky === 'unlikely') cons.push('大きさや質量が岩石惑星の目安を超えている。');
  if (b.hasSurface === 'no') {
    cons.push('固体の地表がない。');
  }

  // gravity
  if (g != null) {
    if (g >= 0.8 && g <= 1.25) pros.push(`重力は地球の${fmt(g, 2)}倍。`);
    else if (g < 0.05) cons.push(`重力は地球の${fmt(g)}倍。`);
    else if (g < 0.8) pros.push(`重力は地球の${fmt(g, 2)}倍。`);
    else cons.push(`重力は地球の${fmt(g, 2)}倍。`);
    life.push(`体重60 kgの人の重さは${fmt(60 * g, g < 0.1 ? 2 : 1)} kg相当。`);
  }

  // temperature
  if (t != null) {
    const c = kToC(t);
    if (b.category !== 'star') {
      if (c >= 0 && c <= 50) pros.push(`代表的な温度は約${fmt(c, 0)}°C。`);
      else if (c > 50) cons.push(`代表的な温度は約${fmt(c, 0)}°C。`);
      else cons.push(`代表的な温度は約${fmt(c, 0)}°C。`);
    }
  }
  if (b.atmosphere === 'unknown') cons.push('大気があるかどうかは分かっていない。');

  // time
  if (b.orbitalPeriodD.v != null && b.category !== 'moon') life.push(`1年（公転周期）は${fmtDays(b.orbitalPeriodD.v)}。`);
  if (b.category === 'moon' && b.orbitalPeriodD.v != null) life.push(`${b.parentName ?? '惑星'}のまわりを${fmtDays(b.orbitalPeriodD.v)}で1周する。`);

  // distance
  if (b.distanceLy.v != null && b.system !== 'solar') {
    if (b.distanceLy.v < 20) pros.push(`地球から${fmtLy(b.distanceLy.v)}。`);
    else if (b.distanceLy.v > 1000) cons.push(`地球から${fmtLy(b.distanceLy.v)}。`);
  }
  if (b.controversial) cons.push('NASA Exoplanet Archive では、存在が議論されている惑星として扱われている。');
  if (b.hazards.includes('radiation')) cons.push('木星の磁場が生む強い放射線を受ける。');

  const where =
    b.category === 'exoplanet'
      ? `${b.systemName} を回る系外惑星`
      : b.category === 'moon'
        ? `${b.parentName}の衛星`
        : `太陽系の${b.subclass ?? CATEGORY_JA[b.category]}`;
  // keep the lead short: the verdict table sits right below
  const place =
    b.hz.status === 'inside' ? 'ハビタブルゾーンの内側を回っています。' : b.hz.status === 'optimistic' ? '楽観的なハビタブルゾーンの内側を回っています。' : '';
  const summary = `${where}です。${place}`;

  const bare = (xs: string[]) => xs.map((x) => x.replace(/。$/, ''));
  return { summary, pros: bare(pros), cons: bare(cons), earthLife: bare(life) };
}
