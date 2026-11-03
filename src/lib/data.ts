/** Build-time access to the normalized dataset (never shipped to the client). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { u } from './base.ts';
import type { Body, SourceRef } from './types.ts';

export interface System {
  slug: string;
  name: string;
  distanceLy: number | null;
  host?: Body['host'];
  hzInnerAU: number | null;
  hzOuterAU: number | null;
  members: string[];
  overviewUrl?: string;
}

export interface Report {
  fetchedAt: string;
  normalizedAt: string;
  total: number;
  byCategory: Record<string, number>;
  systems: number;
  moonCountsJpl: Record<string, number>;
  equipmentUndetermined: number;
  hzInside: number;
  hzUnknown: number;
  esiAvailable: number;
  curated: number;
  sources: number;
}

const dir = join(process.cwd(), 'data', 'normalized');
const read = <T>(f: string): T => JSON.parse(readFileSync(join(dir, f), 'utf8')) as T;

let cache: { bodies: Body[]; bySlug: Map<string, Body>; systems: System[]; sysBySlug: Map<string, System>; sources: Record<string, SourceRef>; report: Report } | null = null;

export function data() {
  if (!cache) {
    const bodies = read<Body[]>('bodies.json');
    const systems = read<System[]>('systems.json');
    cache = {
      bodies,
      bySlug: new Map(bodies.map((b) => [b.slug, b])),
      systems,
      sysBySlug: new Map(systems.map((s) => [s.slug, s])),
      sources: read<Record<string, SourceRef>>('sources.json'),
      report: read<Report>('report.json'),
    };
  }
  return cache;
}

export const url = {
  body: (slug: string) => u(`/bodies/${slug}/`),
  system: (slug: string) => u(`/systems/${slug}/`),
};
