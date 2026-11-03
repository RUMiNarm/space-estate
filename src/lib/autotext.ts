/** Template text generated from data for bodies without hand-written copy (段階B). */
import { CATEGORY_JA, fmt, fmtDays, fmtLy, kToC } from './format.ts';
import { representativeTempK } from './survival.ts';
import type { Body } from './types.ts';

export interface AutoText {
  summary: string;
  pros: string[];
  cons: string[];
  earthLife: string[];
  tags: string[];
}

export function autoText(b: Body): AutoText {
  const pros: string[] = [];
  const cons: string[] = [];
  const life: string[] = [];
  const tags: string[] = [];
  const t = representativeTempK(b);
  const g = b.gravityG.v;

  // location
  if (b.hz.status === 'inside') {
    pros.push('保守的なハビタブルゾーンの内側にあり、液体の水が存在しうる距離です。');
    tags.push('ハビタブルゾーン内');
  } else if (b.hz.status === 'optimistic') {
    pros.push('楽観的なハビタブルゾーンの内側にあります（保守的な基準では外側）。');
    tags.push('ハビタブルゾーン内（楽観的）');
  } else if (b.hz.status === 'tooHot') cons.push('ハビタブルゾーンより恒星に近く、水が液体でいられないほど熱いと考えられます。');
  else if (b.hz.status === 'tooCold') cons.push('ハビタブルゾーンより外側で、水は凍ってしまう距離です。');
  if (b.hz.extrapolated) cons.push('主星の温度がハビタブルゾーンのモデルの適用範囲（2,600〜7,200 K）を外れるため、判定は参考値です。');

  // size & surface
  if (b.rocky === 'likely') {
    pros.push('大きさや質量から、岩石惑星の可能性が高いと判定されます。');
    tags.push('岩石の可能性');
  } else if (b.rocky === 'unlikely') cons.push('大きさや質量が岩石惑星の目安を超えており、厚いガスや水の層を持つ可能性が高いです。');
  if (b.hasSurface === 'no') {
    cons.push('立つための地面がありません。');
    tags.push('地面なし物件');
  }

  // gravity
  if (g != null) {
    if (g >= 0.8 && g <= 1.25) pros.push(`重力は地球の${fmt(g, 2)}倍で、地球とあまり変わりません。`);
    else if (g < 0.05) cons.push(`重力は地球の${fmt(g)}倍しかなく、ジャンプすると戻ってこられないおそれがあります。`);
    else if (g < 0.8) pros.push(`重力は地球の${fmt(g, 2)}倍。体が軽く感じます。`);
    else cons.push(`重力は地球の${fmt(g, 2)}倍。立っているだけで体が重く感じます。`);
    life.push(`体重60 kgの人は、ここでは${fmt(60 * g, g < 0.1 ? 2 : 1)} kg相当の重さを感じます。`);
  }

  // temperature
  if (t != null) {
    const c = kToC(t);
    if (b.category !== 'star') {
      if (c >= 0 && c <= 50) pros.push(`代表的な温度は約${fmt(c, 0)}°Cで、水が液体でいられる範囲です。`);
      else if (c > 50) cons.push(`代表的な温度は約${fmt(c, 0)}°Cと高温です。`);
      else cons.push(`代表的な温度は約${fmt(c, 0)}°Cと極寒です。`);
    }
  }
  if (b.atmosphere === 'unknown') cons.push('大気があるかどうかは分かっていません。');

  // time
  if (b.orbitalPeriodD.v != null && b.category !== 'moon') life.push(`1年（公転周期）は${fmtDays(b.orbitalPeriodD.v)}です。`);
  if (b.category === 'moon' && b.orbitalPeriodD.v != null) life.push(`${b.parentName ?? '惑星'}のまわりを${fmtDays(b.orbitalPeriodD.v)}で1周します。`);

  // distance
  if (b.distanceLy.v != null && b.system !== 'solar') {
    if (b.distanceLy.v < 20) {
      pros.push(`地球から${fmtLy(b.distanceLy.v)}と、系外惑星としては近所です。`);
      tags.push('ご近所');
    } else if (b.distanceLy.v > 1000) cons.push(`地球から${fmtLy(b.distanceLy.v)}と非常に遠い物件です。`);
  }
  if (b.jwstObservations) tags.push('JWST観測あり');
  if (b.controversial) {
    tags.push('存在に議論あり');
    cons.push('NASA Exoplanet Archive では、存在が議論されている惑星として扱われています。');
  }
  if (b.hazards.includes('radiation')) {
    cons.push('木星の磁場が生む強烈な放射線が降り注ぎます。');
    tags.push('放射線注意');
  }

  const where =
    b.category === 'exoplanet'
      ? `${b.systemName} を回る系外惑星`
      : b.category === 'moon'
        ? `${b.parentName}の衛星`
        : `太陽系の${b.subclass ?? CATEGORY_JA[b.category]}`;
  const summary = `${where}です。${b.survival.summary}`;

  return { summary, pros, cons, earthLife: life, tags };
}
