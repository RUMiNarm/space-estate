/**
 * Fetch raw snapshots from primary sources into data/raw/.
 * Nothing here interprets the data; see scripts/normalize for that.
 */
import { get, save, sleep } from './http.ts';

const RAW = 'data/raw';
const today = new Date().toISOString().slice(0, 10);
const manifest: { fetchedAt: string; files: { path: string; url: string }[] } = {
  fetchedAt: new Date().toISOString(),
  files: [],
};

async function grab(path: string, url: string) {
  const body = await get(url);
  await save(`${RAW}/${path}`, body);
  manifest.files.push({ path, url });
  console.log(`saved ${path} (${body.length} bytes)`);
  await sleep(500);
}

const NSSDC = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet';
const FACTSHEETS = [
  'index', // planetary comparison table
  'sunfact',
  'mercuryfact', 'venusfact', 'earthfact', 'moonfact', 'marsfact',
  'jupiterfact', 'saturnfact', 'uranusfact', 'neptunefact', 'plutofact',
  'joviansatfact', 'saturniansatfact', 'uraniansatfact', 'neptuniansatfact',
];

// Exoplanet columns: values plus the reference link for the values we display.
const EXO_COLS = [
  'pl_name', 'hostname', 'pl_letter', 'sy_snum', 'sy_pnum', 'sy_mnum', 'sy_dist', 'sy_dist_reflink',
  'disc_year', 'discoverymethod', 'disc_facility', 'disc_refname', 'pl_controv_flag', 'tran_flag', 'rv_flag',
  'pl_orbper', 'pl_orbperlim', 'pl_orbper_reflink',
  'pl_orbsmax', 'pl_orbsmaxlim', 'pl_orbsmax_reflink',
  'pl_rade', 'pl_radelim', 'pl_radeerr1', 'pl_radeerr2', 'pl_rade_reflink',
  'pl_bmasse', 'pl_bmasselim', 'pl_bmassprov', 'pl_bmasse_reflink',
  'pl_dens', 'pl_dens_reflink',
  'pl_orbeccen', 'pl_orbeccenlim', 'pl_orbeccen_reflink',
  'pl_insol', 'pl_insollim', 'pl_insol_reflink',
  'pl_eqt', 'pl_eqtlim', 'pl_eqt_reflink',
  'pl_orbincl', 'pl_trueobliq',
  'st_spectype', 'st_teff', 'st_teff_reflink', 'st_rad', 'st_mass', 'st_lum', 'st_lum_reflink', 'st_age', 'st_met',
  'pl_nobs_jwst_tran', 'pl_nobs_jwst_e', 'pl_nobs_jwst_pc', 'pl_ntranspec',
];

const SBDB_FIELDS =
  'full_name,pdes,name,prefix,kind,class,diameter,extent,albedo,rot_per,GM,density,a,e,i,q,ad,per_y,H,first_obs';

// Bodies looked up individually for full physical parameters and discovery data.
export const SBDB_SINGLE = [
  '1', '134340', '136199', '136472', '136108', // IAU dwarf planets
  '90377', '50000', '225088', '90482', '120347', '28978', '20000', // large TNO candidates (Sedna, Quaoar, Gonggong, Orcus, Salacia, Ixion, Varuna)
  '1P', '2P', '9P', '19P', '67P', '81P', '103P', '109P', 'C/1995 O1', 'C/2020 F3', '1I', '2I', '3I', // comets & interstellar objects
  '4', '2', '10', '433', '101955', '162173', '99942', '16', // notable asteroids
];

async function main() {
  for (const f of FACTSHEETS) {
    await grab(`nssdc/${f}.html`, f === 'index' ? `${NSSDC}/` : `${NSSDC}/${f}.html`);
  }

  await grab('jpl-sats/discovery.html', 'https://ssd.jpl.nasa.gov/sats/discovery.html');
  await grab('jpl-sats/phys_par.html', 'https://ssd.jpl.nasa.gov/sats/phys_par/');
  await grab('jpl-sats/elem.html', 'https://ssd.jpl.nasa.gov/sats/elem/');

  const q = (cdata: object) =>
    `https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=${SBDB_FIELDS}&sb-cdata=${encodeURIComponent(JSON.stringify(cdata))}`;
  await grab('sbdb/query-diameter-ge-100.json', q({ AND: ['diameter|GE|100'] }));
  await grab('sbdb/query-tno-bright.json', q({ AND: ['class|EQ|TNO', 'H|LE|4.5'] }));

  for (const s of SBDB_SINGLE) {
    const url = `https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=${encodeURIComponent(s)}&phys-par=1&discovery=1`;
    await grab(`sbdb/objects/${s.replace(/[^A-Za-z0-9]+/g, '_')}.json`, url);
  }

  const adql = `select ${EXO_COLS.join(',')} from pscomppars`;
  await grab(
    'exoplanet-archive/pscomppars.csv',
    `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(adql)}&format=csv`,
  );

  await save(`${RAW}/manifest.json`, JSON.stringify({ ...manifest, date: today }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
