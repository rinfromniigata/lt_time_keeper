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

変更を出す前に、**checkコマンド 1 つ**を実行してください。ローカルも CI（`release.yml`）も、これを使います。

```sh
bun run check
```

次の 7 つの段を、この順に実行し、最初に失敗した段で止まります。通った段は 1 行だけ、失敗した段は失敗の部分だけを表示します（終了コードは 0 以外）。

1. 型検査（`check:types`：`svelte-kit sync`・`svelte-check`・Service Worker の `tsc`）
2. lint（`lint`：ESLint）
3. `check:tokens`：トークンの一致と、色・寸法の直書き、文字色の状態色（`-text`）を検査
4. `check:i18n`：辞書のキー・プレースホルダの一致、未使用キー、`.svelte` の文字の直書きを検査
5. 単体テスト（Vitest を 1 回）
6. build（`build/` に静的サイトを出力）
7. e2e（Playwright。6. の `build/` をそのまま使い、二重に build しません）

各段は単独でも実行できます。

```sh
bun run check:types    # 型検査
bun run lint           # ESLint（設定は eslint.config.js）
bun run check:tokens
bun run check:i18n
bun run test:unit      # 単体テスト（Vitest。監視モード。1回だけなら末尾に --run）
bun run test:e2e       # e2e。Playwright のブラウザを入れ、build してからプレビューを開く
bun run test           # 単体テスト（1回）と e2e
bun run check:watch    # 型検査の監視
```

- 単独の `bun run test:e2e` は、今までどおり build してからプレビューを開きます。checkコマンドの中では、環境変数 `LT_E2E_SKIP_BUILD` を付けて、直前の build の結果を使います（`playwright.config.ts`）
- 値（色・サイズ・形）の正本は `src/lib/theme/tokens.css` です。コードに値を直書きせず、トークンを参照してください。`tokens.css` は `roadmap/specs/` の最新版と一致させます（`check:tokens` が検査します）

## 画面の文字列（辞書）と疑似ロケール

- UI の文字列は、`src/lib/i18n/locales/ja.json`（原文）と `en.json`・`zh-Hans.json` の辞書に置き、コンポーネントから `i18n.t('キー')` で参照します。キーは機能ごとの階層をピリオドで区切り、各階層はスネークケースにします（例：`timer.pause`）。画面 ID はキーに使いません
- 文字列をつなげて文を作らず、可変部分はプレースホルダ（`{time}` など）にします。複数形は、辞書の値を `one`・`other` などの形を持つオブジェクトにします（`other` は必須）。キーボードの名前（`Space`・`Esc`・`Enter`・`F`）だけは、直書きが許されます
- キーは `'キー'` の形の文字列リテラルで書いてください（`check:i18n` が静的に拾います。組み立てたキーは未使用と判定されます）。3つの辞書のキーとプレースホルダは一致させます（欠けは型検査と `check:i18n` が止めます）
- 言語名（日本語・English・简体中文）は辞書で訳さず、常にその言語自身の表記で出します

**疑似ロケール**は、直書きの取りこぼしと、文字列が伸びたときのレイアウトの崩れを画面で見つけるための、開発時だけの言語です。`ja` の各値の前後を `［…］` で囲み、長さを約1.4倍に伸ばします（プレースホルダは残します）。

```sh
bun run dev       # 開いた URL の末尾に ?pseudo を付ける（例：http://localhost:5173/?pseudo）
```

- `［…］` で囲まれていない文字は、辞書を通っていない直書きです
- 開発サーバーか、環境変数 `VITE_PSEUDO_LOCALE=1` を付けたビルドだけで動きます。公開版には含まれず、言語の選択肢にも出ず、保存もしません
- `e2e/prefs.e2e.ts` が、公開版のビルドで `?pseudo` を付けても何も変わらないことを確かめています

## 設定の保存

端末に保存するのは、環境設定の5項目（言語・表示テーマ・音量・振動・終了の確認）だけです。持ち時間・ベル・表示名は保存しません（メモリ上だけ）。

