/**
 * Extra snapshots for the 3D explorer: orbit orientation for small bodies, sky positions of
 * exoplanet host stars, and JPL Horizons vectors used to validate the orbit propagation in tests.
 */
import { get, save, sleep } from './http.ts';

const RAW = 'data/raw';
const files: { path: string; url: string }[] = [];
async function grab(path: string, url: string) {
  const body = await get(url);
  await save(`${RAW}/${path}`, body);
  files.push({ path, url });
  console.log(`saved ${path} (${body.length} bytes)`);
  await sleep(500);
}

const q = (fields: string, cdata: object) =>
  `https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=${fields}&sb-cdata=${encodeURIComponent(JSON.stringify(cdata))}`;

async function main() {
  const F = 'pdes,a,e,i,om,w,ma,epoch';
  await grab('sbdb/orbits-diameter-ge-100.json', q(F, { AND: ['diameter|GE|100'] }));
  await grab('sbdb/orbits-tno-bright.json', q(F, { AND: ['class|EQ|TNO', 'H|LE|4.5'] }));

  const adql = 'select hostname,ra,dec,sy_dist from pscomppars';
  await grab('exoplanet-archive/hosts.csv', `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(adql)}&format=csv`);

  // Heliocentric ecliptic J2000 state vectors for the planets (test fixture for src/explorer/orbits.ts).
  const date = '2026-11-03';
  for (const [name, id] of [['mercury', 199], ['venus', 299], ['earth', 399], ['mars', 499], ['jupiter', 599], ['saturn', 699], ['uranus', 799], ['neptune', 899], ['pluto', 999]] as const) {
    const p = new URLSearchParams({
      format: 'json', COMMAND: `'${id}'`, OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'VECTORS', CENTER: "'500@10'",
      START_TIME: `'${date}'`, STOP_TIME: `'${date} 00:01'`, STEP_SIZE: "'1m'", REF_PLANE: 'ECLIPTIC', REF_SYSTEM: 'J2000',
      OUT_UNITS: 'AU-D', VEC_TABLE: '1', CSV_FORMAT: 'YES',
    });
    await grab(`horizons/${name}-${date}.json`, `https://ssd.jpl.nasa.gov/api/horizons.api?${p}`);
  }

  await save(`${RAW}/manifest-orbits.json`, JSON.stringify({ fetchedAt: new Date().toISOString(), files }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
