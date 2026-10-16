# CONTRIBUTING

LTタイムキーパーの開発に関する情報です。使い方は [README.md](README.md) を参照してください。

## 受け付け方針

- 不具合の報告や要望は、GitHub の Issue で受け付けます
- プルリクエストを送る前に、Issue で内容を相談してください。仕様（画面構成・色・文言）は `roadmap/specs/` に確定したものがあり、これを変える提案は、Issue での合意が先になります
- ライセンスは [Apache License 2.0](LICENSE) です。プルリクエストを送ることは、その内容が同じライセンスで提供されることに同意したものとして扱います

## 開発環境

- [Bun](https://bun.sh/) 1.4.x（ローカル・CI・Cloudflare Pages とも同じ系列）
- Node.js は不要です。ブラウザの自動操作（e2e）には Playwright のブラウザを使います（`bun run test` が入れます）

## セットアップ

```sh
bun install
bun run dev
```

## 確認・テスト

```sh
bun run check:tokens   # トークンの一致と、色・寸法の直書き、文字色の状態色（-text）を検査
bun run check          # 型検査（svelte-check、Service Worker の tsc）
bun run test:unit      # 単体テスト（Vitest。監視モード。1回だけなら末尾に --run）
bun run test           # 単体テスト（1回）と e2e（Playwright）
```

- `bun run test` の e2e は、実行前に Playwright のブラウザを入れ、ビルドしてプレビューを起動します
- 値（色・サイズ・形）の正本は `src/lib/theme/tokens.css` です。コードに値を直書きせず、トークンを参照してください。`tokens.css` は `roadmap/specs/` の最新版と一致させます（`check:tokens` が検査します）

## ビルド

```sh
bun run build     # 静的サイトを build/ に出力
bun run preview   # build/ をローカルで確認
```

## アイコン生成

アイコン一式・OGP 画像・`manifest.webmanifest` は、`roadmap/specs/` の最新版のマスターSVGとトークンから生成します。

```sh
bun run gen:icons
```

出力は `static/icons/` と `static/manifest.webmanifest` で、生成物はリポジトリに含めます（CI では生成しません）。マスターSVGやトークンを更新したときに実行し、`app.html` の `theme-color` も合わせて確認してください。

## リリース

1. `CHANGELOG.md`（[Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) 形式）に変更を書き、`package.json` の `version` を上げます（バージョンの表記は `package.json` だけです）
2. `main` にコミットして push し、`v*` タグを push します
3. GitHub Actions（`.github/workflows/release.yml`）が `check:tokens`・`check`・`test`・`build` を通し、`build/` の zip を添付したドラフトリリースを作ります
4. ドラフトリリースの内容を確認して公開します

公開先（https://lt.rinontech.com/）へのデプロイは、Cloudflare Pages の GitHub 連携で行います（ビルドコマンド `bun run build`、出力 `build`、`BUN_VERSION=1.4.3`）。

## リポジトリ構成

```
src/
├─ app.html            起動画面（S00）の枠、アイコンのスプライト、メタ情報
├─ routes/             画面の切り替え（設定 ⇄ 計測）
├─ service-worker/     事前キャッシュと更新
└─ lib/
   ├─ core/            タイマー・ベル・時刻（純粋なTS）
   ├─ settings/        計測の設定（持ち時間・ベル・表示名）
   ├─ session/         計測セッション
   ├─ output/          音と振動
   ├─ device/          スリープ防止・全画面
   ├─ pwa/             更新のお知らせ
   ├─ theme/           tokens.css・base.css
   └─ ui/              部品（parts）と画面（screens）
scripts/               check_tokens.ts・gen_icons.ts
e2e/                   Playwright のテスト
static/                アイコン一式・manifest
docs/brand/            ブランド資料とマスターSVGの写し
roadmap/               仕様・設計・実装計画・検証の記録
```

`roadmap/` の `specs/` に仕様（スペックシート・モック・トークン・ブランド資料・マスターSVG）の最新版、`planning_dialog/` に設計・実装計画・検証の最新版、`development/` に修正の記録を置いています。
