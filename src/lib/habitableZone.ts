import type { HabitableZone } from './types.ts';

/**
 * Kopparapu et al. (2014, ApJL 787, L29), Table 1 and Eqs. (4)–(5).
 * Seff = Seff_sun + a T + b T^2 + c T^3 + d T^4, T = Teff − 5780 K;  d = sqrt(L / Seff) AU.
 * Conservative HZ: runaway greenhouse (1 Earth mass) … maximum greenhouse.
 * Optimistic HZ:   recent Venus … early Mars.
 * The fit is valid for 2600 K ≤ Teff ≤ 7200 K.
 */
const COEF = {
  recentVenus: [1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15],
  runawayGreenhouse: [1.107, 1.332e-4, 1.58e-8, -8.308e-12, -1.931e-15],
  maximumGreenhouse: [0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16],
  earlyMars: [0.32, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16],
} as const;

export type HzLimit = keyof typeof COEF;

export const HZ_TEFF_RANGE: [number, number] = [2600, 7200];
/** Site rule: stars up to this far outside the fitted range are evaluated at the nearest valid Teff and flagged. */
export const HZ_EXTRAPOLATION_K = 400;

export function seff(limit: HzLimit, teff: number): number {
  const [s, a, b, c, d] = COEF[limit];
  const t = teff - 5780;
  return s + a * t + b * t ** 2 + c * t ** 3 + d * t ** 4;
}

export function hzDistanceAU(limit: HzLimit, teff: number, lumSun: number): number {
  return Math.sqrt(lumSun / seff(limit, teff));
}

const UNKNOWN: HabitableZone = { innerAU: null, outerAU: null, optInnerAU: null, optOuterAU: null, status: 'unknown' };

export function habitableZone(
  teff: number | null | undefined,
  lumSun: number | null | undefined,
  aAU: number | null | undefined,
): HabitableZone {
  if (teff == null || lumSun == null || !(lumSun > 0)) return UNKNOWN;
  const [lo, hi] = HZ_TEFF_RANGE;
  if (teff < lo - HZ_EXTRAPOLATION_K || teff > hi + HZ_EXTRAPOLATION_K) return UNKNOWN;
  const extrapolated = teff < lo || teff > hi;
  const t = Math.min(hi, Math.max(lo, teff));
  const innerAU = hzDistanceAU('runawayGreenhouse', t, lumSun);
  const outerAU = hzDistanceAU('maximumGreenhouse', t, lumSun);
  const optInnerAU = hzDistanceAU('recentVenus', t, lumSun);
  const optOuterAU = hzDistanceAU('earlyMars', t, lumSun);
  const base = { innerAU, outerAU, optInnerAU, optOuterAU, ...(extrapolated ? { extrapolated: true } : {}) };
  if (aAU == null || !(aAU > 0)) return { ...base, status: 'unknown' };
  const status =
    aAU >= innerAU && aAU <= outerAU
      ? 'inside'
      : aAU >= optInnerAU && aAU <= optOuterAU
        ? 'optimistic'
        : aAU < optInnerAU
          ? 'tooHot'
          : 'tooCold';
  return { ...base, status };
}
