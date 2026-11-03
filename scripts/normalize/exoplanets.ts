/** Confirmed exoplanets from the NASA Exoplanet Archive Planetary Systems Composite Parameters table. */
import { readFileSync } from 'node:fs';
import { PC_TO_LY } from '../../src/lib/constants.ts';
import { classifyRocky, densityGcc, equilibriumTempK, escapeKmS, gravityG, insolation } from '../../src/lib/physics.ts';
import type { Host, Val } from '../../src/lib/types.ts';
import { blank, type RawBody, Sources, U, val } from './body.ts';
import { decode, num, parseCsv, slugify } from './parse.ts';

export const NEA_OVERVIEW = (host: string) => `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(host)}`;

/** Turn an archive reflink (<a refstr=X href=URL ...>Label</a>) into a source id. */
function refSource(sources: Sources, reflink: string | undefined): { id?: string; calculated: boolean } {
  if (!reflink) return { calculated: false };
  const refstr = reflink.match(/refstr=([^\s>]+)/)?.[1];
  const href = reflink.match(/href=([^\s>]+)/)?.[1];
  const label = decode(reflink.replace(/<[^>]+>/g, '').trim());
  if (!refstr) return { calculated: false };
  const calculated = refstr === 'CALCULATED_VALUE';
  const url = href ? (href.startsWith('/') ? `https://exoplanetarchive.ipac.caltech.edu${href}` : href) : 'https://exoplanetarchive.ipac.caltech.edu/';
  const id = sources.add({ id: `ref:${refstr}`, label: calculated ? 'NASA Exoplanet Archive による計算値' : label, url, kind: calculated ? 'page' : 'paper' });
  return { id, calculated };
}

export function buildExoplanets(sources: Sources): RawBody[] {
  sources.add({ id: 'nea', label: 'NASA Exoplanet Archive: Planetary Systems Composite Parameters', url: 'https://exoplanetarchive.ipac.caltech.edu/cgi-bin/TblView/nph-tblView?app=ExoTbls&config=PSCompPars', kind: 'database' });
  const rows = parseCsv(readFileSync('data/raw/exoplanet-archive/pscomppars.csv', 'utf8'));
  const out: RawBody[] = [];

  for (const r of rows) {
    const v = (k: string) => num(r[k]);
    const lim = (k: string): Val['lim'] | undefined => (r[k] === '1' ? 'upper' : r[k] === '-1' ? 'lower' : undefined);
    const field = (k: string, extra: Partial<Val> = {}): Val => {
      const x = v(k);
      if (x == null) return { ...U };
      const ref = refSource(sources, r[`${k}_reflink`]);
      const l = lim(`${k}lim`);
      return val(x, ref.id ?? 'nea', ref.calculated ? 'calculated' : 'measured', { ...extra, ...(l ? { lim: l } : {}) });
    };

    const radius = field('pl_rade');
    const msini = r.pl_bmassprov === 'Msini';
    const mass = field('pl_bmasse', msini ? { note: '最小質量（M sin i）' } : {});
    const teff = field('st_teff');
    const lumLog = field('st_lum');
    const starR = val(v('st_rad'), 'nea');
    let a = field('pl_orbsmax');
    // Kepler's third law (a³ = M P², au / M☉ / yr) when the archive has period and stellar mass but no semi-major axis.
    const per = v('pl_orbper');
    const mstar = v('st_mass');
    if (a.v == null && per != null && per > 0 && mstar != null && mstar > 0) a = val(Math.cbrt(mstar * (per / 365.25) ** 2), undefined, 'derived', { note: '公転周期と主星の質量から計算' });

    let teq = field('pl_eqt');
    if (teq.v == null && teff.v != null && starR.v != null && a.v != null) teq = val(equilibriumTempK(teff.v, starR.v, a.v), undefined, 'derived');
    let insol = field('pl_insol');
    if (insol.v == null && lumLog.v != null && a.v != null) insol = val(insolation(10 ** lumLog.v, a.v), undefined, 'derived');

    const radiusMeasured = radius.c === 'measured' && radius.lim == null;
    const massUsable = mass.v != null && mass.lim == null && mass.c === 'measured';
    const rocky = classifyRocky({ radiusE: radius.v, radiusIsMeasured: radiusMeasured, massE: mass.v, massIsUpperLimit: mass.lim === 'upper' || mass.c !== 'measured' });
    const bothMeasured = radiusMeasured && massUsable && !msini;
    const big = (radiusMeasured && radius.v! > 4) || (massUsable && mass.v! > 20);

    // Plausibility (site rule): bulk density outside 0.05–30 g/cm³ means the archive's mass or radius is suspect.
    const dataWarnings: string[] = [];
    const dens = v('pl_dens') ?? (radius.v != null && mass.v != null && radiusMeasured && massUsable && !msini ? densityGcc(mass.v, radius.v) : null);
    const implausible = dens != null && (dens > 30 || dens < 0.05);
    if (implausible)
      dataWarnings.push(`質量と半径から求めた平均密度が ${dens! > 30 ? '30 g/cm³ を超えて' : '0.05 g/cm³ を下回って'}おり、アーカイブの質量または半径の値に問題がある可能性があります。数値はアーカイブの値をそのまま表示しています。`);

    const host: Host = {
      name: r.hostname!,
      spectralType: r.st_spectype || undefined,
      teffK: teff,
      radiusSun: starR,
      massSun: val(v('st_mass'), 'nea'),
      lumLogSun: lumLog,
      ageGyr: val(v('st_age'), 'nea'),
    };
    const jwst = ['pl_nobs_jwst_tran', 'pl_nobs_jwst_e', 'pl_nobs_jwst_pc'].reduce((s, k) => s + (v(k) ?? 0), 0);

    out.push(
      blank({
        slug: slugify(r.pl_name!),
        name: r.pl_name!,
        category: 'exoplanet',
        subclass: r.discoverymethod || undefined,
        system: `sys-${slugify(r.hostname!)}`,
        systemName: r.hostname!,
        discoveryYear: v('disc_year') ?? undefined,
        discoveredBy: r.disc_facility || undefined,
        radiusE: radius,
        massE: mass,
        densityGcc: bothMeasured ? (field('pl_dens').v != null ? field('pl_dens') : val(densityGcc(mass.v!, radius.v!), undefined, 'derived')) : U,
        gravityG: bothMeasured ? val(gravityG(mass.v!, radius.v!), undefined, 'derived') : U,
        escapeKmS: bothMeasured ? val(escapeKmS(mass.v!, radius.v!), undefined, 'derived') : U,
        orbitalPeriodD: field('pl_orbper'),
        aAU: a,
        ecc: field('pl_orbeccen'),
        inclDeg: field('pl_orbincl'),
        tempEqK: { ...teq, note: '放射平衡温度（アルベド0・熱が全体に行き渡ると仮定）' },
        insolE: insol,
        hasSurface: implausible ? 'unknown' : rocky === 'likely' ? 'yes' : big ? 'no' : 'unknown',
        rocky: implausible ? 'unknown' : rocky,
        ...(dataWarnings.length ? { dataWarnings } : {}),
        atmosphere: 'unknown',
        distanceLy: v('sy_dist') != null ? val(v('sy_dist')! * PC_TO_LY, refSource(sources, r.sy_dist_reflink).id ?? 'nea', 'measured', { note: `${v('sy_dist')!.toFixed(2)} pc` }) : U,
        host,
        jwstObservations: jwst || undefined,
        controversial: r.pl_controv_flag === '1' || undefined,
        moonCount: undefined,
      }),
    );
  }
  return out;
}
