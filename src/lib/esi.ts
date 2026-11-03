/**
 * Earth Similarity Index in the form PHL uses for its Habitable Worlds Catalog
 * (https://phl.upr.edu/projects/earth-similarity-index-esi):
 * a quadratic-mean distance on stellar flux S and radius R, both relative to Earth.
 *
 *   ESI = 1 − sqrt( ½ [ ((S − 1)/(S + 1))² + ((R − 1)/(R + 1))² ] )
 *
 * When only the mass is known, PHL substitutes R = M^(1/3).
 */
export function esi(insolE: number | null, radiusE: number | null, massE?: number | null): number | null {
  if (insolE == null || !(insolE > 0)) return null;
  let r = radiusE;
  if ((r == null || !(r > 0)) && massE != null && massE > 0) r = Math.cbrt(massE);
  if (r == null || !(r > 0)) return null;
  const ds = (insolE - 1) / (insolE + 1);
  const dr = (r - 1) / (r + 1);
  return 1 - Math.sqrt(0.5 * (ds * ds + dr * dr));
}
