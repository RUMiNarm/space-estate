import { u } from '../../lib/base.ts';
import { useEffect, useState } from 'preact/hooks';
import { CATEGORY_JA, EQUIP, fmt, fmtLy, HZ_JA } from '../../lib/format.ts';
import type { IndexRow } from '../../lib/types.ts';

let cached: Promise<IndexRow[]> | null = null;
export function loadIndex(): Promise<IndexRow[]> {
  if (!cached) cached = fetch(u('/data/index.json')).then((r) => {
    if (!r.ok) throw new Error(`index.json: HTTP ${r.status}`);
    return r.json() as Promise<Partial<IndexRow>[]>;
  }).then((rows) =>
    // index.json omits null fields and false flags; restore them
    rows.map((r) => ({ ...r, t: r.t ?? null, g: r.g ?? null, rad: r.rad ?? null, d: r.d ?? null, e: r.e ?? null, y: r.y ?? null, eq: r.eq ?? null, cu: !!r.cu }) as IndexRow),
  );
  return cached;
}

export function useIndex(): { rows: IndexRow[] | null; error: string | null } {
  const [rows, setRows] = useState<IndexRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadIndex().then(setRows, (e: Error) => setError(e.message));
  }, []);
  return { rows, error };
}

export const name = (r: IndexRow) => r.j ?? r.n;

export function EquipBadge({ r }: { r: Pick<IndexRow, 'eq' | 'eqMin'> }) {
  const e = EQUIP[r.eq ?? 'null'];
  return (
    <span class="lv" title={e.label}>
      <span class="lv-dot" style={{ background: e.color }} aria-hidden="true" />
      <span aria-hidden="true" style={{ fontSize: '0.8em', color: 'var(--ink-2)' }}>{e.icon}</span>
      <span>{e.short}</span>
    </span>
  );
}

export function RowItem({ r, note }: { r: IndexRow; note?: string }) {
  const tC = r.t == null ? null : r.t - 273.15;
  return (
    <li class="res">
      <div class="res-main">
        <a class="res-name" href={u(`/bodies/${r.s}/`)}>{name(r)}</a>
        {r.j && <span class="small muted"> {r.n}</span>}
        <div class="small muted">
          {CATEGORY_JA[r.c]}
          {r.sc ? `・${r.sc}` : ''}
          {r.cu && <span class="tag" style={{ marginLeft: 6 }}>厳選</span>}
        </div>
        {note && <div class="small" style={{ color: 'var(--tag-ink)' }}>{note}</div>}
      </div>
      <dl class="res-facts small num">
        <div><dt>入居</dt><dd><EquipBadge r={r} /></dd></div>
        <div><dt>代表温度</dt><dd>{tC == null ? '不明' : `${fmt(tC, 0)}°C`}</dd></div>
        <div><dt>重力</dt><dd>{r.g == null ? '不明' : fmt(r.g, 2)}</dd></div>
        <div><dt>距離</dt><dd>{r.sy === 'solar' ? '太陽系' : fmtLy(r.d)}</dd></div>
        <div><dt>ESI</dt><dd>{r.e == null ? '不明' : fmt(r.e, 2)}</dd></div>
        <div class="wide"><dt>立地</dt><dd>{r.c === 'star' ? '—' : HZ_JA[r.hz]}</dd></div>
      </dl>
    </li>
  );
}

export const RESULT_CSS = `
.res-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.res{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px}
.res-main{min-width:200px;flex:1 1 220px}
.res-name{font-weight:700;font-size:1.02rem}
.res-facts{display:grid;grid-template-columns:repeat(5,auto);gap:2px 14px;margin:0;align-items:start}
.res-facts div{display:flex;flex-direction:column}
.res-facts .wide{grid-column:1/-1;flex-direction:row;gap:6px}
.res-facts dt{color:var(--ink-2);font-size:.75rem}
.res-facts dd{margin:0}
@media (max-width:560px){.res-facts{grid-template-columns:repeat(3,auto)}}
`;
