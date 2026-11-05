/**
 * Tier-A hand-written listing copy (段階A).
 * Every fact stated here is backed by a value in data/normalized or by one of the `refs`
 * (ids from CURATED_SOURCES or data/normalized/sources.json). Wording is original; the reference
 * videos are only credited as inspiration.
 */
export interface CuratedEntry {
  nameJa?: string;
  /** one factual sentence shown under the name */
  lead: string;
  origin?: string;
  pros: string[];
  cons: string[];
  earthLife?: string[];
  changelog?: { date: string; text: string }[];
  video?: 'planets' | 'dwarfs' | 'exoplanets';
  refs?: string[];
}

export const CURATED_SOURCES: Record<string, { label: string; url: string }> = {
  'nasa-mercury': { label: 'NASA Science: Mercury Facts', url: 'https://science.nasa.gov/mercury/facts/' },
  'nasa-venus': { label: 'NASA Science: Venus Facts', url: 'https://science.nasa.gov/venus/venus-facts/' },
  'nasa-mars': { label: 'NASA Science: Mars Facts', url: 'https://science.nasa.gov/mars/facts/' },
  'nasa-jupiter': { label: 'NASA Science: Jupiter Facts', url: 'https://science.nasa.gov/jupiter/jupiter-facts/' },
  'nasa-saturn': { label: 'NASA Science: Saturn Facts', url: 'https://science.nasa.gov/saturn/facts/' },
  'nasa-saturn-moons': { label: 'NASA Science: Saturn Moons', url: 'https://science.nasa.gov/saturn/moons/' },
  'nasa-jupiter-moons': { label: 'NASA Science: Jupiter Moons', url: 'https://science.nasa.gov/jupiter/moons/' },
  'nasa-uranus': { label: 'NASA Science: Uranus Facts', url: 'https://science.nasa.gov/uranus/facts/' },
  'nasa-neptune': { label: 'NASA Science: Neptune Facts', url: 'https://science.nasa.gov/neptune/neptune-facts/' },
  'nasa-ceres': { label: 'NASA Science: Ceres Facts', url: 'https://science.nasa.gov/dwarf-planets/ceres/facts/' },
  'nasa-pluto': { label: 'NASA Science: Pluto Facts', url: 'https://science.nasa.gov/dwarf-planets/pluto/facts/' },
  'nasa-eris': { label: 'NASA Science: Eris', url: 'https://science.nasa.gov/dwarf-planets/eris/' },
  'nasa-makemake': { label: 'NASA Science: Makemake', url: 'https://science.nasa.gov/dwarf-planets/makemake/' },
  'nasa-haumea': { label: 'NASA Science: Haumea', url: 'https://science.nasa.gov/dwarf-planets/haumea/' },
  'nasa-titan': { label: 'NASA Science: Titan Facts', url: 'https://science.nasa.gov/saturn/moons/titan/facts/' },
  'nasa-europa': { label: 'NASA Science: Europa', url: 'https://science.nasa.gov/jupiter/moons/europa/' },
  'nasa-enceladus': { label: 'NASA Science: Enceladus', url: 'https://science.nasa.gov/saturn/moons/enceladus/' },
  'nasa-ganymede': { label: 'NASA Science: Ganymede', url: 'https://science.nasa.gov/jupiter/moons/ganymede/' },
  'nasa-io': { label: 'NASA Science: Io', url: 'https://science.nasa.gov/jupiter/moons/io/' },
  'nasa-callisto': { label: 'NASA Science: Callisto', url: 'https://science.nasa.gov/jupiter/moons/callisto/' },
  'nasa-triton': { label: 'NASA Science: Triton', url: 'https://science.nasa.gov/neptune/moons/triton/' },
  'nasa-phobos': { label: 'NASA Science: Phobos', url: 'https://science.nasa.gov/mars/moons/phobos/' },
  'nasa-miranda': { label: 'NASA Science: Miranda', url: 'https://science.nasa.gov/uranus/moons/miranda/' },
};

const FC = '2026-11-01';