- 保存先は `localStorage` の、キー `lt_time_keeper.prefs` の1つだけです。値は `{"v":1,"locale":…,"theme":…,"volume":…,"vibrate":…,"confirmEnd":…}` の JSON です
- キー名と形は `src/lib/storage/prefs_codec.ts` が持ちます（`app.html` の起動前のインラインスクリプトにも、この定数を渡しており、キー名を2か所に書きません）。`v` が違う値や読めない値は捨てて初期値にし、項目ごとに型や範囲が違えば、その項目だけ初期値にします
- 形を変えるときは `PREFS_VERSION` を上げ、読み込みで古い形の扱いを決めます。保存する項目を増やすときは、プライバシーポリシーと README のプライバシーの節（3言語）も直してください
- `localStorage` が使えないブラウザでは、初期値で動き、保存だけが行われません（エラーは出しません）

## ビルド

```sh
bun run build     # 静的サイトを build/ に出力
bun run preview   # build/ をローカルで確認
```

### 使用しているオープンソースソフトウェアの一覧

環境設定の「アプリ情報」に出す、使用しているオープンソースソフトウェアの一覧と、ライセンスの全文は、ビルドで自動で作ります。手で書き足しません。

- `scripts/oss_collect.ts`（Vite プラグイン）が、クライアントのバンドルに入った依存パッケージ（名前・版・ライセンス・`LICENSE*`/`NOTICE*` の全文）を集めて、`.svelte-kit/oss/packages.json` に書きます。開発時だけの依存（ESLint・Vitest など）や Service Worker は、配信物の依存ではないので対象外です
- `src/routes/oss.json/` と `src/routes/third_party_licenses.txt/` が、書き出し（prerender）のときにそれを読んで、`build/oss.json`（画面が読む一覧）と `build/third_party_licenses.txt`（ライセンスの全文。画面からのリンクは置いていません）を作ります。どちらも Service Worker が事前にキャッシュするので、オフラインでも表示できます
- 依存を足す・外すと、次のビルドで一覧が変わります。`bun run dev` では一覧は空です（確認は `bun run build` と `bun run preview`）
- ライセンスのファイルを持たないパッケージは、ビルドの警告に出て、全文の位置に「ライセンスのファイルは含まれていません」と書かれます

## 書体（Web フォント）

書体は、OS の書体ではなく Google Fonts の Web フォントを使います（Noto Sans JP・Noto Sans・Noto Sans SC、数字は JetBrains Mono）。

- **トークン**：書体名の正本は `tokens.css` の `--font-sans-ja`・`--font-sans-en`・`--font-sans-zh-hans`・`--font-digits` です。末尾の総称（`sans-serif`・`monospace`）は、読み込み前と失敗時の保険で、OS の書体は並べません。CSS や `.svelte` に書体名を直書きせず、`var(--font-sans)`・`var(--font-digits)` を使います
- **読み込み**：`src/app.html` の `<head>` に、`fonts.googleapis.com`・`fonts.gstatic.com` への `preconnect` と、4つの書体（太さ 400〜700、`display=swap`）を指定したスタイルシートの `<link>` があります。スタイルシートは `media="print"` で読み込み、取得できたら `onload` で `all` に切り替えるので、取得できなくても描画は止まりません。CJK は Google 側が `unicode-range` で分割して配信し、使う文字の分だけが読み込まれます
- **Service Worker のキャッシュ**：`src/service-worker/index.ts` が、この2つのホストだけを実行時にキャッシュします。スタイルシートは stale-while-revalidate、書体ファイルは cache-first です。版つきの事前キャッシュ（`cache-` ではじまる名前）とは別の `fonts-v1` に入れるので、アプリを更新しても書体は取り直しません。ほかの外部ホストは、キャッシュも取得もしません
- **オフライン**：書体は、**初回だけオンラインが必要**です。初回がオフラインのときは総称の書体で表示し、起動と計測は動きます。一度読み込めば、オフラインでも同じ書体で表示します
- **通信先**：このアプリの通信先は、自分のオリジンと、この2つのホストだけです。プライバシーポリシー（アプリ内、S05c）と README のプライバシーの節に、書体の読み込みで Google に接続情報が届くことを書いています。書体を変える・足すときは、これらも合わせて直してください
- **テスト**：e2e では、2つのホストへのリクエストをテスト側で差し替えます（`e2e/fixtures.ts`。すべての e2e に効きます）。実際の Google Fonts との通信は、リリース前の検証で手で確かめます

## アイコン生成

アイコン一式・OGP 画像・`manifest.webmanifest` は、`roadmap/specs/` の最新版のマスターSVGとトークンから生成します。

