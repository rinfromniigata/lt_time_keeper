# lt_time_keeper 実装項目（tasks）

- 設計: `261016200839_imple_lt_time_keeper.md`
- 検証: `261016200839_walk_lt_time_keeper.md`（同じ Phase 番号の W 項目）
- 進め方: Tn をすべて終えたら Wn を行い、Wn がすべて通過してから Phase n+1 に進む
- 版の経緯: Phase 1〜6 は v0.1.0（前版 `archived/261011225751_tasks_lt_time_keeper.md`）の項目で、ID・チェック・実施メモをそのまま引き継いだ。Phase 7〜11 は v0.2.0（仕様変更 `development/261016195942_change_v0_2_0_update.md`）の項目
  - Phase 1〜6 の実施メモにある `_v2` のファイル名は、当時の版を指す

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
  - 実施メモ: tokens は `lt_time_keeper_tokens_v2.css` を無変更で `src/lib/theme/tokens.css` へ（`cmp` で一致確認）。brand.md とマスターSVGは版番号付きのまま `docs/brand/` へ。`base.css` は reset・フォーカスリング・reduced-motion のみ（720px のブレークポイントは T2-7 で必要になった時点で足す）。`+layout.svelte` で両 CSS を読み込み
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
- [x] T3-5 【エージェント】設定画面にベルと音を足す（一覧・番号・補足文・追加・削除、ベルなし、ベル多数、編集シート、鳴らないベルの警告、音量・鳴らしてみる・振動のスイッチ、開始バーの件数）
  - 依存: T3-2, T3-3, T3-4, T2-5
  - 画面: S01, S01a, S01b, S01c, S01d
  - 実施メモ: `SettingsScreen` に「ベル」「音」のパネルを追加。一覧は `sortBells` の順に毎回求め、番号は `bellBadge`、補足文は `bellNote`、時刻は「残り m:ss」「超過 +m:ss」で表示。0件は空の状態（S01b）で、ベルがあるときは一覧の下に「ベルを追加」。行の × は確認なしで即削除、シートの 決定／削除 で `updateBell`／`addBell`／`removeBell`。編集シートの見出しは3件以下で「1鈴を編集」、4件以上で「4番目のベルを編集」。追加の初期値は「残り 1:00（持ち時間が短ければ持ち時間まで）・1回」とした（持ち時間より長い「残り」にならないように。仕様に指定がなかったための判断）。音パネルは音量スライダー・「鳴らしてみる」（`previewRinger` を `+page.svelte` で1つ作って渡し、押すたびに unlock・音量反映・1回鳴らす）・振動スイッチ（`VibrationRinger.isSupported()` が真のときだけ、マウント後に表示）。開始バーは「持ち時間 5:00 ／ ベル 3件」「ベルなし」。パネルの並びは、狭い画面で 持ち時間・ベル・音・表示名、広い画面で左 持ち時間・表示名／右 ベル・音（モックどおり）にするため、`Panel` に `order` を足し、`.col` を狭い画面では `display: contents` で解く値（`--settings-col-display`）を `base.css` に追加。`鳴らしてみる` の幅の値（`--sound-test-flex`）も同じ方式。e2e（`e2e/bells.e2e.ts` 10件、AudioContext と `navigator.vibrate` は代役で確認）を追加し、既存と合わせて24件通過。モバイル・デスクトップ・ライト・ダーク・ベルなし・鳴らないベルのスクリーンショットも確認。実際の音と、開始時にセッションへ設定が渡ること（ベルを鳴らす）は T3-6。W3 のチェックは W3 で行う
