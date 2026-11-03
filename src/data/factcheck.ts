/** Fact-check of the reference videos against primary sources (checked 2026-11-01). */
export interface FactCheck {
  video: '惑星編' | '準惑星編' | '系外惑星編';
  claim: string;
  result: string;
  verdict: '古い' | '不正確' | '誤り' | '誇張' | '誤解を招く' | '過小' | 'ほぼ正しい' | '正しい' | '根拠不明' | '実測値ではない' | '単純化しすぎ' | '推定値' | '算出方法で変わる';
  slug?: string;
}

export const FACTCHECK: FactCheck[] = [
  { video: '惑星編', claim: '土星の衛星は60個', result: '293個（NASA Science「as of August 2026」、JPL SSD 発見状況一覧）。NASA Planetary Fact Sheet の比較表は274のまま。', verdict: '古い', slug: 'saturn' },
  { video: '惑星編', claim: '木星の衛星は4つ', result: '大きなガリレオ衛星が4つ。総数は115個（NASA Science「IAU が公式に認めた115個」、JPL SSD の一覧も115個）。', verdict: '不正確', slug: 'jupiter' },
  { video: '惑星編', claim: '海王星は−218°C', result: '1気圧面で72 K（−201°C）（NASA Neptune Fact Sheet）。', verdict: '不正確', slug: 'neptune' },
  { video: '惑星編', claim: '天王星は肉眼でほぼ見えない', result: '見かけの等級は平均5.57等、最大5.38等（NASA Uranus Fact Sheet）。空が暗ければ肉眼で見える。', verdict: '誇張', slug: 'uranus' },
  { video: '惑星編', claim: '火星は水を持参しなくてよい', result: '水は極域の地下などに氷として存在する。大気が薄すぎて液体の水は地表に長くとどまれない（NASA Science Mars Facts）。', verdict: '誤解を招く', slug: 'mars' },
  { video: '準惑星編', claim: '冥王星には空気がない', result: '表面気圧 約13マイクロバール、窒素99%（NASA Pluto Fact Sheet）。', verdict: '誤り', slug: 'pluto' },
  { video: '準惑星編', claim: 'ハウメアの直径は1,400 km', result: '最長軸2,322±60 km以上（Ortiz ら 2017）。NASA Science は赤道直径 約1,740 km。', verdict: '誤り', slug: 'haumea' },
  { video: '準惑星編', claim: 'ハウメアの自転軸の傾きは28.22°', result: '28.2°は軌道傾斜角 i（JPL SBDB）。', verdict: '誤り', slug: 'haumea' },
  { video: '準惑星編', claim: 'ハウメアでは体重が約2%変わる', result: '自転周期3.9154時間（JPL）と最長半径1,161 kmから、長軸端の遠心加速度は約0.23 m/s²（本サイトの概算）。2%よりはるかに大きい。', verdict: '過小', slug: 'haumea' },
  { video: '準惑星編', claim: 'マケマケは創造神の名前', result: 'NASA Science では「ラパ・ヌイの豊穣の神」。', verdict: '不正確', slug: 'makemake' },
  { video: '準惑星編', claim: 'エリスの離心率0.4418・公転556年', result: 'e = 0.438、公転 約561年（JPL SBDB）。NASA Science は557年。', verdict: 'ほぼ正しい', slug: 'eris' },
  { video: '準惑星編', claim: 'ケレスの直径は地球の約7.5%', result: '直径939.4 km（JPL SBDB）で、地球の7.4%。', verdict: '正しい', slug: 'ceres' },
  { video: '系外惑星編', claim: 'CoRoT-7b は約490光年', result: '159.9 pc ≒ 522光年（NASA Exoplanet Archive）。半径1.68倍・公転20.5時間・軌道長半径0.0170 au は動画とほぼ一致。昼側の恒星直下点は2,474±71 K（Léger ら 2011）。', verdict: '古い', slug: 'corot-7-b' },
  { video: '系外惑星編', claim: 'プロキシマbの大きさは地球の1.1倍', result: 'トランジット未観測で半径は未測定。アーカイブの1.02は質量からの計算値。最小質量は1.055倍（Suárez Mascareño ら 2025）。', verdict: '実測値ではない', slug: 'proxima-cen-b' },
  { video: '系外惑星編', claim: 'プロキシマbの恒星からの距離は地球の1/2', result: '0.0485 au（約1/21）（NASA Exoplanet Archive）。', verdict: '誤り', slug: 'proxima-cen-b' },
  { video: '系外惑星編', claim: 'プロキシマbの放射線は地球の約60倍', result: '極端紫外線は約30倍、X線は約250倍（Ribas ら 2016）。60倍の出典は確認できなかった。', verdict: '根拠不明', slug: 'proxima-cen-b' },
  { video: '系外惑星編', claim: 'ケプラー22bは岩石惑星の条件を満たす', result: '半径2.10倍、質量は上限値9.1倍（Bonomo ら 2023）。岩石惑星の目安（約1.6倍）を超える。', verdict: '誤解を招く', slug: 'kepler-22-b' },
  { video: '系外惑星編', claim: 'ケプラー22bは22°C', result: '放射平衡温度は279 K（約6°C、Bonomo ら 2023）。22°Cは温室効果を仮定した推定。', verdict: '推定値', slug: 'kepler-22-b' },
  { video: '系外惑星編', claim: 'TRAPPIST-1e の重力は地球の0.7倍', result: '0.7倍は質量（0.692）。半径0.920（Agol ら 2021）から表面重力は約0.82倍。', verdict: '誤り', slug: 'trappist-1-e' },
  { video: '系外惑星編', claim: 'TRAPPIST-1e は二次大気を持つ可能性がある', result: '雲のある水素主体の大気は3σ以上で否定。窒素主体の大気も大気なしも観測と矛盾しない（Espinoza ら 2025、Glidden ら 2025）。', verdict: '正しい', slug: 'trappist-1-e' },
  { video: '系外惑星編', claim: 'ティーガーデン星bは12.5光年・質量は地球とほぼ同じ', result: '3.83 pc ≒ 12.5光年、最小質量1.16倍（Dreizler ら 2024）。', verdict: '正しい', slug: 'teegardens-star-b' },
  { video: '系外惑星編', claim: 'ティーガーデン星bのESIは0.93', result: 'PHL の現在の ESI は「恒星からの放射量と半径（または質量）」で計算する方式。本サイトの同方式の計算では0.968。PHL のカタログ値は未照合。', verdict: '算出方法で変わる', slug: 'teegardens-star-b' },
  { video: '系外惑星編', claim: '地球は磁場がなければ大気を保てない', result: '金星は全球的な磁場がない（NASA Fact Sheet）が、表面気圧は92 bar ある。磁場は大気の流出を減らす要因のひとつ。', verdict: '単純化しすぎ', slug: 'venus' },
  { video: '系外惑星編', claim: '金星も火星もハビタブルゾーンに入っていない', result: 'Kopparapu ら（2013, 2014）の保守的なハビタブルゾーンは0.95〜1.68 au。金星（0.72 au）は外れるが、火星（1.52 au）は内側。', verdict: '誤り', slug: 'mars' },
];
