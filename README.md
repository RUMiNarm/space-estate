# 宇宙物件ガイド

住めない星も含め、一次ソースにデータがある天体（惑星・準惑星・衛星・小天体・彗星・確認済み系外惑星 すべて）を「物件」として紹介し、
**生身で放り出されたら何秒もつか**・**どんな装備なら住めるか**を判定する静的サイトです。企画の背景と仕様は [docs/PLAN.md](docs/PLAN.md)。

## コマンド（pnpm）

```bash
pnpm install
pnpm run data:fetch      # 一次ソースから data/raw/ にスナップショットを取得（ネットワークが必要）
pnpm run data:normalize  # data/normalized/*.json と public/data/index.json を生成
pnpm test                # 判定ロジックとデータ整合性のテスト
pnpm check               # astro check（型チェック）
pnpm build               # 静的サイトを dist/ に生成（約1.2万ページ）
pnpm preview             # ビルド結果を確認
node scripts/e2e/smoke.mjs http://127.0.0.1:4321   # preview 起動中に Playwright で表示確認
```

クラウド環境など Node の `fetch` が `HTTPS_PROXY` を読まない環境のため、`data:fetch` は `NODE_USE_ENV_PROXY=1` を付けて実行します（Node 22.21 以上）。

## 3D 表示（トップページ）

`src/explorer/` が Three.js で太陽系・衛星・近くの恒星・系外惑星系・天の川銀河（イメージ）を描きます。データは `scripts/normalize/universe.ts` が作る `public/data/universe-solar.json` と `universe-stars.json`。軌道計算（`src/explorer/orbits.ts`）は JPL Horizons の位置と照合するテストがあります。
操作テスト：`node scripts/e2e/explorer.mjs http://127.0.0.1:4321`（preview 起動中）。カード一覧は `/list/` に移しました。

## データの流れ

| 段階 | 場所 | 内容 |
|---|---|---|
| 取得 | `scripts/fetch/all.ts` → `data/raw/` | NASA NSSDC Fact Sheets、JPL SSD（衛星）、JPL SBDB API（小天体）、NASA Exoplanet Archive TAP（`pscomppars` 全件）。`manifest.json` に URL と取得日時 |
| 正規化 | `scripts/normalize/*.ts` → `data/normalized/` | 単位をそろえ、全数値に出典 id と確度（実測／計算値／本サイト計算／不明）を付与。ハビタブルゾーン・ESI・生存時間・装備レベルを計算 |
| 表示 | `src/pages/` | 物件ページ（全件）、恒星系ページ、検索・ガイド付き検索・比較（Preact アイランド）、ランキング、解説、判定方法 |

- 判定ロジック：`src/lib/`（`habitableZone.ts`・`esi.ts`・`physics.ts`・`survival.ts`・`search.ts`）。式と出典は `/method/` に掲載。
- 手書きの紹介文（段階A・厳選物件）：`src/data/curated.ts`。それ以外は `src/lib/autotext.ts` がデータから生成。
- 参考動画のファクトチェック：`src/data/factcheck.ts`（`/method/#factcheck` に表示）。

## 一次ソースのルール

数値は宇宙機関・観測機関の公式データベースとファクトシート、IAU/MPC、査読論文からのみ取得します。出典のない値は表示しません（「不明」）。
`scripts/normalize/data.test.ts` が「実測・計算値には必ず存在する出典 id がある」ことを全件で検証します。

## デプロイ（GitHub Pages）

1. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする。
2. `main` に push すると `.github/workflows/deploy.yml` がテスト・型チェック・ビルドを行い、`https://<ユーザー名>.github.io/<リポジトリ名>/` に公開します。公開パスはワークフローが自動で設定します（ローカルで同じ形を試すときは `ASTRO_BASE=/<リポジトリ名>/ pnpm build`）。
3. 毎月のデータ更新（`.github/workflows/refresh-data.yml`）で Pull Request を自動作成するには、**Settings → Actions → General → Workflow permissions** で「Allow GitHub Actions to create and approve pull requests」をオンにする。

`dist/` は約1.2万ファイルです（GitHub Pages の上限 1 GB 以内）。

This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program.