- [x] T3-6 【エージェント】セッションにベルを足す（開始時の unlock、区間内のベルを鳴らす、予鈴、次のベル、画面が見えないあいだの扱い）
  - 依存: T3-1, T3-3, T2-6
  - 実施メモ: `Session` の deps に `ringer`（必須）と `visibility`（テスト用の `VisibilityDriver`、既定は `document.visibilityState` と `visibilitychange`）を追加。(1) コンストラクタで `setVolume(settings.volume)`、`Timer` の `warnAtElapsedMs` を `warnAtElapsed` で求めて渡す（予鈴の段階）。ベルは開始時点の複製を持つ。(2) `start()` は同期のうちに `ringer.unlock()` を呼び（開始ボタンの操作の中）、計測は音の準備を待たずに始める。(3) 毎フレーム `dueStrikes(prev, elapsed)` を求めて鳴らす。`prev` は -1 から始め、`(prev, elapsed]` を重ねずに進めるので二度鳴らない。unlock が終わるまで判定を保留し、終わった時点で -1 から取りこぼさず拾う（開始と同時のベルのため）。ただし unlock が終わらない場合に備え、経過1秒（`UNLOCK_WAIT_MS`）で待たずに始める。(4) 画面が見えなくなったら印を付け（購読は `finish()` で解く）、戻った最初の判定で `prev` を現在に合わせ、そのあいだのベルは鳴らさない。見えない間にフレームが回っても同様。(5) 描画が長く止まって1回の判定に複数の時点が入ったときは、重ねず最後の1つだけ鳴らす（imple にない判断）。(6) `display.next`（`{ label: '1鈴まで', in: '4:00' }`、残りのベルがなければ null）を追加。`in` は残り時間と同じ切り上げ。番号は鳴らないベルも数えた並び順。画面への表示は T3-7。`+page.svelte` は、開始のたびに `AudioRinger`（「鳴らしてみる」と共用の1つ）に、設定がオンで対応端末なら `VibrationRinger` を添えた `CompositeRinger` を作って渡す。単体テスト 18件追加・既存2件更新（累計116件）、e2e 3件追加（fake の AudioContext と `navigator.vibrate`、`page.clock` で、1鈴・2鈴・3鈴が1度ずつ、振動のオン・オフ、ベルなし）で全27件通過。`check`・`check:tokens` 通過。実際に耳で聞く確認は W3
- [x] T3-7 【エージェント】計測画面に次のベルと予鈴の表示を足す（長い表示名の省略を含む）
  - 依存: T3-6, T2-7
  - 画面: S03, S03a
  - 実施メモ: `TimerScreen` の上部に、表示名の右へ「次のベル　1鈴まで 2:12」を追加（`session.display.next` を描画するだけ）。残りのベルがなければ要素ごと出さない。狭い画面は見出し「次のベル」なし・小さい文字、広い画面は見出しあり・大きい文字（モックどおり）で、値は `base.css` の `.screen`（`--next-bell-size`・`--next-bell-prefix-display`）に追加。次のベルは縮まず、長い表示名のほうが省略記号で切れる。予鈴の表示（黄のリング・状態ラベル「予鈴」・経過の代わりにラベル）は T2-4・T2-7 で部品と色を作ってあり、T3-6 で状態が `warn` になったことで表示される。リングの色は変化に時間がかかるため、予鈴に切り替わった直後は緑から黄へ移る途中の見た目になる（落ち着いたあとの色が `--color-state-warn` であることを確認）。e2e（`e2e/timer.e2e.ts` に4件追加、全31件通過）：次のベルの秒が大きな数字と同じ切り上げでそろうこと・鳴るたびに次へ進み最後は消えること、1鈴で「予鈴」になり超過へ進むこと、ベル0件で次のベルが出ず予鈴にならないこと、長い表示名が省略され次のベルが隠れず横スクロールがないこと・見出しが広い画面だけであること。スクリーンショット（デスクトップ通常、モバイルの長い表示名・予鈴）も確認。`check`・`check:tokens`・単体テスト116件通過。S03・S03a のモックとの見比べは W3 でユーザーが行う

## Phase 4: 計測画面の仕上げとテーマ
- [x] T4-1 【エージェント】`device/`（スリープ防止、全画面）を実装する
  - 依存: T1-2
  - 実施メモ: `wake_lock.ts`（`BrowserWakeLock`。取れているあいだの再要求なし、ブラウザに解除されたら取り直せる、拒否は false）と `fullscreen.ts`（`BrowserFullscreen`。ページ全体を切り替え、拒否は握りつぶす）を追加。API は注入できる形にして `device.test.ts` で単体検証（unit 126件・check 0エラー）
