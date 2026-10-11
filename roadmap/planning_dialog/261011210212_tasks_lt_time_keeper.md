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
- [x] T2-2 【エージェント】`core/timer.ts`（開始・一時停止・再開、スナップショット）を実装する
  - 依存: T2-1
  - 実施メモ: imple §3.2 どおり。カウンターを持たず、開始時刻・一時停止の開始時刻・停止の合計から毎回計算する。二重の start／pause／resume と、未開始での pause は何もしない。開始前の snapshot は経過0。`progress` は超過で 1、それ以外は残り÷持ち時間。単体テスト `timer.test.ts` 10件（累計22件）、`check`、`check:tokens` 通過
- [x] T2-3 【エージェント】`core/bells.ts` の型定義（Bell・BellBase・Strikes）だけを先に置き、`settings/`（設定の型・初期値・持ち時間0の検証、保存インターフェースと「何もしない」実装、設定ストア）を実装する
  - 依存: T2-1
  - 実施メモ: `bells.ts` は型のみ。`settings/` は `settings.ts`（`Settings`・`DEFAULT_SETTINGS`・`validate`・`canStart`）、`repository.ts`（`SettingsRepository`・`NoopRepository`）、`store.svelte.ts`（`SettingsStore`）。`validate` の `silentBellIds` は常に空配列で、鳴らないベルの検出は T3-2 で足す。ストアは setter（持ち時間は 0..99:59 に、音量は 0..1 に収める）ごとに `save` を呼び、`snapshot()` でセッション用の複製を返す。ベルの追加・変更・削除は T3-2。ストアのテストは `$state` を使うため、`store.test.ts`（`.svelte.test.ts` は vitest の対象外）に置いた。単体テスト累計31件、`check`、`check:tokens` 通過
- [x] T2-4 【エージェント】部品を作る（ボタン各種、数値入力・持ち時間入力、プリセット、文字入力、状態ラベル、リング、確認ダイアログ）。S90 の状態をすべて持たせる
  - 依存: T1-3, T1-5
  - 画面: S90
  - 実施メモ: `src/lib/ui/parts/` に Button（主・通常・ゴースト・危険・危険の塗り、md／lg、アイコンのみ）、Icon、NumberField、DurationInput（分・秒・増減・0:00〜99:59）、PresetChips、TextField、StatePill、Ring、ConfirmDialog、FieldError、`state.ts`（DisplayState）を作成。hover・focus・disabled はモックのような `is-hover` 等のクラスではなく、実際の `:hover`・`:focus-visible`・`:disabled` で持たせた（hover は disabled 時に効かない）。値はトークン参照のみ。リングは `pathLength="100"`、超過の明滅は `prefers-reduced-motion` で止める。確認は、使い捨ての試験ページ（削除済み）を Playwright で操作して行った：増減・プリセット・直接入力（秒75→59、分の3桁目は入らない）・矢印キー・0:00 での「−」無効・ダイアログの初期フォーカスが「続ける」・Tab が2ボタンの間で回ること。見た目のスクリーンショットも確認。ダイアログの Enter・Esc は未実装（T2-6 のセッションが担い、フォーカス中のボタンの Enter と二重にならないよう注意する）。警告バナー・ベルの行・シート・セグメント・スイッチ・スライダー・空の状態は T3-4 以降
- [x] T2-5 【エージェント】設定画面の第1段階を実装する（ヘッダーのブランド表示、持ち時間、表示名、開始バー、持ち時間0のエラー）
  - 依存: T2-3, T2-4
  - 画面: S01, S01a
  - 実施メモ: `ui/screens/SettingsScreen.svelte`（ヘッダー・持ち時間パネル・表示名パネル・開始バー）と `ui/parts/Panel.svelte` を追加。`+page.svelte` で `SettingsStore` を持ち、開始で `timer` に切り替える（計測画面は仮置きで、S01 に戻る「終了」だけ。開始は画面が settings のときだけ受け付ける）。広い画面の配置は、`base.css` に `.app`（コンテナ）と `.screen` の値（`--settings-columns` など）を置き、720px の判定をそこ1か所にした。各画面は `class="screen"` の要素でその値を読む（T2-7 の計測画面もこの方式）。右の列（ベル・音）は T3-5 で足すため、広い画面では左の列だけが表示される。開始バーの件数表示も T3-5。モバイル幅・デスクトップ幅・ライト・ダーク・0:00 のエラーをスクリーンショットで確認。e2e（`e2e/settings.e2e.ts` 3件：反映・0:00 と上限・横スクロールなし）を追加し通過。W2-3・W2-6 の確認の一部は済んだが、項目のチェックは W2 で行う
  - ベル・音・テーマのボタンは Phase 3・4 で足す
