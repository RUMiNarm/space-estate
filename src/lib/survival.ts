import { EBULLISM_BAR, VACUUM_COLLAPSE_SEC, VACUUM_SURVIVABLE_SEC } from './constants.ts';
import type { Body, Equipment, EquipmentLevel, Survival } from './types.ts';

/** Temperature above which we treat the environment as immediately lethal heat (site rule). */
export const HEAT_LETHAL_K = 423; // 150 °C
/** Temperature above which we treat the body as molten / vaporising rock (site rule). */
export const EXTREME_HEAT_K = 1273; // 1000 °C

type Input = Pick<
  Body,
  | 'category'
  | 'hasSurface'
  | 'pressureBar'
  | 'atmosphere'
  | 'oxygenBreathable'
  | 'tempMaxK'
  | 'tempMeanK'
  | 'tempEqK'
  | 'rocky'
  | 'hazards'
  | 'slug'
>;

/** Representative "hottest plausible surface" temperature used for heat checks. */
export function representativeTempK(b: Pick<Body, 'tempMaxK' | 'tempMeanK' | 'tempEqK'>): number | null {
  return b.tempMaxK.v ?? b.tempMeanK.v ?? b.tempEqK.v ?? null;
}

const fmtC = (k: number) => `${Math.round(k - 273.15).toLocaleString('ja-JP')}°C`;

/** Which temperature representativeTempK() used, for wording. */
export function representativeTempLabel(b: Pick<Body, 'tempMaxK' | 'tempMeanK' | 'tempEqK'>): string {
  if (b.tempMaxK.v != null) return '最高気温';
  if (b.tempMeanK.v != null) return '平均気温';
  if (b.tempEqK.v != null) return '放射平衡温度（推定）';
  return '温度';
}

export function estimateSurvival(b: Input): Survival {
  if (b.slug === 'earth') {
    return { cause: 'earth', consciousSec: null, summary: '普段着で生活できます（基準となる物件）。', sourceIds: [] };
  }
  if (b.category === 'star') {
    return {
      cause: 'stellar',
      consciousSec: [0, 0],
      summary: '表面（光球）は数千K。到着した瞬間に蒸発します。',
      sourceIds: ['nssdc-sun'],
    };
  }
  const t = representativeTempK(b);
  if (t != null && t >= EXTREME_HEAT_K) {
    return {
      cause: 'heat',
      consciousSec: [0, 1],
      summary: `${representativeTempLabel(b)}は ${fmtC(t)}。岩石が融けるほどの高温で、即死します。`,
      sourceIds: ['nasa-sp3006'],
    };
  }
  if (b.hasSurface === 'no') {
    if (b.category === 'exoplanet') {
      return {
        cause: 'noSurface',
        consciousSec: null,
        summary: '大きさや質量から、立てる地面はないと考えられます。厚いガスの層に沈んでいき、深く沈むと高温・高圧でつぶれます。',
        sourceIds: [],
      };
    }
    return {
      cause: 'noSurface',
      consciousSec: [10, 60],
      summary: '地面がありません。酸素のない水素・ヘリウムの大気に沈んでいき、十数秒〜数十秒で意識を失います。深く沈むと高温高圧でつぶれます。',
      sourceIds: ['nasa-sp3006'],
    };
  }
  if (t != null && t >= HEAT_LETHAL_K) {
    return {
      cause: 'heat',
      consciousSec: [0, 10],
      summary: `${representativeTempLabel(b)}は ${fmtC(t)}。生身では数秒ももちません。`,
      sourceIds: ['nasa-sp3006'],
    };
  }
  const p = b.pressureBar.v;
  if (b.atmosphere === 'none' || b.atmosphere === 'trace' || (p != null && p < EBULLISM_BAR)) {
    return {
      cause: 'vacuum',
      consciousSec: VACUUM_COLLAPSE_SEC,
      summary: `気圧が体液の沸騰する 0.063 気圧を大きく下回る真空に近い環境です。約${VACUUM_COLLAPSE_SEC[1]}秒で意識を失い、${VACUUM_SURVIVABLE_SEC}秒を超えると助かる見込みが急に下がります（動物実験の結果）。`,
      sourceIds: ['nasa-sp3006', 'ntrs-19660005052', 'ntrs-19650027167'],
    };
  }
  if (b.atmosphere === 'unknown') {
    return {
      cause: 'unknownAtmosphere',
      consciousSec: [VACUUM_COLLAPSE_SEC[0], 60],
      summary: '大気があるかどうか分かっていません。大気がなければ約10秒、あっても酸素がなければ十数秒〜数十秒で意識を失います。',
      sourceIds: ['nasa-sp3006', 'ntrs-19660005052'],
    };
  }
  if (!b.oxygenBreathable) {
    return {
      cause: 'anoxia',
      consciousSec: [10, 60],
      summary: '気圧は足りていますが、呼吸できる酸素がありません。十数秒〜数十秒で意識を失います。',
      sourceIds: ['nasa-sp3006'],
    };
  }
  return { cause: 'earth', consciousSec: null, summary: '呼吸できる大気があります。', sourceIds: [] };
}

type EqInput = Input & Pick<Body, 'tempMinK'>;

/**
 * Site classification of the minimum equipment needed to live there.
 * The rules are documented on /method/.
 */
export function requiredEquipment(b: EqInput): Equipment {
  const t = representativeTempK(b);
  const p = b.pressureBar.v;
  const lv = (level: EquipmentLevel, reason: string): Equipment => ({ level, minLevel: level, reason });

  if (b.slug === 'earth') return lv(0, '基準となる物件です。');
  if (b.category === 'star') return lv(4, '恒星の表面には降り立てません。');
  if (t != null && t >= EXTREME_HEAT_K) return lv(4, '岩石が融けるほどの高温です。');
  if (b.hasSurface === 'no') return lv(4, '立つための地面がありません。');
  if (p != null && p >= 10 && t != null && t >= 500) return lv(4, '高温・高圧で、現在の技術では地表に長くとどまれません。');

  if (b.atmosphere === 'unknown' || b.hasSurface === 'unknown') {
    return {
      level: null,
      minLevel: 2,
      reason: '大気や地表の状態が分かっていないため判定できません。少なくとも与圧服（宇宙服）は必要です。',
    };
  }
  if (b.hazards.includes('radiation')) return lv(3, '強い放射線があり、宇宙服だけでは長く滞在できません。');
  if (t != null && t >= 573) return lv(3, `${representativeTempLabel(b)}が300°Cを超えます。場所を選び、特別な遮熱が必要です。`);
  if (p != null && p > 5) return lv(3, '気圧が高すぎるため、耐圧設備が必要です。');
  if (b.atmosphere === 'thick' && p != null && p >= 0.5 && p <= 5 && !b.oxygenBreathable) {
    return lv(1, '気圧は足りているので与圧服は不要ですが、酸素ボンベと寒さ・暑さへの対策が必要です。');
  }
  return lv(2, '気圧がほとんどないため、与圧服（宇宙服）が必要です。');
}
