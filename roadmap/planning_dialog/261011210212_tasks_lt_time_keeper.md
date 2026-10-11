# lt_time_keeper 実装項目（tasks）

- 設計: `261011205957_imple_lt_time_keeper.md`
- 検証: `261011210245_walk_lt_time_keeper.md`（同じ Phase 番号の W 項目）
- 進め方: Tn をすべて終えたら Wn を行い、Wn がすべて通過してから Phase n+1 に進む

---

## Phase 1: 土台とトークン（起動画面まで）
- [x] T1-1 【ユーザー】ローカルの Bun を 1.4.x に上げる（`bun upgrade`）
  - 現在 1.3.14。`bun --version` が 1.4.x になったら完了を知らせる
- [x] T1-2 【エージェント】SvelteKit 3 のプロジェクトを作る（`sv create` minimal・TypeScript・Bun、Vitest・Playwright のアドオン、adapter-static、`vite.config.ts` に設定、全ページ prerender、`#lib` の imports）
  - 依存: T1-1
  - コマンドとオプションは、インストールした `sv` の版のドキュメントで確認する
  - 実施メモ: `sv` 1.1.1 で `--template minimal --types ts --add vitest=usages:unit playwright=demo:no sveltekit-adapter=adapter:static --install bun` を実行。adapter-static 4.0.0、kit 3.x、vite 8、vitest 4。ひな形のデモ（vitest-examples・e2e サンプル）は削除し、`.gitignore` に `roadmap/archived/` を戻した。`+layout.ts` に prerender・ssr、test スクリプトと Playwright の webServer を bun に変更。ユニットテストがまだ無いため `passWithNoTests` を有効化。`bun run check`・`bun run build` 通過
- [x] T1-3 【エージェント】トークンとブランド資料を配置する（specs の tokens を `src/lib/theme/tokens.css` へ、brand.md とマスターSVGを `docs/brand/` へコピーし、`base.css` を作る）
  - 依存: T1-2
  - 実施メモ: tokens は `lt_time_keeper_tokens_v1.css` を無変更で `src/lib/theme/tokens.css` へ（`cmp` で一致確認）。brand.md とマスターSVGは版番号付きのまま `docs/brand/` へ。`base.css` は reset・フォーカスリング・reduced-motion のみ（720px のブレークポイントは T2-7 で必要になった時点で足す）。`+layout.svelte` で両 CSS を読み込み
