/**
 * 3D explorer: solar system (real positions from mean elements), planet close-ups with moons,
 * the solar neighbourhood of known exoplanet hosts (real directions, log-compressed distances),
 * exoplanet systems, and a schematic Milky Way with the hosts at true scale.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { u } from '../lib/base.ts';
import { dotTexture, glowTexture, planetTexture, starColor, styleFor } from './look.ts';
import { compress, jdFromDate, orbitPath, positionAt, toWorld, type Elements } from './orbits.ts';

// ---------------------------------------------------------------- data types
interface Card { s: string; n: string; c: string; eq: number | null; sv: string }
interface PlanetD extends Card { el: Elements; rKm: number; pole: [number, number, number] | null; rings: boolean; moons: number }
interface SmallD extends Card { el: Elements; rKm: number; cu: boolean }
interface MoonD extends Card { el: Elements; frame: 'laplace' | 'ecliptic'; rKm: number; cu: boolean }
interface SolarData { sun: Card & { rKm: number }; planets: PlanetD[]; small: SmallD[]; moons: Record<string, MoonD[]> }
interface SysPlanet { s: string; n: string; a: number | null; e: number | null; P: number | null; r: number | null; hz: string; eq: number | null; cu: boolean }
interface StarD { s: string; n: string; d: number; g: [number, number, number]; t: number | null; hz: [number, number] | null; p: SysPlanet[] }

export type Level = 'solar' | 'planet' | 'stars' | 'system' | 'galaxy';

interface Pick {
  key: string;
  pos: THREE.Vector3;
  r: number; // world radius used for screen-size estimate
  minPx: number;
  kind: 'open' | 'zoom';
  label: string;
  sub?: string;
  eq?: number | null;
  priority: number;
  act: () => void;
}

export interface Hud {
  setLevel(level: Level, focusName?: string): void;
  setDate(jd: number | null): void;
  hover(p: { label: string; sub?: string; eq?: number | null; kind: 'open' | 'zoom' } | null, x: number, y: number): void;
  warp(): void;
  setPaused(p: boolean): void;
}

// ---------------------------------------------------------------- scales
const AU_K = 10; // solar view: |r| → 10·sqrt(r[au])
const AU_P = 0.5;
const bodyR = (rKm: number) => 0.22 + 0.42 * Math.log10(1 + rKm / 1000);
const SUN_R = 1.7;
const starDist = (ly: number) => 14 * Math.log10(1 + ly / 2);
const GAL_SCALE = 1 / 1000; // galaxy view: 1 unit = 1000 ly
const SUN_GC_LY = 25_000; // NASA: the solar system is about halfway out in a disk spanning >100,000 ly
const v3 = (a: [number, number, number]) => new THREE.Vector3(a[0], a[1], a[2]);

export async function startExplorer(canvasHost: HTMLElement, labelHost: HTMLElement, hud: Hud) {
  const solar = (await (await fetch(u('/data/universe-solar.json'))).json()) as SolarData;
  let stars: StarD[] | null = null;
  const loadStars = async () => (stars ??= ((await (await fetch(u('/data/universe-stars.json'))).json()) as { stars: StarD[] }).stars);

  // ---------------------------------------------------------- renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  canvasHost.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '3D の宇宙。ドラッグで回転、スクロールで拡大');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#03040a');
  const camera = new THREE.PerspectiveCamera(50, canvasHost.clientWidth / canvasHost.clientHeight, 0.01, 5000);
  /** Portrait screens get a wider vertical FOV so the horizontal view stays ≥ 40°. */
  const fitFov = () => {
    camera.fov = camera.aspect < 1 ? Math.min(80, (2 * Math.atan(Math.tan((20 * Math.PI) / 180) / camera.aspect) * 180) / Math.PI) : 50;
    camera.updateProjectionMatrix();
  };
  fitFov();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.9;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(canvasHost.clientWidth, canvasHost.clientHeight), 0.75, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // decorative background stars (not data)
  {
    const n = 2500;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let k = 0; k < n; k++) {
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(2 * rnd() - 1);
      pos.set([Math.sin(ph) * Math.cos(th) * 2000, Math.cos(ph) * 2000, Math.sin(ph) * Math.sin(th) * 2000], k * 3);
      const c = starColor(3000 + rnd() * 7000).multiplyScalar(0.35 + rnd() * 0.5);
      col.set([c.r, c.g, c.b], k * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const bg = new THREE.Points(g, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, map: dotTexture(), transparent: true, depthWrite: false }));
    bg.renderOrder = -1;
    scene.add(bg);
    bg.onBeforeRender = () => bg.position.copy(camera.position);
  }

  // ---------------------------------------------------------- time
  let jd = jdFromDate(new Date());
  let paused = false;
  const SPEED: Record<Level, number> = { solar: 6, planet: 0.04, system: 0.5, stars: 0, galaxy: 0 }; // days per second

  // ---------------------------------------------------------- labels
  interface Label { el: HTMLElement; pos: () => THREE.Vector3; show: () => boolean; w?: number }
  const labels: Label[] = [];
  const addLabel = (text: string, pos: () => THREE.Vector3, show: () => boolean, cls = '') => {
    const el = document.createElement('div');
    el.className = `lbl ${cls}`;
    el.textContent = text;
    labelHost.appendChild(el);
    const l = { el, pos, show };
    labels.push(l);
    return l;
  };
  const removeLabels = (ls: Label[]) => {
    for (const l of ls) {
      l.el.remove();
      labels.splice(labels.indexOf(l), 1);
    }
  };

  // ================================================================ SOLAR WORLD
  const solarWorld = new THREE.Group();
  scene.add(solarWorld);
  solarWorld.add(new THREE.AmbientLight(0xffffff, 0.08));
  const sunLight = new THREE.PointLight(0xfff2dd, 2.2, 0, 0);
  solarWorld.add(sunLight);

  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 48, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.7) }));
  solarWorld.add(sunMesh);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffc46b, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
  sunGlow.scale.setScalar(SUN_R * 7);
  solarWorld.add(sunGlow);
  addLabel(solar.sun.n, () => sunMesh.position.clone().add(new THREE.Vector3(0, SUN_R * 1.35, 0)), () => level === 'solar');

  interface PlanetObj { d: PlanetD; mesh: THREE.Mesh; vr: number; orbit: THREE.Line; pole: THREE.Vector3; ring?: THREE.Mesh }
  const planetObjs: PlanetObj[] = [];
  const worldPole = (p: [number, number, number] | null) => (p ? v3(toWorld(p)).normalize() : new THREE.Vector3(0, 1, 0));

  for (const d of solar.planets) {
    const vr = bodyR(d.rKm) * (d.c === 'dwarf' ? 0.9 : 1);
    const style = styleFor(d.s);
    const mat = new THREE.MeshStandardMaterial({ map: planetTexture(style, d.s), roughness: 0.92, metalness: 0 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(vr, 40, 24), mat);
    const pole = worldPole(d.pole);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pole);
    solarWorld.add(mesh);
    const pts = orbitPath(d.el, 360).map((p) => v3(toWorld(compress(p, AU_K, AU_P))));
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: d.c === 'dwarf' ? 0x7a8fb8 : 0x8fb4ff, transparent: true, opacity: d.c === 'dwarf' ? 0.18 : 0.3 }));
    solarWorld.add(orbit);
    const o: PlanetObj = { d, mesh, vr, orbit, pole };
    if (d.rings) {
      const inner = vr * (d.s === 'saturn' ? 1.25 : 1.6);
      const outer = vr * (d.s === 'saturn' ? 2.3 : 1.9);
      const rg = new THREE.RingGeometry(inner, outer, 96, 1);
      const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: d.s === 'saturn' ? 0xd9c69a : 0x9fb3c8, side: THREE.DoubleSide, transparent: true, opacity: d.s === 'saturn' ? 0.62 : 0.045, depthWrite: false }));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pole);
      solarWorld.add(ring);
      o.ring = ring;
    }
    planetObjs.push(o);
    addLabel(d.n, () => mesh.position.clone().add(new THREE.Vector3(0, vr * 1.6, 0)), () => level === 'solar' && (d.c === 'planet' || camDist() < 60), d.c === 'dwarf' ? 'dim' : '');
  }

  // small bodies & non-Pluto dwarf planets
  const smallSpheres: { d: SmallD; mesh: THREE.Mesh; vr: number }[] = [];
  const pointsD = solar.small.filter((s) => s.c !== 'dwarf');
  for (const d of solar.small.filter((s) => s.c === 'dwarf')) {
    const vr = bodyR(d.rKm) * 0.9;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(vr, 32, 20), new THREE.MeshStandardMaterial({ map: planetTexture(styleFor(d.s), d.s), roughness: 0.95 }));
    solarWorld.add(mesh);
    const pts = orbitPath(d.el, 360).map((p) => v3(toWorld(compress(p, AU_K, AU_P))));
    solarWorld.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7a8fb8, transparent: true, opacity: 0.16 })));
    smallSpheres.push({ d, mesh, vr });
    addLabel(d.n, () => mesh.position.clone().add(new THREE.Vector3(0, vr * 1.8, 0)), () => level === 'solar' && camDist() < 70, 'dim');
  }
  const smallGeo = new THREE.BufferGeometry();
  const smallPos = new Float32Array(pointsD.length * 3);
  const smallCol = new Float32Array(pointsD.length * 3);
  pointsD.forEach((d, k) => {
    const c = d.c === 'comet' ? new THREE.Color(0x9fe8ff) : d.el.a > 30 ? new THREE.Color(0x9fb0d0) : new THREE.Color(0xb7aa98);
    smallCol.set([c.r, c.g, c.b], k * 3);
  });
  smallGeo.setAttribute('position', new THREE.BufferAttribute(smallPos, 3));
  smallGeo.setAttribute('color', new THREE.BufferAttribute(smallCol, 3));
  const smallPts = new THREE.Points(smallGeo, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, map: dotTexture(), transparent: true, depthWrite: false }));
  solarWorld.add(smallPts);

  function updateSolar() {
    for (const o of planetObjs) {
      o.mesh.position.set(...toWorld(compress(positionAt(o.d.el, jd), AU_K, AU_P)));
      if (o.ring) o.ring.position.copy(o.mesh.position);
      o.mesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), 0.002);
    }
    for (const s of smallSpheres) s.mesh.position.set(...toWorld(compress(positionAt(s.d.el, jd), AU_K, AU_P)));
    pointsD.forEach((d, k) => smallPos.set(toWorld(compress(positionAt(d.el, jd), AU_K, AU_P)), k * 3));
    smallGeo.attributes.position!.needsUpdate = true;
  }

  // ---------------------------------------------------------- moons of the focused planet
  let moonSys: { planet: PlanetObj; group: THREE.Group; items: { d: MoonD; obj: THREE.Object3D; major: boolean }[]; labels: Label[]; pts?: THREE.Points; minor: MoonD[] } | null = null;
  const moonClickRange = (p: PlanetObj) => p.vr * 16;

  function moonLocal(d: MoonD, p: PlanetObj, t: number): THREE.Vector3 {
    const raw = positionAt(d.el, t); // km, in Laplace (≈ planet equator) or ecliptic frame
    const r = Math.hypot(...raw);
    const Rp = Math.max(p.d.rKm, 1);
    const vis = p.vr * (1.55 + 2.0 * Math.log10(Math.max(r / Rp, 1.05)));
    const dir = new THREE.Vector3(raw[0], raw[2], -raw[1]).normalize(); // ecliptic-like → world
    if (d.frame === 'laplace') dir.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.pole));
    return dir.multiplyScalar(vis);
  }

  function buildMoons(p: PlanetObj) {
    disposeMoons();
    const list = solar.moons[p.d.s] ?? [];
    const group = new THREE.Group();
    solarWorld.add(group);
    const items: { d: MoonD; obj: THREE.Object3D; major: boolean }[] = [];
    const ls: Label[] = [];
    const major = list.filter((m) => m.rKm >= 150 || m.cu || (list.length <= 6 && m.rKm > 0)).sort((a, b) => b.rKm - a.rKm).slice(0, 24);
    const minor = list.filter((m) => !major.includes(m));
    for (const d of major) {
      const vr = Math.max(0.035, p.vr * 0.12 * Math.log10(1 + d.rKm / 50));
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(vr, 24, 16), new THREE.MeshStandardMaterial({ map: planetTexture(styleFor(d.s), d.s), roughness: 0.95 }));
      group.add(mesh);
      const path: THREE.Vector3[] = [];
      for (let k = 0; k <= 160; k++) path.push(moonLocal(d, p, d.el.epoch + (d.el.P * k) / 160));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(path), new THREE.LineBasicMaterial({ color: 0x9fc0ff, transparent: true, opacity: 0.22 })));
      items.push({ d, obj: mesh, major: true });
      ls.push(addLabel(d.n, () => mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, vr * 2.4, 0)), () => level === 'planet' && camDist() < moonClickRange(p), 'moon'));
    }
    let pts: THREE.Points | undefined;
    if (minor.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(minor.length * 3), 3));
      pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.5, sizeAttenuation: false, color: 0xb9c6d8, map: dotTexture(), transparent: true, depthWrite: false }));
      group.add(pts);
    }
    moonSys = { planet: p, group, items, labels: ls, pts, minor };
  }
  function disposeMoons() {
    if (!moonSys) return;
    solarWorld.remove(moonSys.group);
    moonSys.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
    });
    removeLabels(moonSys.labels);
    moonSys = null;
  }
  function updateMoons() {
    if (!moonSys) return;
    const p = moonSys.planet;
    moonSys.group.position.copy(p.mesh.position);
    const near = camDist() < moonClickRange(p) * 1.6;
    moonSys.group.visible = near;
    if (!near) return;
    for (const it of moonSys.items) it.obj.position.copy(moonLocal(it.d, p, jd));
    if (moonSys.pts) {
      const arr = moonSys.pts.geometry.attributes.position!.array as Float32Array;
      moonSys.minor.forEach((d, k) => arr.set(moonLocal(d, p, jd).toArray(), k * 3));
      moonSys.pts.geometry.attributes.position!.needsUpdate = true;
    }
  }

  // ================================================================ STARS WORLD (neighbourhood)
  const starsWorld = new THREE.Group();
  starsWorld.visible = false;
  scene.add(starsWorld);
  let starsBuilt = false;
  let starPts: THREE.Points | null = null;
  const starWorldPos = (s: StarD) => new THREE.Vector3(s.g[0], s.g[2], -s.g[1]).multiplyScalar(starDist(s.d));

  async function buildStars() {
    if (starsBuilt) return;
    const list = await loadStars();
    starsBuilt = true;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(list.length * 3);
    const col = new Float32Array(list.length * 3);
    list.forEach((s, k) => {
      pos.set(starWorldPos(s).toArray(), k * 3);
      const c = starColor(s.t).multiplyScalar(s.p.some((p) => p.cu) ? 1.5 : 0.62);
      col.set([c.r, c.g, c.b], k * 3);
    });
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    starPts = new THREE.Points(g, new THREE.PointsMaterial({ size: 4, sizeAttenuation: false, vertexColors: true, map: dotTexture(), transparent: true, depthWrite: false }));
    starsWorld.add(starPts);
    // the Sun
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd27a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sun.scale.setScalar(2.2);
    starsWorld.add(sun);
    addLabel('太陽系', () => new THREE.Vector3(0, 1.4, 0), () => level === 'stars', 'home');
    // distance shells in the galactic plane
    for (const ly of [10, 100, 1000, 10000]) {
      const r = starDist(ly);
      const circle = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, k) => new THREE.Vector3(Math.cos((k / 128) * Math.PI * 2) * r, 0, Math.sin((k / 128) * Math.PI * 2) * r))), new THREE.LineBasicMaterial({ color: 0x5b6b8c, transparent: true, opacity: 0.25 }));
      starsWorld.add(circle);
      addLabel(`${ly.toLocaleString('ja-JP')} 光年`, () => new THREE.Vector3(r * 0.71, 0, r * 0.71), () => level === 'stars', 'scale');
    }
    addLabel('→ 銀河中心', () => new THREE.Vector3(starDist(10000) + 3, 0, 0), () => level === 'stars', 'scale');
    // names: nearest systems and those with hand-written listings
    const named = [...list].sort((a, b) => a.d - b.d).slice(0, 10);
    for (const s of list) if (s.p.some((p) => p.cu) && !named.includes(s)) named.push(s);
    for (const s of named) addLabel(s.n, () => starWorldPos(s).add(new THREE.Vector3(0, 0.7, 0)), () => level === 'stars' && camDist() < 70, 'star');
  }

  // ================================================================ SYSTEM WORLD (one exoplanet host)
  const systemWorld = new THREE.Group();
  systemWorld.visible = false;
  scene.add(systemWorld);
  let sys: { star: StarD; planets: { d: SysPlanet; mesh: THREE.Mesh; vis: number; el: Elements }[]; labels: Label[]; starR: number } | null = null;

  function buildSystem(s: StarD) {
    disposeSystem();
    const starR = 1.4;
    const color = starColor(s.t);
    const star = new THREE.Mesh(new THREE.SphereGeometry(starR, 40, 24), new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(1.5) }));
    systemWorld.add(star);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(starR * 7);
    systemWorld.add(glow);
    systemWorld.add(new THREE.AmbientLight(0xffffff, 0.1));
    systemWorld.add(new THREE.PointLight(color, 2.4, 0, 0));
    const withA = s.p.filter((p) => p.a != null && p.a > 0);
    const aMax = Math.max(...withA.map((p) => p.a!), s.hz?.[1] ?? 0, 1e-3);
    const map = (a: number) => starR * 2.2 + 18 * Math.sqrt(a / aMax);
    if (s.hz) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(map(s.hz[0]), map(s.hz[1]), 128), new THREE.MeshBasicMaterial({ color: 0x1baf7a, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      systemWorld.add(ring);
    }
    let seed = [...s.n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 3);
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const planets: NonNullable<typeof sys>['planets'] = [];
    const ls: Label[] = [];
    for (const p of withA) {
      const vis = map(p.a!);
      const el: Elements = { a: 1, e: Math.min(p.e ?? 0, 0.9), i: 0, om: 0, w: rnd() * 360, ma: rnd() * 360, epoch: jd, P: p.P ?? 365.25 * Math.sqrt(p.a! ** 3) };
      const vr = Math.max(0.16, bodyR((p.r ?? 1) * 6371) * 0.75);
      const style = (p.r ?? 1) > 4 ? (p.hz === 'tooHot' ? 'jupiter' : 'neptune') : p.hz === 'tooHot' ? 'mars' : p.hz === 'tooCold' ? 'ice' : 'earth';
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(vr, 32, 20), new THREE.MeshStandardMaterial({ map: planetTexture(style, p.s), roughness: 0.9 }));
      systemWorld.add(mesh);
      const path = orbitPath(el, 200).map(([x, y]) => new THREE.Vector3(x * vis, 0, -y * vis));
      systemWorld.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(path), new THREE.LineBasicMaterial({ color: p.hz === 'inside' ? 0x5fe0a8 : 0x8fb4ff, transparent: true, opacity: 0.35 })));
      planets.push({ d: p, mesh, vis, el });
      ls.push(addLabel(p.n.replace(s.n, '').trim() || p.n, () => mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, vr * 2, 0)), () => level === 'system', 'moon'));
    }
    ls.push(addLabel(s.n, () => new THREE.Vector3(0, starR * 1.5, 0).applyMatrix4(systemWorld.matrixWorld), () => level === 'system'));
    systemWorld.rotation.x = 0.28;
    sys = { star: s, planets, labels: ls, starR };
  }
  function disposeSystem() {
    if (!sys) return;
    removeLabels(sys.labels);
    for (const c of [...systemWorld.children]) systemWorld.remove(c);
    sys = null;
  }
  function updateSystem() {
    if (!sys) return;
    for (const p of sys.planets) {
      const [x, y] = positionAt(p.el, jd);
      p.mesh.position.set(x * p.vis, 0, -y * p.vis);
    }
  }

  // ================================================================ GALAXY WORLD (schematic)
  const galaxyWorld = new THREE.Group();
  galaxyWorld.visible = false;
  scene.add(galaxyWorld);
  let galaxyBuilt = false;
  const sunGal = new THREE.Vector3(-SUN_GC_LY * GAL_SCALE, 0, 0);
  async function buildGalaxy() {
    if (galaxyBuilt) return;
    galaxyBuilt = true;
    const n = 60000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    let seed = 777;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    const R = 50; // 50,000 ly radius
    for (let k = 0; k < n; k++) {
      let x: number, y: number, z: number;
      let c: THREE.Color;
      if (k < n * 0.18) {
        // bulge + bar
        const r = Math.abs(gauss()) * 3.2;
        const th = rnd() * Math.PI * 2;
        x = Math.cos(th) * r * 1.8;
        z = Math.sin(th) * r * 0.8;
        y = gauss() * 1.1;
        c = new THREE.Color().setHSL(0.1, 0.6, 0.55 + rnd() * 0.25);
      } else {
        const arm = Math.floor(rnd() * 4);
        const r = 4 + Math.pow(rnd(), 0.8) * (R - 4);
        const pitch = 0.3;
        const inter = rnd() < 0.22; // sparse inter-arm disk
        const th = Math.log(r / 4) / Math.tan(pitch) + (arm * Math.PI) / 2 + (inter ? rnd() * Math.PI * 2 : gauss() * (arm % 2 ? 0.26 : 0.14));
        x = Math.cos(th) * r + gauss() * 0.8;
        z = Math.sin(th) * r + gauss() * 0.8;
        y = gauss() * 0.35;
        c = new THREE.Color().setHSL(0.58 + rnd() * 0.06, 0.55, 0.45 + rnd() * 0.3).lerp(new THREE.Color(0xffe6c7), r < 12 ? 0.5 : 0.1);
      }
      pos.set([x, y, z], k * 3);
      c.multiplyScalar(0.55);
      col.set([c.r, c.g, c.b], k * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    galaxyWorld.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.35, vertexColors: true, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd9a0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 }));
    core.scale.set(22, 12, 1);
    galaxyWorld.add(core);
    // known exoplanet hosts at true scale
    const list = await loadStars();
    const hp = new Float32Array(list.length * 3);
    list.forEach((s, k) => hp.set(new THREE.Vector3(s.g[0], s.g[2], -s.g[1]).multiplyScalar(s.d * GAL_SCALE).add(sunGal).toArray(), k * 3));
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
    galaxyWorld.add(new THREE.Points(hg, new THREE.PointsMaterial({ size: 2.5, sizeAttenuation: false, color: 0x7ff0ff, map: dotTexture(), transparent: true, depthWrite: false })));
    const sunMark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd27a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    sunMark.position.copy(sunGal);
    sunMark.scale.setScalar(0.9);
    sunMark.material.opacity = 0.85;
    galaxyWorld.add(sunMark);
    addLabel('太陽系', () => sunGal.clone().add(new THREE.Vector3(0, 1.5, 0)), () => level === 'galaxy', 'home');
    addLabel('天の川銀河（イメージ）', () => new THREE.Vector3(0, 0, 54), () => level === 'galaxy', 'scale');
  }

  // ================================================================ levels & camera
  let level: Level = 'solar';
  let focus: PlanetObj | null = null;
  let anim: { from: THREE.Vector3; offset: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; t0: number; dur: number; done?: () => void } | null = null;
  let switchedAt = 0;
  let lastWheel = 0;
  let lastWheelFrame = -1000;
  let frames = 0;
  let needIdle = false;
  const camDist = () => camera.position.distanceTo(controls.target);
  /** Distance that fits the planets' orbits on screen for the current aspect ratio. */
  const overview = () => (camera.aspect < 1 ? 92 : 66);

  function fly(toTarget: THREE.Vector3, distance: number, dur = 1100, dir?: THREE.Vector3, done?: () => void) {
    const d = (dir ?? camera.position.clone().sub(controls.target)).normalize().multiplyScalar(distance);
    anim = { from: camera.position.clone(), offset: d, tFrom: controls.target.clone(), tTo: toTarget.clone(), t0: performance.now(), dur, done };
  }

  function setWorld(w: 'solar' | 'stars' | 'system' | 'galaxy') {
    solarWorld.visible = w === 'solar';
    starsWorld.visible = w === 'stars';
    systemWorld.visible = w === 'system';
    galaxyWorld.visible = w === 'galaxy';
    bloom.strength = w === 'galaxy' ? 0.8 : w === 'stars' ? 0.45 : 0.75;
  }

  function limits() {
    if (level === 'solar') return [4, 150];
    if (level === 'planet' && focus) return [focus.vr * 2.2, 60];
    if (level === 'stars') return [3, 120];
    if (level === 'system') return [4, 70];
    return [22, 170];
  }

  async function go(next: Level, arg?: string, opts: { instant?: boolean } = {}) {
    const prev = level;
    switchedAt = performance.now();
    needIdle = true;
    hovered = null;
    hud.hover(null, 0, 0);
    if (next === 'planet') {
      const p = planetObjs.find((o) => o.d.s === arg);
      if (!p) return;
      setWorld('solar');
      level = 'planet';
      focus = p;
      buildMoons(p);
      const dist = p.vr * 9;
      if (opts.instant) {
        anim = null;
        controls.target.copy(p.mesh.position);
        camera.position.copy(p.mesh.position).add(new THREE.Vector3(0.6, 0.35, 1).normalize().multiplyScalar(dist));
      } else fly(p.mesh.position, dist, 1300);
      hud.setLevel('planet', p.d.n);
    } else if (next === 'solar') {
      if (prev !== 'solar' && prev !== 'planet') hud.warp();
      setWorld('solar');
      level = 'solar';
      focus = null;
      disposeMoons();
      if (prev === 'planet' && !opts.instant) fly(new THREE.Vector3(0, 0, 0), overview(), 1200);
      else {
        controls.target.set(0, 0, 0);
        camera.position.set(0, 42, 78).multiplyScalar(prev === 'stars' ? 1.4 : 1);
        if (prev === 'stars') fly(new THREE.Vector3(0, 0, 0), overview() * 1.3, 900);
      }
      hud.setLevel('solar');
    } else if (next === 'stars') {
      hud.warp();
      await buildStars();
      setWorld('stars');
      level = 'stars';
      focus = null;
      disposeMoons();
      disposeSystem();
      controls.target.set(0, 0, 0);
      camera.position.set(0, 1.2, 4).multiplyScalar(prev === 'galaxy' ? 25 : 1.5);
      fly(new THREE.Vector3(0, 0, 0), prev === 'galaxy' ? 55 : 26, 1200, new THREE.Vector3(0.3, 0.45, 1));
      hud.setLevel('stars');
    } else if (next === 'system') {
      const list = await loadStars();
      const s = list.find((x) => x.s === arg);
      if (!s) return;
      hud.warp();
      buildSystem(s);
      setWorld('system');
      level = 'system';
      controls.target.set(0, 0, 0);
      camera.position.set(0, 24, 40);
      fly(new THREE.Vector3(0, 0, 0), 34, 900, new THREE.Vector3(0, 0.55, 1));
      hud.setLevel('system', s.n);
    } else if (next === 'galaxy') {
      hud.warp();
      await buildGalaxy();
      setWorld('galaxy');
      level = 'galaxy';
      disposeSystem();
      controls.target.set(0, 0, 0);
      camera.position.copy(sunGal).add(new THREE.Vector3(0, 6, 8));
      fly(new THREE.Vector3(0, 0, 0), 95, 1600, new THREE.Vector3(-0.35, 0.75, 0.6));
      hud.setLevel('galaxy');
    }
    const [mn, mx] = limits();
    controls.minDistance = mn!;
    controls.maxDistance = mx!;
    camera.near = level === 'planet' ? 0.005 : 0.05;
    camera.updateProjectionMatrix();
    writeHash();
  }

  function up() {
    if (level === 'planet') void go('solar');
    else if (level === 'system') void go('stars');
    else if (level === 'solar') void go('stars');
    else if (level === 'stars') void go('galaxy');
  }
  /** Back toward home (the solar system). */
  function back() {
    if (level === 'planet') void go('solar');
    else if (level === 'system') void go('stars');
    else if (level === 'stars') void go('solar');
    else if (level === 'galaxy') void go('stars');
  }
  function down() {
    if (level === 'galaxy') void go('stars');
    else if (level === 'stars') void go('solar');
  }

  // ---------------------------------------------------------- URL hash state
  function writeHash() {
    const h = level === 'planet' && focus ? `#planet=${focus.d.s}` : level === 'system' && sys ? `#system=${sys.star.s}` : `#${level}`;
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  // ---------------------------------------------------------- picking
  function picks(): Pick[] {
    const out: Pick[] = [];
    const nav = (slug: string) => () => openBody(slug);
    if (level === 'solar' || level === 'planet') {
      out.push({ key: 'sun', pos: sunMesh.position, r: SUN_R, minPx: 14, kind: 'open', label: solar.sun.n, eq: solar.sun.eq, priority: 1, act: nav('sun') });
      for (const o of planetObjs) {
        const focused = focus === o;
        out.push({ key: o.d.s, pos: o.mesh.position, r: o.vr, minPx: 10, kind: 'open', label: o.d.n, sub: o.d.moons ? `衛星 ${o.d.moons}` : undefined, eq: o.d.eq, priority: 3, act: nav(o.d.s) });
        if (!focused) out.push({ key: `${o.d.s}-halo`, pos: o.mesh.position, r: o.vr * 4.5, minPx: 34, kind: 'zoom', label: o.d.n, sub: o.d.moons ? `衛星 ${o.d.moons}` : undefined, eq: o.d.eq, priority: 1, act: () => void go('planet', o.d.s) });
      }
      if (level === 'solar' || camDist() > 6) {
        for (const s of smallSpheres) out.push({ key: s.d.s, pos: s.mesh.position, r: s.vr, minPx: 9, kind: 'open', label: s.d.n, eq: s.d.eq, priority: 2, act: nav(s.d.s) });
        pointsD.forEach((d, k) => out.push({ key: d.s, pos: new THREE.Vector3(smallPos[k * 3], smallPos[k * 3 + 1], smallPos[k * 3 + 2]), r: 0, minPx: 6, kind: 'open', label: d.n, sub: d.c === 'comet' ? '彗星' : '小天体', eq: d.eq, priority: 0, act: nav(d.s) }));
      }
      if (moonSys && level === 'planet' && camDist() < moonClickRange(moonSys.planet)) {
        for (const it of moonSys.items) out.push({ key: it.d.s, pos: it.obj.getWorldPosition(new THREE.Vector3()), r: 0.05, minPx: 10, kind: 'open', label: it.d.n, eq: it.d.eq, priority: 4, act: nav(it.d.s) });
        if (moonSys.pts) {
          const arr = moonSys.pts.geometry.attributes.position!.array as Float32Array;
          moonSys.minor.forEach((d, k) => out.push({ key: d.s, pos: new THREE.Vector3(arr[k * 3], arr[k * 3 + 1], arr[k * 3 + 2]).add(moonSys!.group.position), r: 0, minPx: 6, kind: 'open', label: d.n, eq: d.eq, priority: 2, act: nav(d.s) }));
        }
      }
    } else if (level === 'stars' && stars && starPts) {
      out.push({ key: 'home', pos: new THREE.Vector3(), r: 0.6, minPx: 16, kind: 'zoom', label: '太陽系', priority: 5, act: () => void go('solar') });
      for (const s of stars) out.push({ key: s.s, pos: starWorldPos(s), r: 0, minPx: 6, kind: 'zoom', label: s.n, sub: `${s.d < 100 ? s.d.toFixed(1) : Math.round(s.d).toLocaleString('ja-JP')} 光年・惑星 ${s.p.length}`, priority: s.p.some((p) => p.cu) ? 2 : 1, act: () => void go('system', s.s) });
    } else if (level === 'system' && sys) {
      out.push({ key: 'star', pos: new THREE.Vector3().applyMatrix4(systemWorld.matrixWorld), r: sys.starR, minPx: 14, kind: 'open', label: sys.star.n, sub: `${sys.star.p.length} 惑星`, priority: 1, act: () => openUrl(u(`/systems/${sys!.star.s}/`)) });
      for (const p of sys.planets) out.push({ key: p.d.s, pos: p.mesh.getWorldPosition(new THREE.Vector3()), r: 0.3, minPx: 11, kind: 'open', label: p.d.n, eq: p.d.eq, priority: 3, act: nav(p.d.s) });
    } else if (level === 'galaxy') {
      out.push({ key: 'home', pos: sunGal, r: 0.8, minPx: 18, kind: 'zoom', label: '太陽系の近く', priority: 5, act: () => void go('stars') });
    }
    return out;
  }

  const ndc = new THREE.Vector3();
  function hit(px: number, py: number): Pick | null {
    const W = renderer.domElement.clientWidth;
    const H = renderer.domElement.clientHeight;
    const fovK = H / (2 * Math.tan((camera.fov * Math.PI) / 360));
    let best: { p: Pick; score: number } | null = null;
    for (const p of picks()) {
      ndc.copy(p.pos).project(camera);
      if (ndc.z < -1 || ndc.z > 1) continue;
      const sx = ((ndc.x + 1) / 2) * W;
      const sy = ((1 - ndc.y) / 2) * H;
      const dist = camera.position.distanceTo(p.pos);
      const rpx = Math.max(p.minPx, (p.r / dist) * fovK);
      const dpx = Math.hypot(sx - px, sy - py);
      if (dpx > rpx) continue;
      const score = p.priority * 1000 - dpx - (p.kind === 'zoom' ? 50 : 0) - dist * 0.01;
      if (!best || score > best.score) best = { p, score };
    }
    return best?.p ?? null;
  }

  function openUrl(href: string) {
    hud.warp();
    setTimeout(() => (location.href = href), 260);
  }
  const openBody = (slug: string) => openUrl(u(`/bodies/${slug}/`));

  // ---------------------------------------------------------- input
  const el = renderer.domElement;
  let down0: { x: number; y: number; t: number } | null = null;
  let hovered: Pick | null = null;
  el.addEventListener('pointerdown', (e) => (down0 = { x: e.clientX, y: e.clientY, t: performance.now() }));
  el.addEventListener('pointerup', (e) => {
    if (!down0) return;
    const moved = Math.hypot(e.clientX - down0.x, e.clientY - down0.y);
    const quick = performance.now() - down0.t < 450;
    down0 = null;
    if (moved > 6 || !quick || anim) return;
    const r = el.getBoundingClientRect();
    const h = hit(e.clientX - r.left, e.clientY - r.top);
    if (h) h.act();
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    hovered = down0 ? null : hit(e.clientX - r.left, e.clientY - r.top);
    el.style.cursor = hovered ? 'pointer' : 'grab';
    hud.hover(hovered ? { label: hovered.label, sub: hovered.sub, eq: hovered.eq, kind: hovered.kind } : null, e.clientX, e.clientY);
  });
  el.addEventListener('pointerleave', () => hud.hover(null, 0, 0));
  el.addEventListener('dblclick', () => {
    if (!hovered) up();
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') back();
    if (e.key === ' ' && e.target === document.body) {
      e.preventDefault();
      paused = !paused;
      hud.setPaused(paused);
    }
  });

  // wheel past the zoom limits switches scale
  let push = 0;
  let pushT = 0;
  el.addEventListener(
    'wheel',
    (e) => {
      const now = performance.now();
      // one scale change per scroll gesture: after a switch, wait until the wheel has been idle
      // for ~20 rendered frames (frame-based, so slow devices that delay events behave the same)
      const idle = now - lastWheel > 300 && frames - lastWheelFrame > 20;
      lastWheel = now;
      lastWheelFrame = frames;
      if (needIdle) {
        // the gesture that triggered the last switch must end after the transition settles
        if (!idle || anim || now - switchedAt < 1400) return;
        needIdle = false;
      }
      if (anim || now - switchedAt < 1400) return;
      const [mn, mx] = limits();
      const d = camDist();
      if (now - pushT > 700) push = 0;
      if (e.deltaY > 0 && d >= mx! * 0.985) {
        push++;
        pushT = now;
        if (push >= 3) {
          push = 0;
          up();
        }
      } else if (e.deltaY < 0 && d <= mn! * 1.03 && (level === 'stars' || level === 'galaxy')) {
        push++;
        pushT = now;
        if (push >= 3) {
          push = 0;
          down();
        }
      } else if (level === 'planet' && e.deltaY > 0 && focus && d > focus.vr * 40) {
        void go('solar');
      }
    },
    { passive: true },
  );

  addEventListener('resize', () => {
    const W = canvasHost.clientWidth;
    const H = canvasHost.clientHeight;
    camera.aspect = W / H;
    fitFov();
    renderer.setSize(W, H);
    composer.setSize(W, H);
  });

  // ---------------------------------------------------------- loop
  let last = performance.now();
  const tick = () => {
    frames++;
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused) jd += SPEED[level] * dt;

    if (level === 'solar' || level === 'planet') {
      const before = focus ? focus.mesh.position.clone() : null;
      updateSolar();
      updateMoons();
      if (focus && before && !anim) {
        const delta = focus.mesh.position.clone().sub(before);
        camera.position.add(delta);
        controls.target.add(delta);
      }
      if (focus && anim) anim.tTo.copy(focus.mesh.position);
    }
    if (level === 'system') updateSystem();

    if (anim) {
      const t = Math.min(1, (now - anim.t0) / anim.dur);
      const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      controls.target.lerpVectors(anim.tFrom, anim.tTo, k);
      camera.position.lerpVectors(anim.from, anim.tTo.clone().add(anim.offset), k);
      if (t >= 1) {
        const done = anim.done;
        anim = null;
        done?.();
      }
      controls.enabled = !anim;
    } else controls.enabled = true;
    controls.autoRotate = level === 'galaxy' || level === 'stars';
    controls.autoRotateSpeed = 0.25;
    controls.update();

    // labels
    const W = renderer.domElement.clientWidth;
    const H = renderer.domElement.clientHeight;
    // greedy de-cluttering: earlier labels (planets, larger moons) win over later ones
    const placed: [number, number, number, number][] = [];
    for (const l of labels) {
      if (!l.show()) {
        l.el.style.display = 'none';
        continue;
      }
      const p = l.pos().project(camera);
      if (p.z > 1 || p.z < -1) {
        l.el.style.display = 'none';
        continue;
      }
      const x = ((p.x + 1) / 2) * W;
      const y = ((1 - p.y) / 2) * H;
      l.el.style.display = '';
      l.w ??= l.el.offsetWidth || 60;
      const box: [number, number, number, number] = [x - l.w / 2 - 3, y - 16, x + l.w / 2 + 3, y];
      if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) {
        l.el.style.display = 'none';
        continue;
      }
      placed.push(box);
      l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
    hud.setDate(level === 'solar' || level === 'planet' ? jd : null);
    composer.render();
    requestAnimationFrame(tick);
  };

  // ---------------------------------------------------------- initial view
  hud.setLevel('solar');
  updateSolar();
  controls.target.set(0, 0, 0);
  camera.position.set(0, 55, 95);
  const [mn, mx] = limits();
  controls.minDistance = mn!;
  controls.maxDistance = mx!;
  requestAnimationFrame(tick);
  fly(new THREE.Vector3(0, 0, 0), overview(), 1800, new THREE.Vector3(0.35, 0.55, 1));

  const h = location.hash.slice(1);
  const [hk, hv] = h.split('=');
  if (hk === 'planet' && hv) void go('planet', hv, { instant: true });
  else if (hk === 'system' && hv) void go('system', hv);
  else if (hk === 'stars' || hk === 'galaxy') void go(hk);

  return {
    go,
    up,
    back,
    togglePause: () => {
      paused = !paused;
      hud.setPaused(paused);
    },
    get level() {
      return level;
    },
    // used by the smoke test
    debug: () => ({ level, focus: focus?.d.s ?? null, dist: camDist(), jd, busy: !!anim }),
    screenOf(key: string) {
      const p = picks().find((x) => x.key === key);
      if (!p) return null;
      const v = p.pos.clone().project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
  };
}
