/**
 * Physical constants and thresholds. Each one cites where it comes from;
 * the same ids appear in METHOD_SOURCES so /method/ can list them.
 */

/** IAU 2012 Resolution B2: astronomical unit in km. */
export const AU_KM = 149_597_870.7;
/** IAU 2015 Resolution B3 nominal solar radius (km). Also NASA Sun Fact Sheet volumetric mean radius 695,700 km. */
export const SUN_RADIUS_KM = 695_700;
/** NASA Earth Fact Sheet: volumetric mean radius (km). */
export const EARTH_RADIUS_KM = 6371.0;
/** NASA Earth Fact Sheet: mass (kg). */
export const EARTH_MASS_KG = 5.9722e24;
/** NASA Earth Fact Sheet: mean density (g/cm^3). */
export const EARTH_DENSITY = 5.514;
/** NASA Earth Fact Sheet: escape velocity (km/s). */
export const EARTH_ESCAPE = 11.186;
/** NASA Sun Fact Sheet: effective temperature (K). */
export const SUN_TEFF = 5772;
/** 1 parsec in light years (IAU definitions of pc and ly). */
export const PC_TO_LY = 3.261_563_777;
/** Earth's standard gravity (m/s^2). */
export const G0 = 9.80665;
/** Newtonian constant of gravitation (CODATA 2018) m^3 kg^-1 s^-2 */
export const G_NEWTON = 6.6743e-11;

/**
 * NASA SP-3006 Bioastronautics Data Book (1973), ch.1 "Barometric Pressure":
 * "The vapor pressure of water at a body temperature of 37°C is 47 mm Hg … exposure to
 * barometric pressures much below 47 mm Hg absolute leads rapidly to vaporization of body
 * fluids, a process known as ebullism."  47 mmHg = 0.0627 bar.
 */
export const EBULLISM_BAR = 47 * 0.001_333_22;

/**
 * NASA NTRS 19660005052 (1965) "Experimental Animal Decompressions to a Near-Vacuum Environment":
 * dogs collapsed within 9–10 s after decompression to < 2 mmHg; all exposures shorter than 120 s
 * survived, 120–180 s exposures carried substantial mortality.
 */
export const VACUUM_COLLAPSE_SEC: [number, number] = [9, 10];
export const VACUUM_SURVIVABLE_SEC = 120;

/** Rogers (2015, ApJ 801, 41): "the majority of 1.6 Earth-radius planets are too low density to be comprised of Fe and silicates alone". */
export const ROCKY_RADIUS_MAX = 1.6;
/** Chen & Kipping (2017, ApJ 834, 17): Terran/Neptunian transition at 2.0 (+0.7/−0.6) Earth masses. */
export const ROCKY_MASS_MAX = 2.0;

export const METHOD_SOURCES = {
  'iau-2012-b2': { label: 'IAU 2012 Resolution B2（天文単位の定義）— IAU 決議一覧', url: 'https://www.iau.org/IAU/Iau/Publications/List-of-Resolutions.aspx', kind: 'page' },
  'nssdc-earth': { label: 'NASA Earth Fact Sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html', kind: 'factsheet' },
  'nssdc-sun': { label: 'NASA Sun Fact Sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html', kind: 'factsheet' },
  'kopparapu2014': { label: 'Kopparapu et al. 2014, ApJL 787, L29（惑星質量とハビタブルゾーン）', url: 'https://arxiv.org/abs/1404.5292', kind: 'paper' },
  'kopparapu2013': { label: 'Kopparapu et al. 2013, ApJ 765, 131（ハビタブルゾーンの新しい推定）', url: 'https://arxiv.org/abs/1301.6674', kind: 'paper' },
  'phl-esi': { label: 'PHL @ UPR Arecibo: Earth Similarity Index (ESI)', url: 'https://phl.upr.edu/projects/earth-similarity-index-esi', kind: 'page' },
  'schulze-makuch2011': { label: 'Schulze-Makuch et al. 2011, Astrobiology 11, 1041', url: 'https://doi.org/10.1089/ast.2010.0592', kind: 'paper' },
  'rogers2015': { label: 'Rogers 2015, ApJ 801, 41 “Most 1.6 Earth-Radius Planets are not Rocky”', url: 'https://arxiv.org/abs/1407.4457', kind: 'paper' },
  'chen-kipping2017': { label: 'Chen & Kipping 2017, ApJ 834, 17（質量と半径の関係）', url: 'https://arxiv.org/abs/1603.08614', kind: 'paper' },
  'nasa-sp3006': { label: 'NASA SP-3006 Bioastronautics Data Book, 2nd ed. (1973)', url: 'https://ntrs.nasa.gov/citations/19730006364', kind: 'paper' },
  'ntrs-19660005052': { label: 'NASA NTRS 19660005052 “Experimental Animal Decompressions to a Near-Vacuum Environment” (1965)', url: 'https://ntrs.nasa.gov/citations/19660005052', kind: 'paper' },
  'ntrs-19650027167': { label: 'NASA NTRS 19650027167 “The Effect on the Chimpanzee of Rapid Decompression to a near Vacuum” (1965)', url: 'https://ntrs.nasa.gov/citations/19650027167', kind: 'paper' },
  'exo-calc': { label: 'NASA Exoplanet Archive: Calculated values in the PSCompPars table', url: 'https://exoplanetarchive.ipac.caltech.edu/docs/pscp_calc.html', kind: 'page' },
} as const satisfies Record<string, { label: string; url: string; kind: 'paper' | 'page' | 'factsheet' | 'database' }>;
