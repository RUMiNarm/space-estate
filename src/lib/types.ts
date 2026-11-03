/** How a value was obtained. */
export type Confidence =
  | 'measured' // reported by a primary source as a measurement / fit
  | 'calculated' // computed by the primary source itself (e.g. Exoplanet Archive "Calculated Value")
  | 'derived' // computed by this site from primary-source values (formula documented on /method/)
  | 'unknown';

export type Limit = 'upper' | 'lower';

export interface Val {
  v: number | null;
  c: Confidence;
  /** id into sources.json */
  src?: string;
  /** short note such as "1 bar level" or "minimum mass (M sin i)" */
  note?: string;
  lim?: Limit;
}

export type Category = 'star' | 'planet' | 'dwarf' | 'moon' | 'small' | 'comet' | 'exoplanet';
export type Tri = 'yes' | 'no' | 'unknown';
export type Rocky = 'yes' | 'likely' | 'unlikely' | 'no' | 'unknown';
export type AtmosphereStatus = 'thick' | 'thin' | 'trace' | 'none' | 'unknown';

export interface Gas {
  gas: string;
  pct?: number;
}

export interface Host {
  name: string;
  spectralType?: string;
  teffK: Val;
  radiusSun: Val;
  massSun: Val;
  lumLogSun: Val;
  ageGyr?: Val;
}

export interface SourceRef {
  id: string;
  label: string;
  url: string;
  kind: 'database' | 'factsheet' | 'paper' | 'page';
}

/** inside = conservative HZ; optimistic = only inside the optimistic HZ */
export type HzStatus = 'inside' | 'optimistic' | 'tooHot' | 'tooCold' | 'unknown';

export interface HabitableZone {
  innerAU: number | null;
  outerAU: number | null;
  optInnerAU: number | null;
  optOuterAU: number | null;
  status: HzStatus;
  /** star's Teff is slightly outside the model's fitted range */
  extrapolated?: boolean;
}

export type SurvivalCause =
  | 'earth' // breathable
  | 'stellar' // stellar surface: vaporized
  | 'heat' // lethal temperature
  | 'noSurface' // no surface: sinks into a hydrogen envelope
  | 'vacuum' // pressure below ebullism threshold
  | 'anoxia' // pressure OK but no oxygen
  | 'unknownAtmosphere'; // rocky & temperate but atmosphere unknown

export interface Survival {
  cause: SurvivalCause;
  /** seconds to loss of consciousness [min, max]; null when not applicable (Earth) */
  consciousSec: [number, number] | null;
  /** human readable summary in Japanese */
  summary: string;
  sourceIds: string[];
}

export type EquipmentLevel = 0 | 1 | 2 | 3 | 4;

export interface Equipment {
  level: EquipmentLevel | null; // null = undetermined
  minLevel: EquipmentLevel; // lower bound when undetermined
  reason: string;
}

export interface Body {
  slug: string;
  name: string;
  nameJa?: string;
  category: Category;
  subclass?: string;
  parent?: string; // slug of the body it orbits (moons)
  parentName?: string;
  system: string; // system slug
  systemName: string;
  discoveryYear?: number;
  discoveredBy?: string;
  designation?: string;

  radiusE: Val; // Earth radii (volumetric mean)
  dimensionsKm?: string; // triaxial extent text, e.g. "2322 x 1704 x 1026"
  massE: Val; // Earth masses
  densityGcc: Val;
  gravityG: Val; // Earth = 1
  escapeKmS: Val;
  rotationH: Val;
  orbitalPeriodD: Val;
  aAU: Val; // semi-major axis around the star (for moons: the parent's)
  moonAKm?: Val; // semi-major axis around the parent (moons)
  ecc: Val;
  inclDeg: Val;
  obliquityDeg: Val;
  albedo: Val;

  tempMeanK: Val;
  tempMinK: Val;
  tempMaxK: Val;
  tempEqK: Val; // equilibrium temperature (zero albedo, full redistribution)
  insolE: Val; // Earth = 1

  hasSurface: Tri;
  rocky: Rocky;
  pressureBar: Val;
  atmosphere: AtmosphereStatus;
  gases: Gas[];
  gasesSrc?: string;
  oxygenBreathable: boolean;
  tidalLock: 'yes' | 'likely' | 'no' | 'unknown';
  magneticField: Tri;
  moonCount?: Val;
  rings?: boolean;

  distanceLy: Val; // from Earth; null for solar-system bodies
  host?: Host;

  /** curated flags such as intense radiation */
  hazards: string[];
  hazardsSrc?: string;
  /** values that look physically implausible in the source catalog */
  dataWarnings?: string[];
  /** curated note on tidal locking with source */
  tidalLockSrc?: string;

  // derived
  hz: HabitableZone;
  esi: number | null;
  survival: Survival;
  equipment: Equipment;

  curated: boolean;
  jwstObservations?: number;
  controversial?: boolean;
}

/** compact record used by the client-side search */
export interface IndexRow {
  s: string; // slug
  n: string; // display name
  j?: string; // japanese name
  c: Category;
  sc?: string;
  sy: string; // system slug
  p?: string; // parent slug (moons)
  r: Rocky;
  hz: HzStatus;
  at: AtmosphereStatus;
  t: number | null; // representative temperature K
  g: number | null; // gravity (Earth=1)
  rad: number | null;
  rc?: 1; // radius is a catalog-calculated value, not measured
  d: number | null; // distance ly
  e: number | null; // ESI
  y: number | null; // discovery year
  eq: EquipmentLevel | null;
  eqMin: EquipmentLevel;
  sv: SurvivalCause;
  tl: Body['tidalLock'];
  cu: boolean;
}
