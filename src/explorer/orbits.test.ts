import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { jdFromDate, positionAt, solveKepler, type Elements } from './orbits.ts';

const solar = JSON.parse(readFileSync('public/data/universe-solar.json', 'utf8')) as { planets: { s: string; el: Elements }[] };

/** Heliocentric ecliptic J2000 position from a JPL Horizons vector table (CSV mode). */
function horizons(name: string): [number, number, number] {
  const r = (JSON.parse(readFileSync(`data/raw/horizons/${name}-2026-11-03.json`, 'utf8')) as { result: string }).result;
  const line = r.split('$$SOE')[1]!.trim().split('\n')[0]!;
  const f = line.split(',').map((s) => s.trim());
  return [Number(f[2]), Number(f[3]), Number(f[4])];
}

const angle = (a: number[], b: number[]) => {
  const dot = a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
  return (Math.acos(Math.min(1, dot / (Math.hypot(...a) * Math.hypot(...b)))) * 180) / Math.PI;
};

describe('Kepler propagation', () => {
  it('solves Kepler’s equation', () => {
    const E = solveKepler(1, 0.5);
    expect(E - 0.5 * Math.sin(E)).toBeCloseTo(1, 10);
  });

  it.each(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'])(
    '%s matches JPL Horizons on 2026-11-03 to within a few degrees',
    (name) => {
      const p = solar.planets.find((x) => x.s === name)!;
      const ours = positionAt(p.el, jdFromDate(new Date('2026-11-03T00:00:00Z')));
      const ref = horizons(name);
      expect(angle(ours, ref)).toBeLessThan(3);
      expect(Math.abs(Math.hypot(...ours) / Math.hypot(...ref) - 1)).toBeLessThan(0.05);
    },
  );
});
