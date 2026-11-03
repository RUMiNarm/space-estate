import { describe, expect, it } from 'vitest';
import { EBULLISM_BAR } from './constants.ts';
import { esi } from './esi.ts';
import { habitableZone, seff } from './habitableZone.ts';
import { classifyRocky, equilibriumTempK, gravityG } from './physics.ts';
import { estimateSurvival, requiredEquipment } from './survival.ts';
import type { Body, Val } from './types.ts';

const U: Val = { v: null, c: 'unknown' };
const m = (v: number): Val => ({ v, c: 'measured' });

function body(p: Partial<Body>): Body {
  return {
    slug: 'x', name: 'X', category: 'planet', system: 'solar', systemName: '太陽系',
    radiusE: U, massE: U, densityGcc: U, gravityG: U, escapeKmS: U, rotationH: U, orbitalPeriodD: U, aAU: U,
    ecc: U, inclDeg: U, obliquityDeg: U, albedo: U, tempMeanK: U, tempMinK: U, tempMaxK: U, tempEqK: U, insolE: U,
    hasSurface: 'yes', rocky: 'yes', pressureBar: U, atmosphere: 'unknown', gases: [], oxygenBreathable: false,
    tidalLock: 'unknown', magneticField: 'unknown', distanceLy: U, hazards: [],
    hz: { innerAU: null, outerAU: null, optInnerAU: null, optOuterAU: null, status: 'unknown' },
    esi: null, curated: false,
    survival: { cause: 'earth', consciousSec: null, summary: '', sourceIds: [] },
    equipment: { level: 0, minLevel: 0, reason: '' },
    ...p,
  };
}

describe('habitable zone (Kopparapu et al. 2014)', () => {
  it('reproduces the conservative solar HZ of 0.95–1.67 au', () => {
    const hz = habitableZone(5780, 1, 1);
    expect(hz.innerAU).toBeCloseTo(0.95, 2);
    expect(hz.outerAU).toBeCloseTo(1.67, 1);
    expect(hz.status).toBe('inside');
  });
  it('uses the Table 1 coefficients at T* = 0', () => {
    expect(seff('runawayGreenhouse', 5780)).toBeCloseTo(1.107, 6);
    expect(seff('maximumGreenhouse', 5780)).toBeCloseTo(0.356, 6);
  });
  it('classifies Venus as too hot and Mars as inside the conservative HZ', () => {
    expect(habitableZone(5772, 1, 0.723).status).toBe('tooHot');
    expect(habitableZone(5772, 1, 1.524).status).toBe('inside');
  });
  it('distinguishes the optimistic-only zone', () => {
    const hz = habitableZone(5772, 1, 0.8);
    expect(hz.status).toBe('optimistic');
  });
  it('flags stars slightly outside the fitted Teff range and refuses far outside', () => {
    expect(habitableZone(2566, 10 ** -3.257, 0.029).extrapolated).toBe(true);
    expect(habitableZone(1500, 1e-4, 0.01).status).toBe('unknown');
  });
});

describe('ESI (PHL form)', () => {
  it('is 1 for Earth and decreases away from it', () => {
    expect(esi(1, 1)).toBe(1);
    expect(esi(2, 1)!).toBeLessThan(1);
    expect(esi(1, 2)!).toBeCloseTo(esi(1, 0.5)!, 10); // (R-1)/(R+1) is antisymmetric in log space
  });
  it('falls back to R = M^(1/3) and returns null without inputs', () => {
    expect(esi(1, null, 8)).toBeCloseTo(esi(1, 2)!, 10);
    expect(esi(null, 1)).toBeNull();
  });
});

describe('physics helpers', () => {
  it('equilibrium temperature of Earth is about 278 K', () => {
    expect(equilibriumTempK(5772, 1, 1)).toBeGreaterThan(276);
    expect(equilibriumTempK(5772, 1, 1)).toBeLessThan(280);
  });
  it('gravity from mass and radius', () => {
    expect(gravityG(0.692, 0.92)).toBeCloseTo(0.818, 2); // TRAPPIST-1 e
  });
  it('rocky classification thresholds', () => {
    expect(classifyRocky({ radiusE: 1.5, radiusIsMeasured: true, massE: null, massIsUpperLimit: false })).toBe('likely');
    expect(classifyRocky({ radiusE: 2.1, radiusIsMeasured: true, massE: 1, massIsUpperLimit: false })).toBe('unlikely');
    expect(classifyRocky({ radiusE: 1.02, radiusIsMeasured: false, massE: 1.05, massIsUpperLimit: false })).toBe('likely');
    expect(classifyRocky({ radiusE: null, radiusIsMeasured: false, massE: 9.1, massIsUpperLimit: true })).toBe('unknown');
  });
});

describe('survival and equipment rules', () => {
  it('vacuum below the ebullism threshold', () => {
    const b = body({ pressureBar: m(EBULLISM_BAR / 10), atmosphere: 'thin', tempMeanK: m(214) });
    expect(estimateSurvival(b).cause).toBe('vacuum');
    expect(requiredEquipment(b).level).toBe(2);
  });
  it('thick anoxic atmosphere at moderate pressure needs only oxygen and insulation', () => {
    const b = body({ pressureBar: m(1.6), atmosphere: 'thick', tempMeanK: m(94) });
    expect(estimateSurvival(b).cause).toBe('anoxia');
    expect(requiredEquipment(b).level).toBe(1);
  });
  it('hot dense atmosphere is impossible', () => {
    const b = body({ pressureBar: m(92), atmosphere: 'thick', tempMeanK: m(737) });
    expect(estimateSurvival(b).cause).toBe('heat');
    expect(requiredEquipment(b).level).toBe(4);
  });
  it('no surface', () => {
    const b = body({ hasSurface: 'no', atmosphere: 'thick', tempMeanK: m(165) });
    expect(estimateSurvival(b).cause).toBe('noSurface');
    expect(requiredEquipment(b).level).toBe(4);
  });
  it('unknown atmosphere is undetermined with a pressure-suit lower bound', () => {
    const b = body({ category: 'exoplanet', atmosphere: 'unknown', tempEqK: m(250) });
    expect(estimateSurvival(b).cause).toBe('unknownAtmosphere');
    const eq = requiredEquipment(b);
    expect(eq.level).toBeNull();
    expect(eq.minLevel).toBe(2);
  });
  it('radiation hazard raises the level', () => {
    const b = body({ atmosphere: 'trace', hazards: ['radiation'] });
    expect(requiredEquipment(b).level).toBe(3);
  });
});
