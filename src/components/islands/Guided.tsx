import { u } from '../../lib/base.ts';
import { useMemo, useState } from 'preact/hooks';
import { DEFAULT_FILTERS, type Filters, runFilters, sortRows, steps } from '../../lib/search.ts';
import type { IndexRow } from '../../lib/types.ts';
import { name, RESULT_CSS, RowItem, useIndex } from './shared.tsx';

const DIST = [
  { v: 15, label: '15光年以内' },
  { v: 50, label: '50光年以内' },
  { v: 100, label: '100光年以内' },
  { v: 1000, label: '1,000光年以内' },
  { v: null, label: '距離は問わない' },
] as const;

export default function Guided() {
  const { rows, error } = useIndex();
  const [unknown, setUnknown] = useState(true);
  const [hz, setHz] = useState<'cons' | 'opt'>('cons');
  const [atm, setAtm] = useState<'notAirless' | 'known'>('notAirless');
  const [dist, setDist] = useState<number | null>(50);

  const stages: { title: string; f: Filters }[] = useMemo(() => {
    const s1: Filters = { ...DEFAULT_FILTERS, includeUnknown: unknown, rocky: true };
    const s2: Filters = { ...s1, hz };
    const s3: Filters = { ...s2, atm };
    const s4: Filters = { ...s3, dMaxLy: dist };
    return [
      { title: '1. 岩石・固体の地表がある', f: s1 },
      { title: '2. ハビタブルゾーンの中にある', f: s2 },
      { title: '3. 大気がある（少なくとも、ないと分かっていない）', f: s3 },
      { title: '4. 行ける距離にある', f: s4 },
    ];
  }, [unknown, hz, atm, dist]);

  const results = useMemo(() => {
    if (!rows) return null;
    return stages.map((st, i) => {
      const prev = i === 0 ? rows : runFilters(rows, stages[i - 1]!.f).rows;
      const cur = runFilters(rows, st.f).rows;
      const curSet = new Set(cur.map((r) => r.s));
      const dropped = prev.filter((r) => !curSet.has(r.s));
      const notable = dropped.filter((r) => r.cu).slice(0, 8);
      return { before: prev.length, after: cur.length, notable, rows: cur };
    });
  }, [rows, stages]);

  const finalRows = results ? sortRows(results[3]!.rows, 'distance') : [];
  const lastStep = steps(stages[3]!.f).at(-1);
  void lastStep;

  const Count = ({ i }: { i: number }) =>
    results ? (
      <p class="count">
        <b class="num">{results[i]!.before.toLocaleString('ja-JP')}</b> 件 → <b class="num">{results[i]!.after.toLocaleString('ja-JP')}</b> 件
        <span class="muted">（−{(results[i]!.before - results[i]!.after).toLocaleString('ja-JP')}）</span>
      </p>
    ) : null;
  const Dropped = ({ i }: { i: number }) =>
    results && results[i]!.notable.length > 0 ? (
      <p class="small dropped">
        この条件で外れた主な物件：
        {results[i]!.notable.map((r: IndexRow, k) => (
          <span>{k > 0 && '、'}<a href={u(`/bodies/${r.s}/`)}>{name(r)}</a></span>
        ))}
      </p>
    ) : null;

  return (
    <div class="guided">
      <style>{RESULT_CSS + CSS}</style>
      {error && <p role="alert">検索データを読み込めませんでした（{error}）。</p>}
      {!rows && !error && <p class="muted">データを読み込んでいます…</p>}
      <ol class="stages">
        <li class="card">
          <h2>{stages[0]!.title}</h2>
          <p>生命が生まれるには液体の水がまとまって存在する必要があり、ガスの惑星や恒星ではそれが難しいと考えられています。太陽系の天体は観測から、系外惑星は半径1.6倍以下（Rogers 2015）または質量2倍以下（Chen &amp; Kipping 2017）を「岩石惑星の可能性が高い」とします。</p>
          <label class="chk"><input type="checkbox" checked={unknown} onChange={(e) => setUnknown((e.target as HTMLInputElement).checked)} />大きさや質量が分からない物件も残す（すべてのステップに適用）</label>
          <Count i={0} />
          <Dropped i={0} />
        </li>
        <li class="card">
          <h2>{stages[1]!.title}</h2>
          <p>恒星に近すぎると水は蒸発し、遠すぎると凍ります。そのちょうどいい範囲がハビタブルゾーンです。恒星の温度と明るさから、Kopparapu ら（2014）の式で計算しています。</p>
          <div class="opts">
            <label class="chk"><input type="radio" name="hz" checked={hz === 'cons'} onChange={() => setHz('cons')} />保守的な範囲（地球なら0.95〜1.68 au）</label>
            <label class="chk"><input type="radio" name="hz" checked={hz === 'opt'} onChange={() => setHz('opt')} />楽観的な範囲まで含める（0.75〜1.77 au）</label>
          </div>
          <Count i={1} />
          <Dropped i={1} />
        </li>
        <li class="card">
          <h2>{stages[2]!.title}</h2>
          <p>気圧がないと、水は液体のままでいられず蒸発してしまいます。人間も、0.063気圧を下回ると体液が沸騰します。月のように「岩石＋ハビタブルゾーン内」でも大気のない天体は、ここで外れます。系外惑星の大気はほとんど分かっていません。</p>
          <div class="opts">
            <label class="chk"><input type="radio" name="atm" checked={atm === 'notAirless'} onChange={() => setAtm('notAirless')} />大気がないと分かっている天体だけ除く</label>
            <label class="chk"><input type="radio" name="atm" checked={atm === 'known'} onChange={() => setAtm('known')} />大気が確認されている天体だけ残す</label>
          </div>
          <Count i={2} />
          <Dropped i={2} />
        </li>
        <li class="card">
          <h2>{stages[3]!.title}</h2>
          <p>光の速さでも、最も近い系外惑星まで約4.2年かかります。光速の0.01%（約30 km/s）なら約4万年です。</p>
          <div class="opts">
            {DIST.map((d) => (
              <label class="chk"><input type="radio" name="dist" checked={dist === d.v} onChange={() => setDist(d.v)} />{d.label}</label>
            ))}
          </div>
          <Count i={3} />
          <Dropped i={3} />
        </li>
      </ol>

      {results && (
        <section>
          <h2>候補の物件（{finalRows.length.toLocaleString('ja-JP')} 件・近い順）</h2>
          {finalRows.length === 0 ? (
            <p class="card">条件に合う物件はありません。上の条件をゆるめてみてください。</p>
          ) : (
            <ul class="res-list">{finalRows.slice(0, 60).map((r) => <RowItem r={r} />)}</ul>
          )}
          {finalRows.length > 60 && <p class="small muted">上位60件を表示しています。すべて見るには<a href={u('/search/')}>物件検索</a>を使ってください。</p>}
        </section>
      )}
    </div>
  );
}

const CSS = `
.stages{list-style:none;padding:0;margin:0 0 24px;display:grid;gap:12px}
.stages h2{margin-top:0;font-size:1.15rem}
.stages p{margin-bottom:8px}
.opts{display:flex;flex-wrap:wrap;gap:4px 0;margin:4px 0 8px}
.count{font-size:1.05rem;margin:8px 0 4px}
.dropped{color:var(--ink-2);margin:0}
.chk{white-space:normal!important}
`;
