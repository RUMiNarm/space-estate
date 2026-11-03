import { u } from '../../lib/base.ts';
/**
 * Compare up to four bodies. One small horizontal-bar chart per metric (no dual axes),
 * entities coloured in fixed categorical order (dataviz reference palette slots 1–4),
 * values direct-labelled, legend above, and the full table as the table view.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { CATEGORY_JA, fmt, fmtLy, HZ_JA } from '../../lib/format.ts';
import type { IndexRow } from '../../lib/types.ts';
import { EquipBadge, name, useIndex } from './shared.tsx';

const COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
const DEFAULT = ['earth', 'mars', 'trappist-1-e', 'proxima-cen-b'];

interface Metric {
  key: string;
  label: string;
  get: (r: IndexRow) => number | null;
  fmt: (x: number) => string;
  log?: boolean;
  note?: string;
}
const METRICS: Metric[] = [
  { key: 'rad', label: '半径（地球=1）', get: (r) => r.rad, fmt: (x) => fmt(x), log: true, note: '＊はアーカイブが質量から計算した値（実測ではない）' },
  { key: 'g', label: '表面重力（地球=1）', get: (r) => r.g, fmt: (x) => fmt(x, 2), log: true },
  { key: 't', label: '代表温度（K）', get: (r) => r.t, fmt: (x) => `${fmt(x, 0)} K（${fmt(x - 273.15, 0)}°C）` },
  { key: 'e', label: 'ESI（地球=1）', get: (r) => r.e, fmt: (x) => fmt(x, 3) },
  { key: 'd', label: '地球からの距離（光年）', get: (r) => (r.sy === 'solar' ? null : r.d), fmt: (x) => fmtLy(x), log: true, note: '太陽系の天体は表示しません' },
];

export default function Compare() {
  const { rows, error } = useIndex();
  const [sel, setSel] = useState<string[]>(DEFAULT);
  const [q, setQ] = useState('');
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(location.search).get('b');
    if (p) setSel(p.split(',').slice(0, 4));
  }, []);
  useEffect(() => {
    history.replaceState(null, '', `?b=${sel.join(',')}`);
  }, [sel]);

  const by = useMemo(() => new Map((rows ?? []).map((r) => [r.s, r])), [rows]);
  // drop unknown or duplicate slugs (e.g. from a hand-edited ?b=) once the index is loaded
  useEffect(() => {
    if (!rows) return;
    const clean = [...new Set(sel)].filter((s) => by.has(s)).slice(0, 4);
    if (clean.length !== sel.length) setSel(clean);
  }, [rows]);
  const chosen = sel.map((s) => by.get(s)).filter((r): r is IndexRow => !!r);
  const matches = useMemo(() => {
    if (!rows || q.trim().length < 1) return [];
    const n = q.normalize('NFKC').toLowerCase();
    return rows.filter((r) => r.n.toLowerCase().includes(n) || (r.j ?? '').includes(q.trim())).slice(0, 8);
  }, [rows, q]);

  return (
    <div class="compare">
      <style>{CSS}</style>
      {error && <p role="alert">データを読み込めませんでした（{error}）。</p>}
      <div class="card pick">
        <label>
          <span class="small muted">物件を追加（最大4件）</span>
          <input type="search" value={q} placeholder="名前を入力（例：タイタン、Kepler-22）" onInput={(e) => setQ((e.target as HTMLInputElement).value)} disabled={sel.length >= 4} />
        </label>
        {matches.length > 0 && (
          <ul class="sugg">
            {matches.map((m) => (
              <li><button type="button" class="btn" disabled={sel.includes(m.s)} onClick={() => { setSel([...sel, m.s].slice(0, 4)); setQ(''); }}>{name(m)}<span class="small muted">（{CATEGORY_JA[m.c]}）</span></button></li>
            ))}
          </ul>
        )}
        <div class="legend" aria-label="凡例">
          {chosen.map((r, i) => (
            <span class="chip">
              <span class="sw" style={{ background: COLORS[i] }} aria-hidden="true" />
              <a href={u(`/bodies/${r.s}/`)}>{name(r)}</a>
              <button type="button" class="x" aria-label={`${name(r)}を外す`} onClick={() => setSel(sel.filter((s) => s !== r.s))}>×</button>
            </span>
          ))}
        </div>
      </div>

      {chosen.length > 0 && (
        <div class="charts">
          {METRICS.map((m) => {
            const vals = chosen.map((r) => m.get(r));
            const present = vals.filter((v): v is number => v != null && v > 0);
            const max = present.length ? Math.max(...present) : 1;
            const min = present.length ? Math.min(...present) : 1;
            const scale = (v: number) => {
              if (!m.log) return v / max;
              const lo = Math.log10(Math.min(min, 1) / 2);
              const hi = Math.log10(Math.max(max, 1));
              return (Math.log10(v) - lo) / (hi - lo || 1);
            };
            return (
              <figure class="card chart">
                <figcaption><b>{m.label}</b>{m.log && <span class="small muted">（対数目盛）</span>}{m.note && <span class="small muted">　{m.note}</span>}</figcaption>
                {chosen.map((r, i) => {
                  const v = vals[i];
                  return (
                    <div class={`bar-row ${hover && hover !== r.s ? 'dim' : ''}`} onMouseEnter={() => setHover(r.s)} onMouseLeave={() => setHover(null)}>
                      <span class="bl small">{name(r)}</span>
                      <span class="track">
                        {v != null && v > 0 && <span class="bar" style={{ width: `${Math.max(1.5, scale(v) * 100)}%`, background: COLORS[i] }} title={`${name(r)}：${m.fmt(v)}`} />}
                      </span>
                      <span class="bv small num">{v == null ? 'データなし' : `${m.fmt(v)}${m.key === 'rad' && r.rc ? '＊' : ''}`}</span>
                    </div>
                  );
                })}
              </figure>
            );
          })}
        </div>
      )}

      {chosen.length > 0 && (
        <div class="card table-scroll">
          <table>
            <caption class="small muted" style={{ textAlign: 'left' }}>比較表（グラフと同じ値）</caption>
            <thead><tr><th>項目</th>{chosen.map((r, i) => <th><span class="sw" style={{ background: COLORS[i] }} aria-hidden="true" /> {name(r)}</th>)}</tr></thead>
            <tbody>
              <tr><th>種類</th>{chosen.map((r) => <td>{CATEGORY_JA[r.c]}</td>)}</tr>
              <tr><th>入居条件</th>{chosen.map((r) => <td><EquipBadge r={r} /></td>)}</tr>
              <tr><th>立地</th>{chosen.map((r) => <td>{r.c === 'star' ? '—' : HZ_JA[r.hz]}</td>)}</tr>
              {METRICS.map((m) => <tr><th>{m.label}</th>{chosen.map((r) => { const v = m.get(r); return <td class="num">{v == null ? '不明' : `${m.fmt(v)}${m.key === 'rad' && r.rc ? '＊（計算値）' : ''}`}</td>; })}</tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const CSS = `
.pick{display:grid;gap:10px;margin-bottom:16px}
.pick label{display:flex;flex-direction:column;gap:4px}
.pick input{width:100%}
.sugg{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.legend{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:999px;padding:2px 4px 2px 10px;background:var(--surface-2)}
.sw{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px}
.x{border:0;background:none;color:var(--ink-2);font-size:1.1rem;cursor:pointer;padding:0 6px;line-height:1}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-bottom:16px}
.chart{margin:0}
.chart figcaption{margin-bottom:8px}
.bar-row{display:grid;grid-template-columns:7.5em 1fr auto;gap:8px;align-items:center;padding:3px 0;transition:opacity .15s}
.bar-row.dim{opacity:.35}
.bl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-2)}
.track{height:14px;background:var(--surface-2);border-radius:0 4px 4px 0;position:relative}
.bar{display:block;height:100%;border-radius:0 4px 4px 0}
.bv{color:var(--ink);white-space:nowrap}
`;