- [x] T1-4 【エージェント】`scripts/check_tokens.ts` を作り、`bun run check:tokens` で実行できるようにする
  - 依存: T1-3
  - 実施メモ: 検査は(1) tokens.css が specs 最新版の tokens と一致、(2) src 内 .svelte・.css(tokens.css を除く)に色(#xxx・rgb(・hsl()と寸法(px・rem・ms)の直書きがない、の2点。コメントは除外。許可は base.css の `720px` のみ(スクリプト内 ALLOWED)。意図的な違反(直書き・tokens 改変)で失敗することを確認。型検査用に `@types/bun` を devDependencies に追加し、tsconfig の include に scripts を追加
- [x] T1-5 【エージェント】起動画面と画面の土台を作る（`app.html` に S00 の静的マークアップ、UIアイコンのスプライト、`+page.svelte` の画面切り替えの枠、`theme.svelte.ts`）
  - 依存: T1-3
  - 画面: S00
  - 実施メモ: S00 は `app.html` の静的マークアップ(`#splash`)+ `theme/splash.css`(トークン参照のみ)。スプライトも `app.html` に置いた(ブランドのマークは固定色のため CSS 検査の対象外にしたい)。`+page.svelte` の `onMount` で `#splash` を取り除く。画面は `'settings' | 'timer'` の状態で切り替える枠だけ(中身は T2-5・T2-7)。`theme.svelte.ts` は ThemeChoice と `theme.set()`(`data-theme` の付け外し)。Playwright で、ビルドを開いて S00 が消え枠が出ることを確認(Chromium を導入済み)。S00 の見た目のユーザー確認は W1 で行う

## Phase 2: タイマーの核と最小の計測（持ち時間だけで計れる）
- [x] T2-1 【エージェント】`core/time.ts`（時刻源の型、表示の変換）を実装する
  - 依存: T1-2
  - 実施メモ: `Now`・`SECOND`・`MAX_INPUT_MS`・`formatRemaining`（切り上げ）・`formatOver`（切り捨て、先頭に +）・`formatClock`（切り捨て）を imple どおりに実装。分は 99 を超えても繰り上げない（100:00 のように出る）。負の値は 0 に丸める。単体テスト `time.test.ts` 12件が通過。`check`・`check:tokens` も通過
- [ ] T2-2 【エージェント】`core/timer.ts`（開始・一時停止・再開、スナップショット）を実装する
  - 依存: T2-1
- [ ] T2-3 【エージェント】`core/bells.ts` の型定義（Bell・BellBase・Strikes）だけを先に置き、`settings/`（設定の型・初期値・持ち時間0の検証、保存インターフェースと「何もしない」実装、設定ストア）を実装する
  - 依存: T2-1
- [ ] T2-4 【エージェント】部品を作る（ボタン各種、数値入力・持ち時間入力、プリセット、文字入力、状態ラベル、リング、確認ダイアログ）。S90 の状態をすべて持たせる
  - 依存: T1-3, T1-5
  - 画面: S90
- [ ] T2-5 【エージェント】設定画面の第1段階を実装する（ヘッダーのブランド表示、持ち時間、表示名、開始バー、持ち時間0のエラー）
  - 依存: T2-3, T2-4
  - 画面: S01, S01a
  - ベル・音・テーマのボタンは Phase 3・4 で足す
- [ ] T2-6 【エージェント】`session/session.svelte.ts` の第1段階を実装する（タイマーの駆動、rAF のループ、表示用の値、一時停止・再開、終了の確認、Space・Esc・Enter のキー操作）
  - 依存: T2-2, T2-3
- [ ] T2-7 【エージェント】計測画面を実装する（表示名、リング、数字、経過／持ち時間、状態ラベル、超過の明滅、一時停止、終了の確認、キー操作の案内、広い画面の配置）。終了で S01 に戻り、値が残ること
  - 依存: T2-4, T2-5, T2-6
  - 画面: S03, S03b, S03c, S03f

## Phase 3: ベル
- [ ] T3-1 【エージェント】`core/bells.ts` の関数（並べ替え、時点、鳴らないベル、予鈴の時点、番号と「次のベル」の表記、補足文、区間内のベル、次のベル）を実装する
  - 依存: T2-3
- [ ] T3-2 【エージェント】設定に、鳴らないベルの検証と、ベルの追加・変更・削除を足す
  - 依存: T3-1
- [ ] T3-3 【エージェント】`output/`（Ringer インターフェース、Web Audio のベル音、振動、まとめ役）を実装する
  - 依存: T3-1
- [ ] T3-4 【エージェント】部品を足す（ベルの行、編集シート／ダイアログ、セグメント、スイッチ、音量スライダー、空の状態）
  - 依存: T2-4
  - 画面: S90
- [ ] T3-5 【エージェント】設定画面にベルと音を足す（一覧・番号・補足文・追加・削除、ベルなし、ベル多数、編集シート、鳴らないベルの警告、音量・鳴らしてみる・振動のスイッチ、開始バーの件数）
  - 依存: T3-2, T3-3, T3-4, T2-5
  - 画面: S01, S01a, S01b, S01c, S01d
- [ ] T3-6 【エージェント】セッションにベルを足す（開始時の unlock、区間内のベルを鳴らす、予鈴、次のベル、画面が見えないあいだの扱い）
  - 依存: T3-1, T3-3, T2-6
- [ ] T3-7 【エージェント】計測画面に次のベルと予鈴の表示を足す（長い表示名の省略を含む）
  - 依存: T3-6, T2-7
  - 画面: S03, S03a

## Phase 4: 計測画面の仕上げとテーマ
- [ ] T4-1 【エージェント】`device/`（スリープ防止、全画面）を実装する
  - 依存: T1-2
- [ ] T4-2 【エージェント】セッションに、スリープ防止（見える状態に戻ったら取り直す）、警告（音を出せない・スリープを防げない）とその閉じる操作、操作ボタンを隠す処理（`--controls-hide-delay` を読む、一時停止中・確認中は隠さない、カーソルも隠す）を足す
  - 依存: T4-1, T3-6
- [ ] T4-3 【エージェント】計測画面に警告バナー、操作ボタンを隠した状態、全画面ボタン（720px以上かつ対応環境）と F キーを足す
  - 依存: T4-2, T3-7
  - 画面: S03, S03d, S03e
- [ ] T4-4 【エージェント】テーマの切り替え（ヘッダーの月のボタン、メニュー、キーボード操作）を足す
  - 依存: T1-5, T2-5
  - 画面: S01, S01e

## Phase 5: PWA とアイコン
- [ ] T5-1 【エージェント】Service Worker を実装する（インストールした版のドキュメントで登録の挙動を確認、全資源の事前キャッシュ、版を含むキャッシュ名、古いキャッシュの削除、SKIP_WAITING）
  - 依存: T1-2
- [ ] T5-2 【エージェント】`scripts/gen_icons.ts` を作り、アイコン一式と OGP 画像、`manifest.webmanifest`（色はトークンから読む）を生成する
  - 依存: T1-3
- [ ] T5-3 【エージェント】`app.html` に manifest・アイコン・OGP の参照を足す
  - 依存: T5-2
- [ ] T5-4 【エージェント】更新のお知らせを実装する（UpdateNotifier、S01 のときだけバナーを出す、再読み込み、閉じる）
  - 依存: T5-1, T2-5
  - 画面: S01f

## Phase 6: リリース準備
- [ ] T6-1 【エージェント】`CHANGELOG.md`（Keep a Changelog）を作り、`package.json` の version を 0.1.0 にする
  - 依存: T5-4
- [ ] T6-2 【エージェント】`.github/workflows/release.yml` を作る（`v*` タグで起動、check:tokens・check・test・build、build の zip をドラフトリリースに添付）
  - 依存: T1-4
- [ ] T6-3 【エージェント】`README.md` に開発・ビルド・アイコン生成のコマンドを書く
  - 依存: T5-2
- [ ] T6-4 【ユーザー】Cloudflare Pages のプロジェクトを作り、GitHub 連携・ビルド設定（`bun run build`、`build`、`BUN_VERSION=1.4.3`）・独自ドメイン `lt.rinontech.com` を設定する
- [ ] T6-5 【エージェント】リリース前の確認をする（ローカルビルド、アイコンが specs の最新のマスターSVGから生成されていること）。コミットメッセージとタグのコマンドを提示する
  - 依存: T6-1, T6-2, T6-3
- [ ] T6-6 【ユーザー】コミットして main に push し、`v0.1.0` タグを push する。Actions の完了後、ドラフトリリースを公開する
  - 依存: T6-4, T6-5
