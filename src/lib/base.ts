/** Site base path (e.g. '/space-estate' on GitHub Pages project sites, '' at a domain root). */
export const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

/** Prefix a root-relative path with the base path; leaves absolute URLs and anchors alone. */
export const u = (p: string): string => (p.startsWith('/') && !p.startsWith('//') ? `${BASE}${p}` : p);
