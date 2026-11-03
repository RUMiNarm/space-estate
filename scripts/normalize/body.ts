import type { Body, Confidence, SourceRef, Val } from '../../src/lib/types.ts';

export type RawBody = Omit<Body, 'hz' | 'esi' | 'survival' | 'equipment' | 'curated'>;

export const U: Val = { v: null, c: 'unknown' };
/** Source id for values computed by this site (formulas on /method/). */
export const SITE_CALC = 'site-calc';

export function val(v: number | null | undefined, src: string | undefined, c: Confidence = 'measured', extra: Partial<Val> = {}): Val {
  if (v == null || !Number.isFinite(v)) return { ...U };
  const s = src ?? (c === 'derived' ? SITE_CALC : undefined);
  return { v, c, ...(s ? { src: s } : {}), ...extra };
}

export function blank(p: Pick<RawBody, 'slug' | 'name' | 'category' | 'system' | 'systemName'> & Partial<RawBody>): RawBody {
  return {
    radiusE: U, massE: U, densityGcc: U, gravityG: U, escapeKmS: U, rotationH: U, orbitalPeriodD: U,
    aAU: U, ecc: U, inclDeg: U, obliquityDeg: U, albedo: U,
    tempMeanK: U, tempMinK: U, tempMaxK: U, tempEqK: U, insolE: U,
    hasSurface: 'unknown', rocky: 'unknown', pressureBar: U, atmosphere: 'unknown', gases: [],
    oxygenBreathable: false, tidalLock: 'unknown', magneticField: 'unknown',
    distanceLy: U, hazards: [],
    ...p,
  };
}

/** Global registry of sources referenced by values. */
export class Sources {
  map = new Map<string, SourceRef>();
  add(ref: SourceRef): string {
    if (!this.map.has(ref.id)) this.map.set(ref.id, ref);
    return ref.id;
  }
}