- [x] T4-2 【エージェント】セッションに、スリープ防止（見える状態に戻ったら取り直す）、警告（音を出せない・スリープを防げない）とその閉じる操作、操作ボタンを隠す処理（`--controls-hide-delay` を読む、一時停止中・確認中は隠さない、カーソルも隠す）を足す
  - 依存: T4-1, T3-6
  - 実施メモ: `Session` に `wakeLock`（必須の依存）・`warnings`・`controlsHidden`・`dismissWarning`・`poke` を追加。警告は閉じたら同じ計測のあいだ出し直さず、取り直しや音の準備完了で解消すれば自動で消える。隠す時間は `--controls-hide-delay` を `getComputedStyle` で開始時に読む（読めなければ隠さない）。カーソルを隠す表示は `controlsHidden` を見て画面側（T4-3）で行う。unit 140件・check 0エラー
- [x] T4-3 【エージェント】計測画面に警告バナー、操作ボタンを隠した状態、全画面ボタン（720px以上かつ対応環境）と F キーを足す
  - 依存: T4-2, T3-7
  - 画面: S03, S03d, S03e
- [x] T4-4 【エージェント】テーマの切り替え（ヘッダーの月のボタン、メニュー、キーボード操作）を足す
  - 依存: T1-5, T2-5
  - 画面: S01, S01e
  - 実施メモ: `ui/parts/ThemeMenu.svelte` を追加し、S01 のヘッダーに配置。月のボタンで開き、最初のフォーカスは選択中の項目、↑↓・Home・End で移動、Esc でボタンへ戻って閉じる、外側の操作・Tab でも閉じる。選択は `theme.set`（`data-theme` の付け外し、保存なし）。check 0エラー・check:tokens・build 通過。画面での動作確認は W4-4 で行う
- [x] T4-5 【エージェント】終了の確認（S03f）の最初のフォーカスを「終了する」にし、確認中の Space は何もしないようにする（キー割り当ては変えない）
  - 依存: T4-3
  - 画面: S03f
  - 変更: `roadmap/development/261011225501_change_confirm_initial_focus.md`
  - 実施メモ: `ConfirmDialog` に `initialFocus`（既定は従来どおりキャンセル側）を追加し、計測画面は `confirm` を渡す。Space は keydown・keyup とも `preventDefault` してボタンを押させない（案A）。キー割り当て（Enter・Esc）と Tab の循環は変更なし

## Phase 5: PWA とアイコン
- [x] T5-1 【エージェント】Service Worker を実装する（インストールした版のドキュメントで登録の挙動を確認、全資源の事前キャッシュ、版を含むキャッシュ名、古いキャッシュの削除、SKIP_WAITING）
  - 依存: T1-2
  - 実施メモ: Kit 3.0.1 の型定義とソースで確認。登録は `serviceWorker.register`（既定 true）により、ページの `load` 後に `navigator.serviceWorker.register('service-worker.js', { type: 'module' })` が自動で呼ばれる。自前登録は不要で、T5-4 は `navigator.serviceWorker.getRegistration()` から `updatefound` を拾えるため、自動登録のままにする。`src/service-worker/index.ts`（と `tsconfig.json`）を追加：`install` で `immutable`・`assets`・`prerendered` を `cache: 'reload'` で事前キャッシュし、`activate` で `cache-` で始まる古いキャッシュだけを消して `clients.claim()`、`message` の `SKIP_WAITING` でのみ `skipWaiting()`（それまでは waiting に残る）。`fetch` はキャッシュ優先で、なければネットワーク、オフラインの遷移はルートのページで答える。imple からの差分：(1) `$app/paths` の `resolve` ではなく、登録範囲（`registration.scope`）を基準に絶対 URL へ直した。マニフェストの path は先頭に `/` のない相対パスで、ルートのページは空文字のため、そのまま `Request` に渡すと SW 自身の URL に解決されたため。(2) 照合に `ignoreVary: true` を付けた。モジュールの読み込みは `Origin` 付きの要求で、事前キャッシュ時の要求と `Vary` が合わず、オフラインで JS だけ取れなかったため。キャッシュ名は `vite.config.ts` の `version.name`（`<package.json の version>+<ビルド時刻の36進>`）から `cache-0.0.1+…` になる。tsconfig のルートから `src/service-worker` を除外し（Kit の検証が要求）、`check` に `tsc -p src/service-worker/tsconfig.json` を足した。e2e（`e2e/pwa.e2e.ts` 3件：登録とキャッシュの中身・名前、オフラインの再読み込みで起動、再登録で古い版のキャッシュだけが消える）を追加し、全48件通過。`check`・`check:tokens`・単体テスト140件・`build` 通過。SKIP_WAITING の実際の切り替えは、waiting の SW を作れる T5-4 で確認する