```sh
bun run gen:icons
```

出力は `static/icons/` と `static/manifest.webmanifest` で、生成物はリポジトリに含めます（CI では生成しません）。マスターSVGやトークンを更新したときに実行し、`app.html` の `theme-color` も合わせて確認してください。

## README とスクリーンショット

- `README.md`（日本語）が原文で、`README.en.md`・`README.zh-Hans.md` は、`README.md` に追従させます。節の構成と順序は3つで同じにし、1行目の言語のリンクは互いに開けるようにします。READMEは利用者向けのため、開発・ビルドの情報はここ（CONTRIBUTING.md）に置き、READMEには書きません
- スクリーンショットは `docs/images/screenshot_{ja,en,zh-Hans}.png`（版番号なしの固定名）で、各言語の画面を撮ります。`roadmap/` のファイルは README から参照しません（版が変わると、リンクが切れるため）
- 撮り方（v0.2.0 のとき）：`bun run build` → `bun run preview` で開いたページを、Playwright で 1280×800・ライトテーマで撮りました。`localStorage` の環境設定で言語を指定し、持ち時間 5:00 のうち 1:28 経過の計測画面（S03）にして、実際の Google Fonts を読み込んだ状態です（e2e のダミーの書体は使いません）。計測画面の見た目が変わったら、撮り直します

## リリース

1. `CHANGELOG.md`（[Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) 形式）に変更を書き、`package.json` の `version` を上げます（バージョンの表記は `package.json` だけです）。README が今回の内容と合っているかも確かめます
2. `main` にコミットして push し、`v*` タグを push します
3. GitHub Actions（`.github/workflows/release.yml`）が `bun run check`（上の 7 つの段）を通し、その中の build が作った `build/` の zip を添付したドラフトリリースを作ります
4. ドラフトリリースの内容を確認して公開します

公開先（https://lt.rinontech.com/）へのデプロイは、Cloudflare Pages の GitHub 連携で行います（ビルドコマンド `bun run build`、出力 `build`、`BUN_VERSION=1.4.3`）。

## リポジトリ構成

```
.github/workflows/     release.yml（タグの push で checkコマンドを通し、ドラフトリリースを作る）
src/
├─ app.html            起動画面（S00）の枠、書体の読み込み、アイコンのスプライト、メタ情報
├─ hooks.server.ts     app.html への、言語名・保存のキー名・起動画面の文言・題名・説明の埋め込み（書き出し時）
├─ routes/             画面の切り替え（設定 ⇄ 計測 ⇄ 環境設定）、oss.json・third_party_licenses.txt
├─ service-worker/     事前キャッシュと更新、書体の実行時キャッシュ
└─ lib/
   ├─ core/            タイマー・ベル・時刻（純粋なTS）
   ├─ settings/        計測の設定（持ち時間・ベル・表示名。保存しない）
   ├─ prefs/           環境設定（言語・表示テーマ・音量・振動・終了の確認）
   ├─ storage/         保存のインターフェース、localStorage とメモリの実装、保存の形（prefs_codec.ts）
   ├─ i18n/            辞書（locales/）、t()、言語の決定、疑似ロケール
   ├─ session/         計測セッション
   ├─ output/          音と振動
   ├─ device/          スリープ防止・全画面
   ├─ pwa/             更新のお知らせ
   ├─ oss/             使用しているオープンソースソフトウェアの一覧のデータ形式
   ├─ theme/           tokens.css・base.css・splash.css
   └─ ui/              部品（parts）と画面（screens）
scripts/               check.ts（checkコマンド）・check_tokens.ts・check_i18n.ts・gen_icons.ts・oss_collect.ts
eslint.config.js       ESLint の設定
e2e/                   Playwright のテスト（fixtures.ts は書体の2つのホストの応答を差し替える）
static/                アイコン一式・manifest・OGP 画像
docs/images/           README のスクリーンショット（3言語）
docs/brand/            ブランド資料とマスターSVGの写し
README.md              利用者向け（日本語・原文）。README.en.md・README.zh-Hans.md は追従する翻訳
roadmap/               仕様・設計・実装計画・検証の記録
```

`roadmap/` の `specs/` に仕様（スペックシート・モック・トークン・ブランド資料・マスターSVG）の最新版、`planning_dialog/` に設計・実装計画・検証の最新版、`development/` に修正の記録を置いています。
