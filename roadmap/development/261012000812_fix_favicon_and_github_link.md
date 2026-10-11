# ファビコンをアプリアイコンにし、GitHubリンクを追加

## 内容
- 症状1: ブラウザのタブのファビコンが Svelte のデフォルトのままだった。`src/routes/+layout.svelte` が `#lib/assets/favicon.svg`（Svelte の雛形のファイル）を `<link rel="icon">` で出力し、`src/app.html` のアプリアイコン指定（`/icons/favicon.svg`・`/icons/favicon-32.png`）を上書きしていた
- 修正1: `+layout.svelte` から favicon の import と `<svelte:head>` の link を削除した。未使用になった `src/lib/assets/favicon.svg` も削除した（`src/lib/assets/` は空になったため消えた）。ファビコンは `app.html` の指定だけになり、マスターSVG由来の `static/icons/` を指す
- 要望2: GitHub リポジトリへのリンクがないため、テーマ切り替えボタンの隣にオクトキャットのボタンを置く
- 修正2:
  - `src/app.html` のスプライトに GitHub マークのシンボル `i-github`（viewBox 0 0 16 16、塗り）を追加した
  - `src/lib/ui/parts/Icon.svelte` の `IconName` に `'github'` を追加した
  - `src/lib/ui/screens/SettingsScreen.svelte` のヘッダーで、`ThemeMenu` と新しいリンクを `.header-actions` にまとめた。リンクは `https://github.com/rinfromniigata/lt_time_keeper`（`git remote` の origin と同じ）を新しいタブで開く。`aria-label` は「GitHub リポジトリを開く」、タップ領域はテーマボタンと同じ `--tap-target-min`、色と余白はトークン経由
- 確認: `npm run check`（エラー0）、`vitest run`（161件通過）。画面での見た目の確認は未実施

## 分類
軽微な修正（要件・設計・インターフェース・タスク構成・確定事項のいずれも変えない）
- 修正1はスペックシート・T5-2 で定めたアイコンの適用が、レイアウトの雛形コードに上書きされていたのを直したもの
- 修正2はヘッダーに既存のアイコンボタンと同じ形式のリンクを1つ足すもので、画面構成上の新しい画面・状態・遷移は生まない。ただしモックのヘッダー要素の追加にあたるため、モックの画面構成から外れるとみなす場合は仕様変更として扱い直す

## 影響
- `src/routes/+layout.svelte`、`src/lib/assets/favicon.svg`（削除）、`src/app.html`、`src/lib/ui/parts/Icon.svelte`、`src/lib/ui/screens/SettingsScreen.svelte`
- ブラウザはファビコンを強くキャッシュするため、反映の確認にはスーパーリロードかタブの開き直しが必要な場合がある
- 設定画面のヘッダーにだけリンクが出る。ほかの画面にはヘッダーのテーマボタンがないため追加していない