- [x] T5-2 【エージェント】`scripts/gen_icons.ts` を作り、アイコン一式と OGP 画像、`manifest.webmanifest`（色はトークンから読む）を生成する
  - 依存: T1-3
  - 実施メモ: `@resvg/resvg-js` 2.6.2 を devDependencies に追加し、`bun run gen:icons` で実行する。入力は `roadmap/specs/` の最新版のマスターSVGとトークン。`static/icons/` に `favicon.svg`（コピー）・`favicon-32.png`・`apple-touch-icon.png`（180）・`icon-192.png`・`icon-512.png`・`icon-maskable-512.png`・`og.png`（1200×630）を、`static/manifest.webmanifest` を生成した（寸法は PNG のヘッダーで確認、ビルド出力にも入る）。maskable は、マスターが全面塗りでモチーフが安全領域内にあるため、拡大・移動せず通常版と同じ描画にした。OGP は、地をマスターSVGの背景色（最初の rect の fill）、アイコンを中央（高さいっぱい）に置いた。manifest の `background_color`・`theme_color` は、テーマで切り替えられないため、tokens のダーク側の `--color-bg`（#121316。アイコンの地と同じ）を読んで入れる。`name` は「LTタイムキーパー」、`short_name` は「LTタイマー」、`start_url`・`scope` は `/`、`display` は `standalone`（スペックシートに指定がなかったための判断）。32px の見え方と OGP を目視で確認。`app.html` への参照は T5-3、WindowsとmacOSでの見え方のユーザー確認は W5
- [x] T5-3 【エージェント】`app.html` に manifest・アイコン・OGP の参照を足す
  - 依存: T5-2
  - 実施メモ: `<head>` に description・theme-color・manifest・favicon（SVG と 32px PNG）・apple-touch-icon・OGP（og:type/title/description/url/image と画像の寸法）・twitter:card（summary_large_image）を追加。ローカルの資源は `/` から始まるパスで、OGP の url・image はスペックシート §10 の公開URL `https://lt.rinontech.com/` の絶対 URL（SNS が絶対 URL を要求するため）。theme-color は manifest と同じ `#121316` で、`app.html` は検査（check_tokens）の対象外のため直書きになっており、コメントに出どころを残した（トークンが変わったら `gen:icons` の結果と合わせて直す）。ビルドした `index.html` に反映されること、`check`・`check:tokens`・e2e 48件通過を確認。ブラウザのタブ・ホーム画面での見え方は W5 でユーザーが確認する
- [x] T5-4 【エージェント】更新のお知らせを実装する（UpdateNotifier、S01 のときだけバナーを出す、再読み込み、閉じる）
  - 依存: T5-1, T2-5
  - 画面: S01f
  - 実施メモ: `src/lib/pwa/update.svelte.ts` に `UpdateNotifier`（`available`・`dismissed`・`start`・`stop`・`reload`・`dismiss`）を追加。ブラウザの API は注入できる形（`WorkerContainer`・`WorkerRegistration`）にして単体テスト10件（累計150件）。(1) 検知: `serviceWorker.ready` のあとで、待機中の SW があるか、`updatefound` → `installed` で待機に入ったら `available`。ただし `controller` がない（初回の有効化）ときは更新とみなさない。(2) 切り替え: `reload()` は待機中の SW に `SKIP_WAITING` を送り、`controllerchange` で読み込み直す（自分が選んだときだけ。初回の有効化の `clients.claim` では読み込み直さない）。待機中の SW がなければそのまま読み込み直す。(3) imple にない追加: 開いたとき1回と、画面が見える状態に戻ったときに `registration.update()` を呼ぶ（開きっぱなしのタブでも更新を拾うため）。表示は `SettingsScreen` の上部に既存の `Banner`（お知らせの色）を、列の数にかかわらず1行で置く。文言はモックどおり、「再読み込み」ボタンと×。S01 のときだけ出るのは、`SettingsScreen` にしか置いていないため（計測中に受け取っても S01 に戻ると出る）。×で閉じたあとは同じページを開いているあいだ出さない（`dismissed`）。`+page.svelte` で `onMount` に `start`、後片付けで `stop`。e2e 3件を `e2e/pwa.e2e.ts` に追加（全51件通過）：待機→お知らせ→（値が残ったまま）再読み込みで初期値に戻りお知らせが消える、×で閉じる、計測中は出さず S01 に戻ると出る。新しい版は、プレビューが配信する `.svelte-kit/output/client/service-worker.js` に1行足して作り、終了時に戻す（`context.route` は SW 本体の更新取得に効かなかったため）。SKIP_WAITING による実際の切り替えもここで確認済み。スクリーンショット（モバイル・デスクトップ）も確認。モバイル幅では文面が狭い列で折り返す。モックとの見比べは W5 でユーザーが行う

