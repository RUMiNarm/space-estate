/**
 * Two-body (Keplerian) propagation of mean orbital elements. Good to a few degrees for the
 * planets over decades — enough for a visual simulator, not for navigation.
 */
export interface Elements {
  a: number; // semi-major axis (any unit; output uses the same unit)
  e: number;
  i: number; // deg
  om: number; // longitude of ascending node, deg
  w: number; // argument of periapsis, deg
  ma: number; // mean anomaly at epoch, deg
  epoch: number; // Julian date
  P: number; // period, days
}

const D2R = Math.PI / 180;

export const jdFromDate = (d: Date): number => d.getTime() / 86_400_000 + 2_440_587.5;

export function solveKepler(M: number, e: number): number {
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 30; k++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-10) break;
  }
  return E;
}

/** Position in the reference plane of the elements (ecliptic for planets): [x, y, z]. */
export function positionAt(el: Elements, jd: number): [number, number, number] {
  const n = 360 / el.P;
  const M = ((((el.ma + n * (jd - el.epoch)) % 360) + 360) % 360) * D2R;
  const E = solveKepler(M, el.e);
  const xv = el.a * (Math.cos(E) - el.e);
  const yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  return rotate(xv, yv, el);
}

function rotate(xv: number, yv: number, el: Elements): [number, number, number] {
  const O = el.om * D2R;
  const w = el.w * D2R;
  const i = el.i * D2R;
  const cO = Math.cos(O), sO = Math.sin(O), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(i), si = Math.sin(i);
  return [
    xv * (cO * cw - sO * sw * ci) - yv * (cO * sw + sO * cw * ci),
    xv * (sO * cw + cO * sw * ci) - yv * (sO * sw - cO * cw * ci),
    xv * (sw * si) + yv * (cw * si),
  ];
}

/** Points along the full ellipse (for drawing the orbit). */
export function orbitPath(el: Elements, segments = 256): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const b = el.a * Math.sqrt(1 - el.e * el.e);
  for (let k = 0; k <= segments; k++) {
    const E = (k / segments) * 2 * Math.PI;
    pts.push(rotate(el.a * (Math.cos(E) - el.e), b * Math.sin(E), el));
  }
  return pts;
}

/** Ecliptic (x, y, z) → three.js world (y up). */
export const toWorld = ([x, y, z]: [number, number, number]): [number, number, number] => [x, z, -y];

/** Radial compression used in the solar-system view: keeps direction, |r| → k·|r|^p. */
export function compress([x, y, z]: [number, number, number], k: number, p: number): [number, number, number] {
  const r = Math.hypot(x, y, z);
  if (r === 0) return [0, 0, 0];
  const s = (k * r ** p) / r;
  return [x * s, y * s, z * s];
}
