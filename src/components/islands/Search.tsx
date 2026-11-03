import { useEffect, useMemo, useState } from 'preact/hooks';
import { CATEGORY_JA, EQUIP } from '../../lib/format.ts';
import { DEFAULT_FILTERS, type Filters, fromQuery, runFilters, type SortKey, sortRows, steps, toQuery } from '../../lib/search.ts';
import type { Category, EquipmentLevel } from '../../lib/types.ts';
import { RESULT_CSS, RowItem, useIndex } from './shared.tsx';

const CATS: Category[] = ['planet', 'dwarf', 'moon', 'small', 'comet', 'exoplanet', 'star'];
const SORT_JA: Record<SortKey, string> = {
  esi: 'ESI（地球に似ている順）',
  distance: '近い順',
  year: '発見が新しい順',
  gravity: '重力が地球に近い順',
  temp: '代表温度が地球に近い順',
  radius: '大きさが地球に近い順',
  name: '名前順',
};
const PAGE = 50;

interface Props {
  preset?: Partial<Filters>;
  syncUrl?: boolean;
  title?: string;
}

export default function Search({ preset, syncUrl = true }: Props) {
  const { rows, error } = useIndex();
  const base = { ...DEFAULT_FILTERS, ...preset };
  const [f, setF] = useState<Filters>(base);
  const [sort, setSort] = useState<SortKey>('esi');
  const [limit, setLimit] = useState(PAGE);
  const [ready, setReady] = useState(false);
  // phones: conditions start folded so results are visible right away
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (matchMedia('(max-width: 640px)').matches) setOpen(false);
    if (syncUrl) {
      const s = fromQuery(location.search, base);
      setF(s.f);
      setSort(s.sort);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !syncUrl) return;
    const q = toQuery(f, sort);
    history.replaceState(null, '', q ? `?${q}` : location.pathname);
    setLimit(PAGE);
  }, [f, sort, ready]);

  const funnel = useMemo(() => (rows ? runFilters(rows, f) : null), [rows, f]);
  // announce the result count to screen readers after typing settles
  const [liveText, setLiveText] = useState('');
  useEffect(() => {
    if (!funnel) return;
    const id = setTimeout(() => setLiveText(`${funnel.rows.length.toLocaleString('ja-JP')} 件が見つかりました`), 700);
    return () => clearTimeout(id);
  }, [funnel]);
  const sorted = useMemo(() => (funnel ? sortRows(funnel.rows, sort) : []), [funnel, sort]);
  const activeCount = steps(f).filter((s) => s.key !== 'q' && !(preset?.cats && s.key === 'cat') && !(preset?.parent && s.key === 'parent')).length;
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));
  const numOrNull = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s)) ? null : Number(s));

  return (
    <div class="search">
      <style>{RESULT_CSS + CSS}</style>
      <form class="filters card" onSubmit={(e) => e.preventDefault()} aria-label="検索条件">
        <div class="row">
          <label class="grow">
            <span class="lbl">名前で探す</span>
            <input type="search" value={f.q} placeholder="例：火星、TRAPPIST、Titan" onInput={(e) => set('q', (e.target as HTMLInputElement).value)} />
          </label>
          <label>
            <span class="lbl">並び替え</span>
            <select value={sort} onChange={(e) => setSort((e.target as HTMLSelectElement).value as SortKey)}>
              {Object.entries(SORT_JA).map(([k, v]) => <option value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <button type="button" class="btn ftoggle" aria-expanded={open} aria-controls="more-filters" onClick={() => setOpen(!open)}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path></svg>
          絞り込み
          {activeCount > 0 && <span class="fcount">{activeCount}</span>}
          <span class="chev" aria-hidden="true">{open ? '▲' : '▼'}</span>
        </button>
        <div class="more" id="more-filters" data-open={String(open)}>
        <fieldset>
          <legend>種類</legend>
          {CATS.map((c) => (
            <label class="chk">
              <input type="checkbox" checked={f.cats.includes(c)} onChange={(e) => set('cats', (e.target as HTMLInputElement).checked ? [...f.cats, c] : f.cats.filter((x) => x !== c))} />
              {CATEGORY_JA[c]}
            </label>
          ))}
          <label class="chk"><input type="checkbox" checked={f.curatedOnly} onChange={(e) => set('curatedOnly', (e.target as HTMLInputElement).checked)} />厳選物件だけ</label>
        </fieldset>
        <div class="row wrap">
          <fieldset>
            <legend>住める条件</legend>
            <label class="chk"><input type="checkbox" checked={f.rocky} onChange={(e) => set('rocky', (e.target as HTMLInputElement).checked)} />岩石・固体の地表</label>
            <label class="chk">
              <select value={f.hz} onChange={(e) => set('hz', (e.target as HTMLSelectElement).value as Filters['hz'])} aria-label="ハビタブルゾーン">
                <option value="any">ハビタブルゾーン：指定なし</option>
                <option value="cons">保守的なハビタブルゾーン内</option>
                <option value="opt">楽観的なハビタブルゾーンも含む</option>
              </select>
            </label>
            <label class="chk">
              <select value={f.atm} onChange={(e) => set('atm', (e.target as HTMLSelectElement).value as Filters['atm'])} aria-label="大気">
                <option value="any">大気：指定なし</option>
                <option value="notAirless">大気がない天体を除く</option>
                <option value="known">大気が確認されている</option>
              </select>
            </label>
            <label class="chk"><input type="checkbox" checked={f.includeUnknown} onChange={(e) => set('includeUnknown', (e.target as HTMLInputElement).checked)} />データ不明の物件も含める</label>
          </fieldset>
          <fieldset>
            <legend>範囲</legend>
            <div class="rng">
              <span class="lbl">代表温度（°C）</span>
              <span class="pair">
                <input type="number" inputMode="numeric" step="10" aria-label="代表温度の下限（°C）" value={f.tMinC ?? ''} placeholder="下限" onInput={(e) => set('tMinC', numOrNull((e.target as HTMLInputElement).value))} />
                <span aria-hidden="true">〜</span>
                <input type="number" inputMode="numeric" step="10" aria-label="代表温度の上限（°C）" value={f.tMaxC ?? ''} placeholder="上限" onInput={(e) => set('tMaxC', numOrNull((e.target as HTMLInputElement).value))} />
              </span>
            </div>
            <div class="rng">
              <span class="lbl">重力（地球=1）</span>
              <span class="pair">
                <input type="number" inputMode="decimal" step="0.1" min="0" aria-label="重力の下限（地球=1）" value={f.gMin ?? ''} placeholder="下限" onInput={(e) => set('gMin', numOrNull((e.target as HTMLInputElement).value))} />
                <span aria-hidden="true">〜</span>
                <input type="number" inputMode="decimal" step="0.1" min="0" aria-label="重力の上限（地球=1）" value={f.gMax ?? ''} placeholder="上限" onInput={(e) => set('gMax', numOrNull((e.target as HTMLInputElement).value))} />
              </span>
            </div>
            <div class="rng">
              <span class="lbl">距離（光年以内）</span>
              <span class="pair">
                <input type="number" inputMode="numeric" step="10" min="0" aria-label="距離の上限（光年）" value={f.dMaxLy ?? ''} placeholder="上限" onInput={(e) => set('dMaxLy', numOrNull((e.target as HTMLInputElement).value))} />
              </span>
            </div>
            <div class="rng">
              <span class="lbl">入居条件</span>
              <select value={f.eqMax ?? ''} aria-label="入居条件" onChange={(e) => { const v = (e.target as HTMLSelectElement).value; set('eqMax', v === '' ? null : (Number(v) as EquipmentLevel)); }}>
                <option value="">指定なし</option>
                {([0, 1, 2, 3] as EquipmentLevel[]).map((l) => <option value={l}>{EQUIP[l].label} まで</option>)}
              </select>
            </div>
          </fieldset>
        </div>
        <div class="row">
          <button type="button" class="btn" onClick={() => { setF(base); setSort('esi'); }}>条件をリセット</button>
        </div>
        </div>
      </form>

      {error && <p role="alert">検索データを読み込めませんでした（{error}）。</p>}
      {!rows && !error && <p class="muted" aria-live="polite">データを読み込んでいます…</p>}
      {funnel && rows && (
        <>
          <p class="sr-only" aria-live="polite">{liveText}</p>
          <div class="funnel">
            <span class="step"><b class="num">{rows.length.toLocaleString('ja-JP')}</b> 件</span>
            {funnel.counts.map((c) => (
              <span class="step">
                <span aria-hidden="true" class="arrow">→</span> {c.label}で −{c.removed.toLocaleString('ja-JP')} → <b class="num">{c.remaining.toLocaleString('ja-JP')}</b> 件
              </span>
            ))}
          </div>
          {sorted.length === 0 ? (
            <p class="card">条件に合う物件はありません。条件をゆるめるか、「データ不明の物件も含める」をオンにしてください。</p>
          ) : (
            <ul class="res-list">{sorted.slice(0, limit).map((r) => <RowItem r={r} />)}</ul>
          )}
          {sorted.length > limit && (
            <p style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" class="btn" onClick={() => setLimit((l) => l + PAGE)}>さらに {Math.min(PAGE, sorted.length - limit)} 件を表示（残り {(sorted.length - limit).toLocaleString('ja-JP')} 件）</button>
            </p>
          )}
        </>
      )}
    </div>
  );
}

const CSS = `
.filters{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin-bottom:16px}
.filters select{max-width:100%;min-width:0}
.filters fieldset{min-width:0}
.filters .row{display:flex;gap:12px;align-items:flex-end}
.filters .row.wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));align-items:stretch}
.filters label.rng select{flex:1 1 12em;width:100%;min-width:0}
.filters .grow{flex:1}
.filters label{display:flex;flex-direction:column;gap:4px}
.filters label.chk{flex-direction:row;display:inline-flex;margin:2px 12px 2px 0;white-space:normal}
.filters .more{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
.filters .rng{display:grid;gap:4px;margin:6px 0}
.filters .pair{display:flex;align-items:center;gap:8px}
.filters .pair input{flex:1 1 0;min-width:0;width:100%}
.filters .rng select{width:100%}
.ftoggle{display:none;justify-content:center}
.fcount{display:inline-grid;place-items:center;min-width:1.5em;height:1.5em;padding:0 6px;border-radius:999px;background:var(--accent);color:#fff;font-size:.8rem;font-weight:700}
.chev{font-size:.7rem;color:var(--ink-2)}
.lbl{font-size:.85rem;color:var(--ink-2)}
.filters input[type=search]{width:100%}
.funnel{display:flex;flex-wrap:wrap;gap:4px 10px;margin:0 0 12px;font-size:.9rem;color:var(--ink-2)}
.funnel b{color:var(--ink)}
.arrow{color:var(--muted)}
@media (max-width:640px){.filters .row{flex-direction:column;align-items:stretch}.ftoggle{display:inline-flex}.filters .more[data-open=false]{display:none}.filters label.chk{margin:6px 14px 6px 0}.filters input,.filters select{font-size:16px;min-height:44px}.filters input[type=checkbox]{min-height:0}}
`;