## Phase 6: リリース準備
- [x] T6-1 【エージェント】`CHANGELOG.md`（Keep a Changelog）を作り、`package.json` の version を 0.1.0 にする
  - 実施メモ: `CHANGELOG.md` を Keep a Changelog 形式で新規作成（`[Unreleased]` と `[0.1.0] - 2026-10-11`、比較リンクは origin の `rinfromniigata/lt_time_keeper`）。`package.json` の version を 0.0.1 → 0.1.0 に更新。バージョン表記は `package.json` だけ（Tauri 等なし）で、他に 0.0.1 の残りなし。Service Worker のキャッシュ名はビルド時に `cache-0.1.0+…` になる（W6-2 で実ビルドを確認する）
  - 依存: T5-4
- [x] T6-2 【エージェント】`.github/workflows/release.yml` を作る（`v*` タグで起動、check:tokens・check・test・build、build の zip をドラフトリリースに添付）
  - 実施メモ: `.github/workflows/release.yml` を追加。`v*` タグで起動し、ubuntu-latest で setup-bun（1.4.3）→ `bun install --frozen-lockfile` → `check:tokens` → `check` → Playwright のシステム依存（`playwright install-deps chromium`）→ `test` → `build` → `build/` を `lt-time-keeper-<タグ>.zip` にして softprops/action-gh-release でドラフトリリースに添付。権限は `contents: write` のみ。アクションの版は GitHub の最新リリースで確認（checkout v7、setup-bun v2、action-gh-release v3）。実行手順の検証は W6-1
  - 依存: T1-4
- [x] T6-3 【エージェント】`README.md` に開発・ビルド・アイコン生成のコマンドを書く
  - 実施メモ: `README.md` をひな形（sv の案内）から日本語に書き直した。概要・必要なもの（Bun 1.4.x）・開発・確認（check:tokens／check／test:unit／test）・ビルド・アイコン生成（`gen:icons`、入力は specs の最新版、生成物はリポジトリに含める）・リリース・ドキュメント・ライセンス。コマンドは `package.json` の scripts と照合した
  - 依存: T5-2
- [x] T6-4 【ユーザー】Cloudflare Pages のプロジェクトを作り、GitHub 連携・ビルド設定（`bun run build`、`build`、`BUN_VERSION=1.4.3`）・独自ドメイン `lt.rinontech.com` を設定する
  - 実施メモ: ユーザーが Cloudflare Pages のプロジェクト作成・GitHub 連携・ビルド設定・独自ドメインの設定を完了（完了報告を受けて記録）。ビルドの成功と本番での表示は T6-6 の push 後に W6-3 で確認する
- [x] T6-5 【エージェント】リリース前の確認をする（ローカルビルド、アイコンが specs の最新のマスターSVGから生成されていること）。コミットメッセージとタグのコマンドを提示する
  - 実施メモ: `check:tokens`・`check`（0 エラー）・単体テスト161件・`build` 通過。`bun run gen:icons` を再実行しても `static/` に差分が出ず、コミット済みのアイコン一式が `roadmap/specs/lt_time_keeper_icon_master_v2.svg`（最新）から生成されたものと一致し、`favicon.svg` もマスターと同一。ビルド出力に `icons/` 一式が入り、Service Worker のキャッシュ名は `0.1.0+…` になる。e2e と zip 作成までの通し実行は W6-1 で行う。コミットメッセージとタグのコマンドを提示した
  - 依存: T6-1, T6-2, T6-3