export const CURATED: Record<string, CuratedEntry> = {
  // ───────────── 基準
  earth: {
    lead: '比較の基準。他の天体の値は地球を1として表示しています。',
    pros: ['窒素78%・酸素21%の大気があり、装備なしで呼吸できる', '平均気温15°C、気圧1気圧', '保守的なハビタブルゾーン（0.95〜1.68 au）の内側にある'],
    cons: [],
    refs: ['nssdc-earth'],
  },
  sun: {
    lead: '太陽系の中心にある恒星。降り立てる地面はありません。',
    pros: ['質量は地球の約33万倍', '半径は地球の約109倍'],
    cons: ['有効温度は5,772 K', '地面がない'],
    refs: ['nssdc-sun'],
  },
  moon: {
    nameJa: '月',
    lead: '地球から約38万km。ハビタブルゾーン内にありますが、大気はほぼありません。',
    pros: ['重力は地球の約0.16倍'],
    cons: ['大気はほぼなく（夜間で約3×10⁻¹⁵ bar）、宇宙服なしでは約10秒で意識を失う', '赤道の温度は95 K〜390 K（約−178°C〜117°C）と寒暖差が激しい'],
    changelog: [{ date: FC, text: '動画（系外惑星編）の「岩石＋ハビタブルゾーンだけだと月もヒットする」という指摘のとおり、本サイトの検索でも大気の条件を加えると外れます。' }],
    video: 'exoplanets',
    refs: ['nssdc-moon'],
  },

  // ───────────── 惑星編
  mercury: {
    lead: '太陽に最も近い惑星。大気はほぼなく、太陽側は最高約450°Cになります。',
    origin: 'ローマ神話でいちばん足の速い神、メルクリウスにちなむ（NASA）。',
    pros: ['1年（公転周期）は約88日'],
    cons: ['大気はほぼ真空（5×10⁻¹⁵ bar 以下）', '太陽側は590〜725 K（約320〜450°C）。熱が逃げやすく寒暖差が大きい', '表面はクレーターだらけ'],
    earthLife: ['日の出から次の日の出までは約176地球日で、1年（約88日）より長い。'],
    video: 'planets',
    refs: ['nssdc-mercury', 'nasa-mercury'],
  },
  venus: {
    lead: '大きさと質量は地球に近い惑星。地表は約92気圧・平均464°Cです。',
    origin: 'ローマ神話の愛と美の女神ウェヌス（ギリシャ神話のアフロディーテ）にちなむ（NASA）。',
    pros: ['地球から近い', '大きさ・重さが地球に近い（重力は地球の約0.9倍）'],
    cons: ['大気の96.5%が二酸化炭素で、強い温室効果により平均464°C', '地表の気圧は92 bar（水深約900 mの水圧に相当）', '自転が逆向きで、1日（太陽日）は約117地球日'],
    earthLife: ['平均気温は水星より高く、太陽系の惑星で最も高い。'],
    video: 'planets',
    refs: ['nssdc-venus', 'nasa-venus'],
  },
  mars: {
    lead: '1日は約24.7時間。保守的なハビタブルゾーン（0.95〜1.68 au）の内側を回っています。',
    origin: 'ローマ神話の戦いの神マルスにちなむ。赤い色が血を連想させたため（NASA）。',
    pros: ['1日は約24.7時間、自転軸の傾きは25.2°で、地球と似た季節がある', '水は極域の地下などに氷として存在する', 'フォボスとダイモス、2つの衛星がある'],
    cons: ['気圧は約0.006 bar。体液が沸騰する0.063 barを大きく下回り、与圧服が必要', '大気は二酸化炭素95%', '平均気温は約−59°C（214 K）'],
    earthLife: ['赤く見えるのは、土に含まれる鉄が酸化しているため（NASA）。'],
    changelog: [
      { date: FC, text: '動画（惑星編）の「水を持参しなくてOK」について：水は主に氷として存在し、大気が薄すぎて液体の水は地表に長くとどまれません（NASA）。' },
      { date: FC, text: '動画（系外惑星編）では「火星はハビタブルゾーンに入っていない」とされましたが、Kopparapu ら（2013, 2014）の保守的なハビタブルゾーン（0.95〜1.68 au）では、火星（1.52 au）は内側です。' },
    ],
    video: 'planets',
    refs: ['nssdc-mars', 'nasa-mars', 'kopparapu2014'],
  },
  jupiter: {
    lead: '太陽系最大の惑星。直径は地球の約11倍で、固体の地表はありません。',
    origin: 'ローマ神話の神々の王ユピテルにちなむ（NASA）。',
    pros: ['衛星は115個（NASA Science によると IAU が公式に認めた数。JPL の一覧も115個）'],
    cons: ['地面がない。水素とヘリウムの大気が深くまで続く', '強い磁場が荷電粒子を加速し、内側の衛星は強い放射線を受ける（NASA）', '1気圧面でも約−108°C'],
    changelog: [{ date: FC, text: '動画（惑星編）の「衛星4つ」は大きなガリレオ衛星の数。総数は2026年時点で115個です（NASA Science、JPL）。' }],
    video: 'planets',
    refs: ['nssdc-jupiter', 'nasa-jupiter', 'nasa-jupiter-moons'],
  },
  saturn: {
    lead: '平均密度は0.687 g/cm³で、太陽系の惑星で唯一水より小さい値です。衛星は293個。',
    origin: 'ローマ神話の農耕と富の神サトゥルヌス（ユピテルの父）にちなむ（NASA）。',
    pros: ['衛星は293個（2026年8月時点、NASA）', '環がある'],
    cons: ['地面がない', '1気圧面で約−139°C'],
    changelog: [{ date: FC, text: '動画（惑星編）の「衛星60個」は古い数値です。2026年8月時点で293個が確認されています（NASA Science、JPL）。NASA Planetary Fact Sheet の比較表は274個のままです。' }],
    video: 'planets',
    refs: ['nssdc-saturn', 'nasa-saturn', 'nasa-saturn-moons'],
  },
  uranus: {
    lead: '自転軸が97.8°傾いた惑星。極では昼と夜がそれぞれ約42年続きます。',
    origin: 'ギリシャ神話の天空の神ウラノスにちなむ。発見者ハーシェルは国王の名を付けようとしたが、ボーデの案が採用された（NASA）。',
    pros: ['自転軸が97.8°傾いていて、季節の変化が極端', '最も明るいときは5.38等で、空が暗ければ肉眼で見える'],
    cons: ['地面がない', '1気圧面で約−197°C', '公転周期は約84年。極では昼と夜が約42年ずつ'],
    changelog: [{ date: FC, text: '動画（惑星編）の「肉眼ではほぼ見えない」について：最も明るいときは5.38等で、空が暗ければ肉眼で見える明るさです（NASA Uranus Fact Sheet）。' }],
    video: 'planets',
    refs: ['nssdc-uranus', 'nasa-uranus'],
  },
  neptune: {
    lead: '数学的な予測から見つかった最初の惑星。太陽から最も遠い惑星です。',
    origin: 'ローマ神話の海の神ネプトゥヌスにちなむ（NASA）。',
    pros: ['観測より先に、計算で位置が予測された（NASA）'],
    cons: ['地面がない', '1気圧面で約−201°C（72 K）', '公転周期は約164年'],
    changelog: [{ date: FC, text: '動画（惑星編）の「−218°C」は、NASA Neptune Fact Sheet では1気圧面で72 K（−201°C）です。' }],
    video: 'planets',
    refs: ['nssdc-neptune', 'nasa-neptune'],
  },

  // ───────────── 準惑星編
  ceres: {
    lead: '小惑星帯にある準惑星。準惑星の中で太陽に最も近い軌道を回ります。',
    origin: 'ローマ神話の穀物と収穫の女神ケレスにちなむ。cereal（シリアル）の語源（NASA）。',
    pros: ['軌道長半径は約2.77 au', '水が存在し、生命の痕跡を探す対象のひとつ（NASA）', '分類は「惑星→小惑星→準惑星」と変わってきた'],
    cons: ['直径は939 kmで、地球の約7%', '重力は地球の約0.03倍'],
    video: 'dwarfs',
    refs: ['sbdb:1', 'nasa-ceres'],
  },
  pluto: {
    lead: '1930年に発見された元・第9惑星。窒素を主成分とする薄い大気があります。',
    origin: '1930年、英国オックスフォードの11歳ベネチア・バーニーが、ローマ神話の冥界の神の名を提案した（NASA）。',
    pros: ['軌道が楕円で、一時的に海王星より太陽に近づく（近日点 44.4億km < 海王星の近日点 44.7億km）', '衛星が5個'],
    cons: ['平均気温は約−225°C', '1日は約6.4地球日（153時間）', '大気は約13マイクロバールで、宇宙服なしでは真空と同じ'],
    changelog: [{ date: FC, text: '動画（準惑星編）の「空気がない」について：窒素99%の非常に薄い大気があり、表面気圧は約13マイクロバールです（NASA Pluto Fact Sheet）。' }],
    video: 'dwarfs',
    refs: ['nssdc-pluto', 'nasa-pluto'],
  },
  eris: {
    lead: '太陽から約38〜98 auの細長い軌道を回る準惑星。',
    origin: 'ギリシャ神話の不和と争いの女神エリスにちなむ（NASA）。',
    pros: ['冥王星とほぼ同じ大きさ（直径 約2,400 km、NASA）', '近日点38.2 au・遠日点97.7 au（JPL）'],
    cons: ['離心率0.438の細長い軌道（JPL）', '公転周期は約561年（JPL）。NASA Science では557年', '表面温度は約−217〜−243°C（NASA）'],
    changelog: [{ date: FC, text: '動画（準惑星編）の離心率0.4418・公転556年は、JPL SBDB では 0.438・約561年です。' }],
    video: 'dwarfs',
    refs: ['sbdb:136199', 'nasa-eris'],
  },
  makemake: {
    lead: 'カイパーベルトにある準惑星。直径は約1,430 kmです。',
    origin: 'ラパ・ヌイ（イースター島）の豊穣の神にちなむ（NASA）。',
    pros: ['太陽からの平均距離は約45.8 au（NASA）'],
    cons: ['表面は極寒で、生命が存在する可能性は低い（NASA）', '公転周期は約305年（NASA）'],
    changelog: [{ date: FC, text: '動画（準惑星編）では創造神とされていましたが、NASA Science では「豊穣の神」と説明されています。' }],
    video: 'dwarfs',
    refs: ['sbdb:136472', 'nasa-makemake'],
  },
  haumea: {
    lead: '約3.9時間で1回転する、細長い形の準惑星。環があります。',
    origin: 'ハワイの豊穣の女神ハウメアにちなむ（NASA）。',
    pros: ['大型天体のなかでも特に速い自転（約3.9154時間、JPL）', '太陽系外縁天体で初めて環が見つかった（Ortiz ら 2017）'],
    cons: ['最長軸は2,322 km以上で、極端に細長い（Ortiz ら 2017）', '長軸の端では遠心力が重力と同じくらい大きくなり、立つ場所で体重が大きく変わる（概算）'],
    earthLife: ['遠心加速度の概算：自転周期3.9154時間と半径1,161 kmから約0.23 m/s²。地球の赤道（約0.034 m/s²）の約7倍です。'],
    changelog: [
      { date: FC, text: '動画（準惑星編）の「直径1,400 km」は、Ortiz ら（2017）では最長軸2,322 km以上です。' },
      { date: FC, text: '動画で自転軸の傾きとされた28.2°は、JPL SBDB の軌道傾斜角 i の値です。' },
      { date: FC, text: '動画の「体重が約2%変わる」は、上の概算から2%よりはるかに大きいと考えられます。' },
    ],
    video: 'dwarfs',
    refs: ['sbdb:136108', 'ortiz2017', 'nasa-haumea'],
  },

  // ───────────── 系外惑星編
  'corot-7-b': {
    lead: '公転周期は約20.5時間。恒星直下点の温度は約2,474 Kと推定されています（Léger ら 2011）。',
    pros: ['半径は地球の約1.7倍', 'Léger ら（2011）は「初めて性質が調べられた岩石のスーパーアース」としている'],
    cons: ['恒星からの距離は地球と太陽の約1/59（0.017 au）', '恒星直下点は約2,474 K（Léger ら 2011 のモデル）。岩石が融けて溶岩の海になると推定されている', 'いつも同じ面を恒星に向けている可能性が高い（Léger ら 2011）'],
    changelog: [
      { date: FC, text: '動画（系外惑星編）の「約490光年」は、NASA Exoplanet Archive の現在値では約522光年（159.9 pc）です。' },
      { date: FC, text: '最新の半径1.68（Stassun ら 2017）は、本サイトの岩石惑星の目安（1.6、Rogers 2015）をわずかに超えるため「岩石でない可能性」に分類されます。Léger ら（2011）は半径1.58として岩石惑星と推定しています。' },
    ],
    video: 'exoplanets',
    refs: ['leger2011'],
  },
  'proxima-cen-b': {
    nameJa: 'プロキシマ・ケンタウリb',
    lead: '太陽系に最も近い系外惑星。距離は約4.24光年です。',
    pros: ['保守的なハビタブルゾーンの内側', '最小質量は地球の約1.06倍'],
    cons: ['恒星からの極端紫外線は地球の約30倍、X線は約250倍（Ribas ら 2016）', '大気があるかどうか分かっていない', '半径は測定されていない（アーカイブの値は質量からの計算値）'],
    changelog: [
      { date: FC, text: '動画（系外惑星編）の「大きさは地球の1.1倍」は実測値ではありません。トランジットが観測されていないため、半径は未測定です。' },
      { date: FC, text: '動画の「恒星からの距離は地球の1/2」は、実際は0.0485 au（約1/21）です。' },
      { date: FC, text: '動画の「放射線が地球の約60倍」の出典は確認できませんでした。Ribas ら（2016）は極端紫外線30倍、X線250倍としています。' },
    ],
    video: 'exoplanets',
    refs: ['ribas2016'],
  },
  'kepler-22-b': {
    nameJa: 'ケプラー22b',
    lead: '公転周期は約290日で、保守的なハビタブルゾーンの内側。半径は地球の2.1倍で、岩石惑星かどうかは分かっていません。',
    pros: ['保守的なハビタブルゾーンの内側', '公転周期は289.9日'],
    cons: ['半径は地球の2.1倍。岩石惑星の目安（1.6倍）を超えている', '質量は上限値（9.1倍以下）しか分かっていない', '約635光年と遠い'],
    changelog: [
      { date: FC, text: '動画（系外惑星編）の「22°C」は温室効果を地球並みと仮定した推定です。放射平衡温度は279 K（約6°C、Bonomo ら 2023）です。' },
      { date: FC, text: '半径2.10（Bonomo ら 2023）のため、本サイトでは「岩石でない可能性」に分類しています。' },
    ],
    video: 'exoplanets',
  },
  'trappist-1-e': {
    lead: '半径は地球の0.92倍。同じ恒星系の e・f・g が保守的なハビタブルゾーンの内側にあります。',
    pros: ['半径は地球の0.92倍、表面重力は約0.82倍', '同じ恒星系の e・f・g が保守的なハビタブルゾーンの内側', 'JWST の観測で、窒素を主成分とする大気の可能性が残っている'],
    cons: ['雲のある水素主体の大気は否定されたが、大気のない岩石の可能性も同じくらい残る', '主星の温度（2,566 K）がハビタブルゾーンのモデルの適用範囲（2,600 K〜）をわずかに下回るため、判定は参考値', '約40.5光年'],
    changelog: [{ date: FC, text: '動画（系外惑星編）の「重力0.7倍」は質量の値です。質量0.692・半径0.920（Agol ら 2021）から、表面重力は約0.82倍になります。' }],
    video: 'exoplanets',
    refs: ['espinoza2025', 'glidden2025'],
  },
  'teegardens-star-b': {
    nameJa: 'ティーガーデン星b',
    lead: '約12.5光年。本サイトの計算では ESI が最も高い惑星です（0.968）。',
    pros: ['ESI（PHL 方式、本サイト計算）は0.968で、掲載している天体の中で最も高い', '最小質量は地球の約1.16倍', '受け取る光の量は地球の約1.08倍'],
    cons: ['保守的なハビタブルゾーンよりわずかに内側で、楽観的なハビタブルゾーンにだけ入る', '半径も大気も測定されていない'],
    changelog: [{ date: FC, text: '動画（系外惑星編）の「ESI 0.93」と本サイトの値（0.968）の違いは、算出に使う値と式の違いによるものです。PHL の現在のカタログ値は未照合です。' }],
    video: 'exoplanets',
  },

  // ───────────── 衛星編
  titan: {
    lead: '厚い大気を持つ唯一の衛星。本サイトの分類では、地球以外で唯一与圧服が要りません。',
    pros: ['気圧は地球より約60%高い（NASA）', '地球以外で唯一、地表に液体（メタンやエタンの川・湖・海）がある（NASA）'],
    cons: ['約−179°Cで、水の氷が岩石の役割をする（NASA）', '大気は窒素が主成分で、呼吸できる酸素はない'],
    refs: ['nasa-titan'],
  },
  europa: {
    lead: '氷の殻の下に塩水の海があると考えられている衛星。木星の強い放射線を受けます。',
    pros: ['氷の殻の下に塩水の海があると考えられ、地球の海の約2倍の水がある（NASA）', '生命が存在しうる環境を探す有力候補（NASA）'],
    cons: ['木星の磁場が生む強い放射線を受ける（NASA）', '大気はほぼなく、宇宙服なしでは真空と同じ'],
    refs: ['nasa-europa', 'nasa-jupiter'],
  },
  enceladus: {
    lead: '地下の海の水を、間欠泉として宇宙へ噴き出している衛星。',
    pros: ['地下の塩水の海が間欠泉として噴き出し、探査機が直接サンプルを採れる（NASA）'],
    cons: ['日光をよく反射するため表面は約−201°C（NASA）', '大気はほぼなく、宇宙服なしでは真空と同じ'],
    refs: ['nasa-enceladus'],
  },
  io: {
    lead: '太陽系で最も火山活動が活発な天体。',
    pros: ['太陽系で最も火山活動が活発で、溶岩の噴水は高さ数十kmに達する（NASA）'],
    cons: ['木星の強い放射線を受ける（NASA）', '大気はほぼなく、宇宙服なしでは真空と同じ'],
    refs: ['nasa-io', 'nasa-jupiter'],
  },
  ganymede: {
    lead: '太陽系最大の衛星で、水星より大きい。自身の磁場を持っています。',
    pros: ['自身の磁場を持つ唯一の衛星で、オーロラがある（NASA）'],
    cons: ['大気はほぼなく、宇宙服なしでは真空と同じ'],
    refs: ['nasa-ganymede'],
  },
  callisto: {
    lead: '太陽系で最もクレーターの多い天体。',
    pros: ['木星で2番目、太陽系で3番目に大きい衛星（NASA）'],
    cons: ['太陽系で最もクレーターの多い天体（NASA）', '大気はほぼなく、宇宙服なしでは真空と同じ'],
    refs: ['nasa-callisto'],
  },
  triton: {
    lead: '惑星の自転と逆向きに公転する、唯一の大型衛星。',
    pros: ['間欠泉があり、今も地質活動がある（NASA）'],
    cons: ['表面温度は約−235°C（ボイジャー2号の観測、NASA）', '大気は窒素主体でごく薄い'],
        refs: ['nasa-triton'],
  },
  phobos: {
    lead: '100年に約1.8 mずつ火星に近づいている衛星。',
    pros: [],
    cons: ['100年あたり約1.8 mの速さで火星に近づいている。約5,000万年後には火星に衝突するか、ばらばらになって環になる（NASA）'],
    refs: ['nasa-phobos'],
  },
  miranda: {
    lead: '深さがグランドキャニオンの最大12倍に達する谷がある衛星。',
    pros: ['重力が小さく崖が高いため、最も高い崖から落とした石が下に着くまで約10分（NASA）'],
    cons: ['大気はほぼなく、宇宙服なしでは真空と同じ'],
    refs: ['nasa-miranda'],
  },

  // ───────────── 外縁天体・小天体
  sedna: {
    lead: '軌道長半径は約544 au。太陽から非常に遠い軌道を回っています。',
    pros: ['太陽からの平均距離が非常に遠い（軌道長半径 約544 au、JPL）'],
    cons: ['放射平衡温度でも約12 K（−261°C）', '大きさは JPL SBDB に登録されていない'],
    refs: ['sbdb:90377'],
  },
  vesta: {
    lead: '小惑星帯の大型の小惑星。3軸は約569 × 554 × 453 kmです。',
    pros: ['平均直径は約523 km（JPL）', '公転周期は約3.6年'],
    cons: ['重力は地球の約0.026倍', '大気はなく、宇宙服なしでは真空と同じ'],
    refs: ['sbdb:4'],
  },
  '1p-halley': {
    lead: '約76年ごとに太陽に近づく周期彗星。',
    pros: ['公転周期は約75.8年（JPL）', '周期彗星の番号1番（1P）'],
    cons: ['離心率0.968の極端に細長い軌道で、太陽からの距離が大きく変わる', '核は約15 × 8 km（JPL）と小さい'],
    refs: ['sbdb:1P'],
  },
  '67p-churyumov-gerasimenko': {
    lead: '公転周期6.4年の木星族彗星。重力は地球の約4万分の1です。',
    pros: ['直径 約3.4 km（JPL）'],
    cons: ['重力は地球の約0.00002倍。強く跳ぶと戻ってこられない可能性がある'],
    refs: ['sbdb:67P'],
  },
  oumuamua: {
    lead: '太陽系の外から来て通り過ぎた、最初に見つかった恒星間天体。',
    pros: ['恒星間天体の番号1番（1I）'],
    cons: ['離心率1.2の双曲線軌道で、太陽系を通り過ぎるだけ。再訪はできない'],
    refs: ['sbdb:2017 U1'],
  },

  // ───────────── 系外惑星（追加）
  'trappist-1-d': {
    lead: 'TRAPPIST-1系で、受け取る光の量が地球に最も近い惑星。',
    pros: ['受け取る光の量は地球の約1.12倍', 'ESI（本サイト計算）は0.908'],
    cons: ['楽観的なハビタブルゾーンにだけ入る', '半径は地球の0.79倍、質量は0.39倍と小柄'],
  },
  'trappist-1-f': {
    lead: 'TRAPPIST-1系の惑星。保守的なハビタブルゾーンの内側にあります。',
    pros: ['保守的なハビタブルゾーンの内側', '半径・質量とも地球に近い（1.05倍・1.04倍）'],
    cons: ['受け取る光の量は地球の約0.37倍'],
  },
  'trappist-1-g': {
    lead: 'TRAPPIST-1系の惑星。保守的なハビタブルゾーンの内側にあります。',
    pros: ['保守的なハビタブルゾーンの内側', '半径は地球の1.13倍'],
    cons: ['受け取る光の量は地球の約0.25倍'],
  },
  'toi-700-d': {
    lead: '保守的なハビタブルゾーン内の惑星のうち、本サイトの計算で ESI が最も高い惑星。',
    pros: ['保守的なハビタブルゾーンの内側', 'ESI は0.925（本サイト計算）', '半径は地球の1.15倍で、岩石惑星の可能性が高い'],
    cons: ['約102光年', '大気は分かっていない'],
  },
  'ross-128-b': {
    nameJa: 'ロス128b',
    lead: '約11光年の距離にある惑星。',
    pros: ['最小質量は地球の約1.4倍'],
    cons: ['楽観的なハビタブルゾーンにだけ入る', '半径は測定されていない'],
  },
  'kepler-452-b': {
    nameJa: 'ケプラー452b',
    lead: '太陽に似た恒星を約385日で公転する惑星。',
    pros: ['主星の温度は5,757 Kで太陽に近い', '公転周期は約385日'],
    cons: ['半径1.63倍で、岩石惑星の目安をわずかに超える', '約1,800光年と遠い'],
  },
  'kepler-186-f': {
    nameJa: 'ケプラー186f',
    lead: '保守的なハビタブルゾーン内にある、地球に近い大きさの惑星。',
    pros: ['保守的なハビタブルゾーンの内側', '半径は地球の1.17倍'],
    cons: ['受け取る光の量は地球の約0.3倍', '約579光年'],
  },
  'lhs-1140-b': {
    lead: '保守的なハビタブルゾーン内の惑星。半径は地球の1.73倍、質量は5.6倍です。',
    pros: ['保守的なハビタブルゾーンの内側', '約49光年'],
    cons: ['半径・質量とも岩石惑星の目安を超える'],
  },
  'k2-18-b': {
    lead: '受け取る光の量は地球とほぼ同じ（1.005倍）。半径は地球の2.4倍です。',
    pros: ['受け取る光の量は地球の約1.005倍'],
    cons: ['半径2.37倍・質量8.9倍で、岩石惑星ではない可能性が高い', '楽観的なハビタブルゾーンにだけ入る'],
  },
  'kelt-9-b': {
    lead: '放射平衡温度が3,921 Kのガス惑星。',
    pros: ['主星は表面温度9,270 Kの高温の星'],
    cons: ['放射平衡温度は約3,650°C', '半径は地球の約22倍のガス惑星'],
  },
  '55-cnc-e': {
    nameJa: 'かに座55番星e',
    lead: '公転周期は約18時間、放射平衡温度は約1,960 Kです。',
    pros: ['約41光年と比較的近い'],
    cons: ['受け取る光の量は地球の約2,660倍'],
  },
  'hd-189733-b': {
    lead: '約2.2日で恒星を回る、約64光年先のホットジュピター。',
    pros: ['約64光年と比較的近い'],
    cons: ['半径は地球の約13倍のガス惑星で地面がない', '放射平衡温度1,209 K'],
  },
  '51-peg-b': {
    nameJa: 'ペガスス座51番星b',
    lead: '1995年発見。太陽と同じG型の恒星（G5V）を4.2日で回るガス惑星。',
    pros: ['最初期に見つかった系外惑星のひとつ'],
    cons: ['公転4.2日のホットジュピター', '放射平衡温度は約1,330 K'],
  },
  'psr-b1257-12-c': {
    lead: 'パルサーの信号の周期のずれ（パルサー・タイミング法）で見つかった惑星。',
    pros: ['1992年に発見された、初期の系外惑星'],
    cons: ['主星はパルサーで、ハビタブルゾーンのモデルを適用できない'],
  },
  'kepler-16-b': {
    nameJa: 'ケプラー16b',
    lead: '2つの恒星のまわりを公転する惑星。',
    pros: ['2つの恒星のまわりを回る惑星として報告された（Doyle ら 2011）'],
    cons: ['半径は地球の約8.4倍のガス惑星で地面がない', '受け取る光の量は地球の約0.25倍'],
    refs: ['ref:DOYLE_ET_AL__2011'],
  },
  'barnard-b': {
    nameJa: 'バーナード星b',
    lead: '約6光年。2024年に報告された惑星です。',
    pros: ['惑星が確認されている恒星系で、プロキシマ・ケンタウリの次に近い（約5.96光年、本サイト掲載データ）'],
    cons: ['放射平衡温度は約438 K（約165°C）', 'ハビタブルゾーンより内側'],
  },
};
