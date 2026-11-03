/** Integrity checks on the normalized dataset (run `pnpm run data:normalize` first). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Body, IndexRow, SourceRef, Val } from '../../src/lib/types.ts';

const bodies = JSON.parse(readFileSync('data/normalized/bodies.json', 'utf8')) as Body[];
const sources = JSON.parse(readFileSync('data/normalized/sources.json', 'utf8')) as Record<string, SourceRef>;
const report = JSON.parse(readFileSync('data/normalized/report.json', 'utf8')) as { total: number; moonCountsJpl: Record<string, number> };
const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as IndexRow[];
const by = new Map(bodies.map((b) => [b.slug, b]));

function vals(b: Body): [string, Val][] {
  return Object.entries(b).filter(([, v]) => v && typeof v === 'object' && 'c' in v && 'v' in v) as [string, Val][];
}

describe('dataset integrity', () => {
  it('has unique slugs and matches the report and the search index', () => {
    expect(new Set(bodies.map((b) => b.slug)).size).toBe(bodies.length);
    expect(bodies.length).toBe(report.total);
    expect(index.length).toBe(bodies.length);
  });

  it('includes the whole NASA Exoplanet Archive table', () => {
    const csv = readFileSync('data/raw/exoplanet-archive/pscomppars.csv', 'utf8');
    const rows = csv.split('\n').filter((l) => l.startsWith('"')).length;
    expect(bodies.filter((b) => b.category === 'exoplanet').length).toBe(rows);
  });

  it('includes every moon in the JPL discovery list', () => {
    for (const [parent, n] of Object.entries(report.moonCountsJpl)) {
      const got = bodies.filter((b) => b.category === 'moon' && b.parent === parent).length;
      expect(got, parent).toBe(n);
    }
  });

  it('every measured or calculated value names a source that exists', () => {
    for (const b of bodies) {
      for (const [k, v] of vals(b)) {
        if (v.c === 'measured' || v.c === 'calculated') {
          expect(v.src, `${b.slug}.${k}`).toBeTruthy();
          expect(sources[v.src!], `${b.slug}.${k} -> ${v.src}`).toBeTruthy();
        }
        if (v.v != null) expect(Number.isFinite(v.v), `${b.slug}.${k}`).toBe(true);
        if (v.c === 'unknown') expect(v.v, `${b.slug}.${k}`).toBeNull();
        if (v.v != null) {
          expect(v.src, `${b.slug}.${k} has a value but no source`).toBeTruthy();
          expect(sources[v.src!], `${b.slug}.${k} -> ${v.src}`).toBeTruthy();
        }
      }
      for (const id of b.survival.sourceIds) expect(sources[id], `${b.slug} survival ${id}`).toBeTruthy();
    }
  });

  it('solar-system values are physically plausible (catches table-parsing errors)', () => {
    for (const b of bodies.filter((x) => x.system === 'solar' && x.category !== 'star')) {
      if (b.gravityG.v != null) expect(b.gravityG.v, `${b.slug} gravity`).toBeLessThan(30);
      if (b.densityGcc.v != null) {
        expect(b.densityGcc.v, `${b.slug} density`).toBeGreaterThan(0.05);
        expect(b.densityGcc.v, `${b.slug} density`).toBeLessThan(30);
      }
    }
  });

  it('flags implausible exoplanet densities and does not call them rocky', () => {
    for (const b of bodies.filter((x) => x.category === 'exoplanet' && x.densityGcc.v != null && (x.densityGcc.v > 30 || x.densityGcc.v < 0.05))) {
      expect(b.dataWarnings?.length, b.slug).toBeGreaterThan(0);
      expect(b.rocky, b.slug).toBe('unknown');
    }
  });

  it('classifies the interstellar objects', () => {
    for (const s of ['oumuamua', 'c-2019-q4-borisov', 'c-2025-n1-atlas']) expect(by.get(s)?.subclass, s).toBe('恒星間天体');
  });

  it('has physically sane values', () => {
    for (const b of bodies) {
      if (b.radiusE.v != null) expect(b.radiusE.v, b.slug).toBeGreaterThan(0);
      if (b.massE.v != null) expect(b.massE.v, b.slug).toBeGreaterThan(0);
      if (b.tempEqK.v != null) expect(b.tempEqK.v, b.slug).toBeGreaterThan(0);
      if (b.esi != null) {
        expect(b.esi, b.slug).toBeGreaterThanOrEqual(0);
        expect(b.esi, b.slug).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('expected judgments for reference bodies', () => {
  const cases: [string, number | null, string][] = [
    ['earth', 0, 'earth'],
    ['sun', 4, 'stellar'],
    ['mercury', 3, 'heat'],
    ['venus', 4, 'heat'],
    ['moon', 2, 'vacuum'],
    ['mars', 2, 'vacuum'],
    ['jupiter', 4, 'noSurface'],
    ['titan', 1, 'anoxia'],
    ['io', 3, 'vacuum'],
    ['pluto', 2, 'vacuum'],
    ['ceres', 2, 'vacuum'],
    ['corot-7-b', 4, 'heat'],
    ['proxima-cen-b', null, 'unknownAtmosphere'],
    ['trappist-1-e', null, 'unknownAtmosphere'],
  ];
  it.each(cases)('%s → level %s, cause %s', (slug, level, cause) => {
    const b = by.get(slug);
    expect(b, slug).toBeTruthy();
    expect(b!.equipment.level).toBe(level);
    expect(b!.survival.cause).toBe(cause);
  });

  it('habitable-zone status matches the fact-checked values', () => {
    expect(by.get('earth')!.hz.status).toBe('inside');
    expect(by.get('venus')!.hz.status).toBe('tooHot');
    expect(by.get('mars')!.hz.status).toBe('inside');
    expect(by.get('corot-7-b')!.hz.status).toBe('tooHot');
    expect(by.get('proxima-cen-b')!.hz.status).toBe('inside');
    expect(by.get('trappist-1-e')!.hz.status).toBe('inside');
    expect(by.get('teegardens-star-b')!.hz.status).toBe('optimistic');
  });

  it('keeps fact-checked archive values', () => {
    expect(by.get('trappist-1-e')!.gravityG.v).toBeCloseTo(0.818, 2);
    expect(by.get('proxima-cen-b')!.radiusE.c).toBe('calculated');
    expect(by.get('kepler-22-b')!.massE.lim).toBe('upper');
    expect(by.get('saturn')!.moonCount!.v).toBe(293);
    expect(by.get('jupiter')!.moonCount!.v).toBe(115);
  });
});