- [x] T6-6 【ユーザー】コミットして main に push し、`v0.1.0` タグを push する。Actions の完了後、ドラフトリリースを公開する
  - 実施メモ: main への push と `v0.1.0` タグの push を行った。1回目の Actions は e2e の不安定なテストで失敗したため、修正（`development/261011235534_fix_pwa_e2e_reload_race.md`）後にリモートのタグを削除して打ち直し、2回目が成功。ドラフトリリース v0.1.0 をユーザーが公開（`gh` で公開済みを確認）
  - 依存: T6-4, T6-5

---

以下、v0.2.0（プランアセット v3）。

## Phase 7: トークン v3 と既存画面の色
- [ ] T7-1 【エージェント】specs の `lt_time_keeper_tokens_v3.css` を `src/lib/theme/tokens.css` へ無変更でコピーし、`brand_v3.md`・`icon_master_v3.svg` を `docs/brand/` へコピーする（`docs/brand/` の v2 の写しは削除する）
- [ ] T7-2 【エージェント】`scripts/check_tokens.ts` に、`color:` に無印の `--color-state-*` を使っていないか（文字には `-text` を使うか）の検査を足す
  - 依存: T7-1
- [ ] T7-3 【エージェント】既存の部品・画面に v3 のトークンを適用する。状態色の文字（状態ラベル・ベルの行の補足文・次のベル）は `--color-state-*-text`、入力欄・数値入力・スイッチ・セグメント・プリセットの境界は `--color-border-input`、パネルや行の区切りは `--color-border` のままにする
  - 依存: T7-2
  - 画面: S01, S01a, S01c, S01d, S03, S03a, S03b, S03c, S90
- [ ] T7-4 【エージェント】`CONTRIBUTING.md` の骨格（受け付け方針、開発環境、セットアップ、確認・テスト、ビルド、アイコン生成、リリース、リポジトリ構成）を作り、`README.md` の開発・ビルド・リリースの節をそこへ移す。README には `CONTRIBUTING.md` へのリンクを1行置く（README の書き直しは T11-2）

## Phase 8: i18n の基盤と既存画面の多言語化
- [ ] T8-1 【エージェント】`src/lib/i18n/` に、3言語の辞書（`locales/{ja,en,zh-Hans}.json`）、`messages.ts`（`MessageKey`・`Message`・`msg`・`format`。複数形は `Intl.PluralRules`、引数に別のメッセージを入れられる、欠けたキーは ja にフォールバック）、`detect.ts`（`detectLocale`）を作り、単体テストを書く
  - 辞書には、モックの辞書のうち既存画面（S00〜S03f）が使うキーだけを移す。S05〜S05c と S03f のチェックボックス・ヘッダーの歯車のキーは、使う画面を作るとき（T9-5・T9-6・T9-7・T10-3・T10-4）に足す。`sample.*` は移さない
  - en・zh-Hans の辞書は `satisfies` で型を検査する
- [ ] T8-2 【エージェント】`i18n.svelte.ts`（`locale` の状態、`t`・`tm`、`<html lang>` と `document.title` の反映）と `LOCALE_NAMES` を作り、`+page.svelte` で起動時の言語を `detectLocale(navigator.languages)` から決める
  - 依存: T8-1
- [ ] T8-3 【エージェント】`core/bells.ts` の `bellBadge`・`nextBellName`（旧 `nextBellLabel`）と、`session` の `display`（`sub`・`next`）を、辞書のメッセージを返す形に変え、単体テストを直す
  - 依存: T8-1
- [ ] T8-4 【エージェント】`hooks.server.ts` の `transformPageChunk` で、S00 の文言・言語ごとのアプリ名・`description`・OGP を辞書から `app.html` に差し込み、`app.html` の先頭に、ブラウザの言語から `lang` と題名を描画前に決めるインラインスクリプトを置く
  - 依存: T8-1
  - 画面: S00