- [x] T2-6 【エージェント】`session/session.svelte.ts` の第1段階を実装する（タイマーの駆動、rAF のループ、表示用の値、一時停止・再開、終了の確認、Space・Esc・Enter のキー操作）
  - 依存: T2-2, T2-3
  - 実施メモ: `Session`（deps は `now`・`onfinish`・テスト用の `frames`）。`snapshot`（毎フレーム取り直す）、`display`（`digits`・`state`・`sub`）、`confirming`、`start`・`togglePause`・`requestFinish`・`cancelFinish`・`confirmFinish`・`finish`・`handleKey`。imple からの差分：(1) `display` に `state`（一時停止を優先した表示用の状態）を足し、`sub` は通常のときだけ文字列・それ以外は null（状態ラベルを出す位置のため）、(2) 「終了する」の確定は `confirmFinish()`（`finish()` で後片付けしたあと `onfinish` で S01 へ戻す）。(3) `next`・`warnings`・`controlsHidden`・`poke`・`dismissWarning` と deps の `ringer`・`wakeLock` は T3-6・T4-2 で足す。予鈴の時点（`warnAtElapsedMs`）は null で渡しており、T3-6 で bells から求めて渡す。キー操作は `handleKey` が受けるだけで、`window` への登録は T2-7 の計測画面が行う。Space はボタンにフォーカスがあるとボタン自身に任せ、確認中は無視。確認中の Enter は `preventDefault` して、フォーカス中の「続ける」が押されないようにする。単体テスト `session.test.ts` 15件（累計47件）、`check`、`check:tokens` 通過
- [x] T2-7 【エージェント】計測画面を実装する（表示名、リング、数字、経過／持ち時間、状態ラベル、超過の明滅、一時停止、終了の確認、キー操作の案内、広い画面の配置）。終了で S01 に戻り、値が残ること
  - 依存: T2-4, T2-5, T2-6
  - 画面: S03, S03b, S03c, S03f
  - 実施メモ: `ui/screens/TimerScreen.svelte` と `ui/parts/Kbd.svelte` を追加。`+page.svelte` が開始で `Session` を作り（設定は `snapshot()` の複製）、`onfinish` で破棄して S01 に戻す。`window` の keydown を `session.handleKey` に渡す。一時停止と再開は同じボタンの表示を切り替える（フォーカスを保つため）。広い画面の値（余白・表示名の大きさ・ボタンの幅・キー操作の案内の出し分け）は T2-5 と同じ方式で `base.css` の `.screen` に追加。確認ダイアログのキー操作の案内も同じ値で出し分ける（`ConfirmDialog` の `.hints`）。`Session` に `durationMs` の getter を追加。キー操作の案内に F は含めていない（T4-3）。次のベルの表示は T3-7、警告バナー・操作ボタンを隠す処理・全画面は T4-3。e2e（`e2e/timer.e2e.ts` 7件）を追加し、全10件通過：数字・経過・超過の切り替わり、明滅の有無（reduced-motion）、Space、Esc・Enter・確認中の進行・値の保持、横スクロールと案内の出し分け。Playwright の時計は、長い時間を `runFor` で進めると全フレームを再生して遅いため `fastForward` で飛ばしてから少し進める。スクリーンショット（モバイル通常・一時停止、デスクトップ超過・確認）も確認。W2 の項目のチェックは W2 で行う

## Phase 3: ベル
- [x] T3-1 【エージェント】`core/bells.ts` の関数（並べ替え、時点、鳴らないベル、予鈴の時点、番号と「次のベル」の表記、補足文、区間内のベル、次のベル）を実装する
  - 依存: T2-3
  - 実施メモ: imple §3.3 のとおり、`bellAtElapsed`・`sortBells`・`isSilent`・`warnAtElapsed`・`bellBadge`・`nextBellLabel`・`bellNote`・`dueStrikes`・`nextBell` を実装。解釈を決めた点：(1) `bellBadge`・`nextBellLabel`・`nextBell` の `index` は 0 始まりで、番号は index+1。(2) 鳴らないベルも並び順（番号）には数えるが、予鈴の基準・`dueStrikes`・`nextBell` の対象からは除く。(3) `bellNote` は silent を最優先、持ち時間と同じ時点は 'over'、予鈴の時点の最初のベル（同時点では回数の多い方）だけ 'warn'。(4) `sortBells` は元の配列を変えず、同点・同回数は元の順。単体テスト `bells.test.ts` 29件（累計76件）、`check`、`check:tokens` 通過
