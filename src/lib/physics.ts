import { AU_KM, EARTH_MASS_KG, EARTH_RADIUS_KM, G0, G_NEWTON, ROCKY_MASS_MAX, ROCKY_RADIUS_MAX, SUN_RADIUS_KM } from './constants.ts';
import type { Rocky } from './types.ts';

/**
 * Equilibrium temperature as defined by the NASA Exoplanet Archive (pscp_calc):
 * Teq = Teff * sqrt(R* / a) * (1/4)^(1/4)   (zero albedo, full heat redistribution)
 */
export function equilibriumTempK(teffK: number, starRadiusSun: number, aAU: number): number {
  return teffK * Math.sqrt((starRadiusSun * SUN_RADIUS_KM) / (aAU * AU_KM)) * 0.25 ** 0.25;
}

/** Insolation relative to Earth (NASA Exoplanet Archive pscp_calc): S = L / a^2 */
export function insolation(lumSun: number, aAU: number): number {
  return lumSun / aAU ** 2;
}

/** Surface gravity relative to Earth from mass and radius in Earth units. */
export function gravityG(massE: number, radiusE: number): number {
  return massE / radiusE ** 2;
}

/** Surface gravity (Earth = 1) from GM (km^3/s^2) and radius (km). */
export function gravityFromGM(gmKm3s2: number, radiusKm: number): number {
  return (gmKm3s2 * 1e9) / (radiusKm * 1e3) ** 2 / G0;
}

export function massEFromGM(gmKm3s2: number): number {
  return (gmKm3s2 * 1e9) / G_NEWTON / EARTH_MASS_KG;
}

export function escapeKmS(massE: number, radiusE: number): number {
  const m = massE * EARTH_MASS_KG;
  const r = radiusE * EARTH_RADIUS_KM * 1e3;
  return Math.sqrt((2 * G_NEWTON * m) / r) / 1e3;
}

export function densityGcc(massE: number, radiusE: number): number {
  const m = massE * EARTH_MASS_KG * 1e3; // g
  const r = radiusE * EARTH_RADIUS_KM * 1e5; // cm
  return m / ((4 / 3) * Math.PI * r ** 3);
}

/**
 * Rocky-planet classification for exoplanets.
 * - measured radius ≤ 1.6 R⊕ → likely (Rogers 2015); larger → unlikely
 * - else measured mass (or minimum mass) ≤ 2.0 M⊕ → likely (Chen & Kipping 2017); larger → unlikely
 * Upper limits and archive-calculated radii are not used.
 */
export function classifyRocky(opts: {
  radiusE: number | null;
  radiusIsMeasured: boolean;
  massE: number | null;
  massIsUpperLimit: boolean;
}): Rocky {
  const { radiusE, radiusIsMeasured, massE, massIsUpperLimit } = opts;
  if (radiusE != null && radiusIsMeasured) return radiusE <= ROCKY_RADIUS_MAX ? 'likely' : 'unlikely';
  if (massE != null && !massIsUpperLimit) return massE <= ROCKY_MASS_MAX ? 'likely' : 'unlikely';
  return 'unknown';
}

export const kToC = (k: number) => k - 273.15;