- [ ] T8-5 【エージェント】既存の画面と部品の文言をすべて辞書の参照に置き換える。ヘッダーの GitHub リンクは廃止する（リンクは T10-3 で S05b に置く）。テーマのメニューと音のパネルは、v3 のモックで移った先のキー（`prefs.theme.*`・`prefs.tab.sound`・`prefs.sound.*`）を使い、T9-6 で取り除くまで残す
  - 依存: T8-2, T8-3, T8-4
  - 画面: S01, S01a, S01b, S01c, S01d, S01f, S03, S03a, S03b, S03c, S03d, S03e, S03f
- [ ] T8-6 【エージェント】疑似ロケール（`pseudo.ts`）を作り、開発サーバーと `VITE_PSEUDO_LOCALE=1` のビルドで、`?pseudo` を付けて開いたときだけ有効にする
  - 依存: T8-2
- [ ] T8-7 【エージェント】`scripts/check_i18n.ts` を作り、`bun run check:i18n` で、キーの一致、プレースホルダの一致、未使用キー、`.svelte` の文字の直書きを検査する。`release.yml` の `check:tokens` の後に足し、`CONTRIBUTING.md` に追記する
  - 依存: T8-5, T7-4
- [ ] T8-8 【エージェント】`playwright.config.ts` の既定のロケールを `ja-JP` にし、言語ごとの e2e（`ja-JP`・`en-US`・`zh-TW`・`fr-FR` で開いたときの言語・題名・S00・S01 の文言）を足す
  - 依存: T8-5

## Phase 9: 保存・環境設定（一般・音）と S01・S03f の改修
- [ ] T9-1 【エージェント】`storage/storage.ts`（`KeyValueStorage`、`LocalStorageKV`、`MemoryKV`）、`prefs/prefs.ts`（型と初期値）、`storage/prefs_codec.ts`（版番号つきの形の符号化と、項目ごとの検証）を作り、単体テストを書く
- [ ] T9-2 【エージェント】`prefs/store.svelte.ts`（`PrefsStore`。変えるたびに保存）を作る。`Settings` から `volume`・`vibrate` を外して `prefs` に移し、`theme.svelte.ts` を `theme.ts`（`prefs.theme` を `data-theme` に反映）に置き換え、起動時の言語を `prefs.locale ?? detectLocale(...)` にする。単体テストを直す
  - 依存: T9-1, T8-2
- [ ] T9-3 【エージェント】`app.html` のインラインスクリプトで、保存値の言語・テーマを描画前に反映する（キー名と形は `prefs_codec.ts` の定数を `hooks.server.ts` から渡す）
  - 依存: T9-1, T8-4
  - 画面: S00
- [ ] T9-4 【エージェント】部品 `Tabs`（WAI-ARIA の tabs）と `Checkbox` を作る。S90 の通常・hover・focus・disabled を持たせ、境界は `--color-border-input`
  - 依存: T7-3
  - 画面: S90
- [ ] T9-5 【エージェント】`PrefsScreen.svelte` に「一般」「音」の2つのタブを作る（720px 以上はダイアログ、未満は全画面。×・Esc で閉じ、歯車へフォーカスを戻す）。一般は言語・表示テーマ・終了の確認、音は音量・鳴らしてみる・振動（対応端末だけ）。使うキーを辞書に足す
  - 依存: T9-2, T9-4
  - 画面: S05, S05a
- [ ] T9-6 【エージェント】S01 のヘッダーを歯車のボタンだけにし（`ThemeMenu.svelte` を削除）、音のパネルを外す。`+page.svelte` に環境設定の開閉を足す。使うキーを辞書に足す
  - 依存: T9-5
  - 画面: S01, S01b, S01c, S01f
- [ ] T9-7 【エージェント】終了の確認に「今後この確認を表示しない」を足し、`Session` に `shouldConfirmEnd`・`onDontAskAgain`・`confirmFinish(dontAskAgain)` を足す。確認を出さない設定では「終了」ボタンも Esc もすぐ S01 に戻す。使うキーを辞書に足し、単体テストを書く
  - 依存: T9-2, T9-4
  - 画面: S03f
- [ ] T9-8 【エージェント】e2e を足し、既存の e2e を直す（S01 の音のパネル・テーマのメニュー・GitHub リンクを前提にしたもの）。保存の e2e は `page.addInitScript` で `localStorage` を用意して開く
  - 依存: T9-3, T9-6, T9-7