- [x] T3-2 【エージェント】設定に、鳴らないベルの検証と、ベルの追加・変更・削除を足す
  - 依存: T3-1
  - 実施メモ: `validate` の `silentBellIds` を `isSilent` で求めるようにした（警告のみで `canStart` は変わらない）。`SettingsStore` に `addBell(bell)`（採番した id を返す）・`updateBell(id, patch)`・`removeBell(id)` を追加。id は `bell-n` で、読み込んだ設定の id と重ならないよう確認して振る。時刻は 0..99:59 に収め、該当 id がなければ何もせず `save` も呼ばない。変更ごとに `save` を呼ぶ。並べ替えは保存せず、表示側が `sortBells` で求める。単体テスト 9件追加（累計85件）、`check`、`check:tokens` 通過
- [x] T3-3 【エージェント】`output/`（Ringer インターフェース、Web Audio のベル音、振動、まとめ役）を実装する
  - 依存: T3-1
  - 実施メモ: `src/lib/output/` に `ringer.ts`（`Ringer`、音と振動で共有する打ち始めの間隔 `STRIKE_INTERVAL_MS` = 700ms）、`audio_ringer.ts`、`vibration_ringer.ts`、`composite_ringer.ts` を追加。`AudioRinger` は `unlock` で AudioContext を作って resume し（作れない・resume できない環境でも例外は出さず `blocked` で伝える）、ベル音は基音880Hzに倍音2つ（2.4倍・4.1倍）を重ねた正弦波を指数減衰させ、複数回は間隔をあけて先にスケジュールする。音量は GainNode で、unlock 前の `setVolume` も保持する。`VibrationRinger` は `isSupported()` と、回数分のパルスを返す `vibrationPattern` を持つ。`CompositeRinger` は Ringer の配列を受け取り、imple の「振動オフなら音だけ」は、振動の Ringer を渡さないことで表す（組み立ては T3-6）。`blocked` はどれかが blocked なら true。単体テスト 13件追加（累計98件、AudioContext は代役で確認）、`check`、`check:tokens` 通過。実際の音の聞こえ方は T3-5 の「鳴らしてみる」ができてから W3 で確認する
- [x] T3-4 【エージェント】部品を足す（ベルの行、編集シート／ダイアログ、セグメント、スイッチ、音量スライダー、空の状態）
  - 依存: T2-4
  - 画面: S90
  - 実施メモ: `ui/parts/` に `BellRow`・`BellEditor`（`BellValues` も export）・`Segmented`・`Switch`・`VolumeSlider`・`EmptyState` を追加。(1) `BellRow` はモックの「行全体が1つのリンク」を、入れ子のボタンを避けるため「行の本体＝編集を開くボタン」と「右端の×＝削除ボタン」の2つに分けた。補足文は `bellNote` の結果（`'warn'|'over'|'silent'|null`）を受け、silent は行の枠を危険色にする。(2) `BellEditor` は `mode='add'|'edit'`（edit は 削除／決定、add は キャンセル／決定）。編集中の値は決定まで反映しない。Esc・暗い背景のクリックは取りやめ（`oncancel`）、Tab はシート内で回り、閉じたら元のフォーカスに戻す。狭い画面は下のシート、広い画面は中央のダイアログで、配置の値（`--sheet-*`）は `base.css` の `.screen` に追加した（720px の判定は1か所のまま）。時刻の入力は `DurationInput` に `steppers` 引数を足して増減ボタンを出さない形で再利用（モックのシートに増減ボタンがないため）。(3) `Segmented` は radiogroup で、選択中だけが Tab で止まり矢印キーで移る。(4) `Switch` は `role="switch"`、見た目の溝より高い押せる領域を持たせた。(5) `VolumeSlider` は 0〜1 を `bind:value` で受ける。ラベル（「音量」）と「鳴らしてみる」は T3-5。確認は、使い捨ての試験ページ（削除済み）を Playwright で操作して行った：行の開く／削除、スイッチのクリック・Space・disabled、スライダーの Home／End、セグメントの矢印キーとフォーカス移動、追加・編集シートの 決定・キャンセル・削除・Esc・背景クリック、Tab がシートの外へ出ないこと、フォーカスの復帰、モバイルでシートが下端・デスクトップで中央、横スクロールなし。ライト・ダーク、モバイル・デスクトップのスクリーンショットも確認。`check`・`check:tokens`・`build`・単体テスト98件通過
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
