/** Procedural looks: planet surface textures, glow sprites and star colours. Purely visual. */
import * as THREE from 'three';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const hash = (str: string) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

type Style = { base: string[]; bands?: boolean; spots?: string; noise?: number; ice?: boolean };
const STYLES: Record<string, Style> = {
  mercury: { base: ['#8f8a84', '#6f6a66', '#a39d96'], noise: 0.35 },
  venus: { base: ['#e8cf96', '#d9b56e', '#f1deb0'], bands: true, noise: 0.08 },
  earth: { base: ['#1d5fa8', '#2c7bd1'], spots: '#3f8a4a', ice: true },
  moon: { base: ['#9a9a97', '#7d7d7a', '#b1b1ad'], noise: 0.35 },
  mars: { base: ['#b3532d', '#8f3d22', '#c8714a'], noise: 0.3, ice: true },
  jupiter: { base: ['#d9b68c', '#b98b62', '#efdcc2', '#a8704d', '#e7cfae'], bands: true },
  saturn: { base: ['#e6d3a3', '#cdb07a', '#f2e6c4', '#bfa06a'], bands: true },
  uranus: { base: ['#a6dde3', '#93cfd8', '#b8e6ea'], bands: true, noise: 0.03 },
  neptune: { base: ['#3d6fe0', '#2f58c4', '#5a86ea'], bands: true, noise: 0.05 },
  pluto: { base: ['#cdb79a', '#a88b6b', '#efe2cf'], noise: 0.3 },
  ice: { base: ['#e3ebef', '#c3d0d7', '#f4f7f8'], noise: 0.25 },
  rock: { base: ['#9b8f84', '#776b61', '#b7ab9f'], noise: 0.35 },
  volcanic: { base: ['#d8c25a', '#b5882f', '#e9de88'], spots: '#5a3a1a', noise: 0.2 },
  haze: { base: ['#d79a3e', '#c4862e', '#e2ad57'], bands: true, noise: 0.04 },
};

export function styleFor(slug: string, tempK?: number | null): string {
  if (STYLES[slug]) return slug;
  if (slug === 'io') return 'volcanic';
  if (slug === 'titan') return 'haze';
  if (['europa', 'enceladus', 'triton', 'tethys', 'dione', 'rhea', 'mimas', 'ariel', 'miranda', 'titania', 'oberon', 'eris', 'makemake', 'charon'].includes(slug)) return 'ice';
  if (tempK != null && tempK < 120) return 'ice';
  return 'rock';
}

const texCache = new Map<string, THREE.Texture>();
export function planetTexture(style: string, seedKey: string): THREE.Texture {
  const k = `${style}|${seedKey}`;
  const hit = texCache.get(k);
  if (hit) return hit;
  const st = STYLES[style] ?? STYLES.rock!;
  const W = 256;
  const H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const r = rng(hash(seedKey));
  g.fillStyle = st.base[0]!;
  g.fillRect(0, 0, W, H);
  if (st.bands) {
    let y = 0;
    while (y < H) {
      const h = 3 + r() * 12;
      g.fillStyle = st.base[Math.floor(r() * st.base.length)]!;
      g.globalAlpha = 0.55 + r() * 0.45;
      g.fillRect(0, y, W, h);
      y += h;
    }
    g.globalAlpha = 1;
    if (style === 'jupiter') {
      g.fillStyle = '#b5523a';
      g.beginPath();
      g.ellipse(W * 0.62, H * 0.64, 14, 7, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const n = st.noise ?? 0;
  if (n > 0) {
    for (let k2 = 0; k2 < 1400; k2++) {
      g.fillStyle = st.base[Math.floor(r() * st.base.length)]!;
      g.globalAlpha = n * r();
      const s = 1 + r() * 6;
      g.beginPath();
      g.arc(r() * W, r() * H, s, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  if (st.spots) {
    g.fillStyle = st.spots;
    for (let k2 = 0; k2 < 9; k2++) {
      g.globalAlpha = 0.7;
      g.beginPath();
      g.ellipse(r() * W, H * (0.25 + r() * 0.5), 10 + r() * 26, 6 + r() * 14, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  if (st.ice) {
    g.fillStyle = '#f2f6f8';
    g.fillRect(0, 0, W, 6);
    g.fillRect(0, H - 6, W, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(k, t);
  return t;
}

let glowTex: THREE.Texture | null = null;
export function glowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

/** Round soft point sprite for THREE.Points. */
let dotTex: THREE.Texture | null = null;
export function dotTexture(): THREE.Texture {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

/** Approximate colour of a star with the given effective temperature (visual only). */
export function starColor(teff: number | null | undefined): THREE.Color {
  const T = teff ?? 5000;
  const stops: [number, [number, number, number]][] = [
    [2400, [255, 150, 80]], [3000, [255, 178, 110]], [3800, [255, 205, 150]], [5000, [255, 232, 200]],
    [5800, [255, 245, 232]], [7000, [228, 234, 255]], [10000, [186, 204, 255]], [30000, [160, 185, 255]],
  ];
  let a = stops[0]!;
  let b = stops.at(-1)!;
  for (let k = 0; k < stops.length - 1; k++) if (T >= stops[k]![0] && T <= stops[k + 1]![0]) { a = stops[k]!; b = stops[k + 1]!; }
  const f = T <= a[0] ? 0 : T >= b[0] ? 1 : (T - a[0]) / (b[0] - a[0]);
  const m = (k: 0 | 1 | 2) => (a[1][k] + (b[1][k] - a[1][k]) * f) / 255;
  return new THREE.Color(m(0), m(1), m(2));
}