## Phase 10: アプリ情報・プライバシーポリシー・PWA の名前
- [ ] T10-1 【エージェント】`vite.config.ts` の `define` で `package.json` の `version` を `__APP_VERSION__` として埋め込み、型を宣言する
- [ ] T10-2 【エージェント】`scripts/oss_collect.ts`（Vite プラグイン）と、`routes/oss.json/+server.ts`・`routes/third_party_licenses.txt/+server.ts` を作る。インストールした版で、クライアントのビルドが書き出しより先に終わることを確かめ、成り立たなければ imple §3.11 の代わりの方法に切り替えて imple を直す
- [ ] T10-3 【エージェント】環境設定に「アプリ情報」タブ（S05b）を足す。アイコン・アプリ名・ひとこと説明・バージョン・ソースコードへのリンク（新しいタブ）・ライセンス・OSS 一覧（`oss.json`）・プライバシーポリシーへの入口。使うキーを辞書に足す
  - 依存: T10-1, T10-2, T9-5
  - 画面: S05b
- [ ] T10-4 【エージェント】プライバシーポリシー（S05c）を作る。S05b から開き、「アプリ情報」で戻る。`{version}` に `__APP_VERSION__` を入れる。使うキーを辞書に足す
  - 依存: T10-3
  - 画面: S05c
- [ ] T10-5 【エージェント】`scripts/gen_icons.ts` の manifest を英語表記にする（`name` "LT Timekeeper"、`short_name` "LT Timer"、`description` は en の辞書から、`lang` "en"、`id` は変えない）。`bun run gen:icons` を実行し、アイコンに差分がないことを確かめる
  - 依存: T8-1
- [ ] T10-6 【エージェント】S05b・S05c・manifest・オフラインの e2e を足す
  - 依存: T10-4, T10-5
- [ ] T10-7 【エージェント】英語・中国語の訳を見直し（意味を変えない範囲）、確認用の一覧（キー・ja・en・zh-Hans・画面ID）を `development/` に作る
  - 依存: T10-4
- [ ] T10-8 【ユーザー】T10-7 の一覧で訳を確認し、直したい箇所を伝える
  - 依存: T10-7
- [ ] T10-9 【エージェント】T10-8 の指摘を辞書に反映する（言い回しの修正は fix として記録する）
  - 依存: T10-8

## Phase 11: リリース準備（v0.2.0）
- [ ] T11-1 【エージェント】README 用のスクリーンショットを3言語で撮り、`docs/images/screenshot_{ja,en,zh-Hans}.png` に置く。`docs/lt_time_keeper_pr_v0.1.0.png` は参照をなくしてから削除する
  - 依存: T10-9
- [ ] T11-2 【エージェント】`README.md`（日本語）を利用者向けに書き直し、`README.en.md`・`README.zh-Hans.md` を作る。冒頭に言語のリンク、中身は目的・スクリーンショット・特徴・使い方・対応環境・プライバシー・ライセンス
  - 依存: T11-1
- [ ] T11-3 【エージェント】`CONTRIBUTING.md` を仕上げる（疑似ロケール、`check:i18n`、OSS 一覧の生成、保存のキー名、リポジトリ構成の更新）
  - 依存: T10-9
- [ ] T11-4 【エージェント】GitHub の About 欄の文案（英語の説明文・Webサイト・トピック）を提示する
  - 依存: T11-2
- [ ] T11-5 【エージェント】`CHANGELOG.md` に 0.2.0 を書き、`package.json` の version を 0.2.0 にする
  - 依存: T11-2, T11-3
- [ ] T11-6 【エージェント】リリース前の確認をする（ワークフローと同じ手順のローカル実行、アイコン一式が specs の最新のマスターSVGから生成されたものか、README の特徴・使い方・スクリーンショット・対応環境が実物と一致するか、各言語の README が `README.md` に追従しているか、訳がユーザーに確認済みか）。コミットメッセージとタグのコマンドを提示して停止する
  - 依存: T11-4, T11-5
- [ ] T11-7 【ユーザー】コミットして main に push し、`v0.2.0` タグを push する。Actions の完了後、ドラフトリリースを公開し、About 欄を設定する
  - 依存: T11-6
