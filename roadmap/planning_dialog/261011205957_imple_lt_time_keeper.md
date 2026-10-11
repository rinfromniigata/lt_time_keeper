# lt_time_keeper 実装設計（imple）

- 対象スペック: `roadmap/specs/lt_time_keeper_SPEC_v1.md`（プランアセット v1）
- 対応する tasks・walk: `261011210212_tasks_lt_time_keeper.md`・`261011210245_walk_lt_time_keeper.md`

---

## 1. 前提とバージョン

2026-10-11 に npm と公式ドキュメントで確認した値です。実装時は、インストールした版の公式ドキュメントで改めて確認します。

- `@sveltejs/kit` 3.0.x（3.0.1）、`svelte` 5.57.x、`vite` 8.x、`@sveltejs/vite-plugin-svelte` 7.x
- `@sveltejs/adapter-static` 4.0.x
- TypeScript（SvelteKit 3 の最低要件は 6。`sv create` が入れる版に従う）
- Bun 1.4.x（Pages の `BUN_VERSION` は 1.4.3）。ローカルの Bun は 1.3.14 のため、T1-1 の前にユーザーが上げる
- テスト: Vitest 5.x（純粋なTSの単体テスト）、Playwright 1.64.x（画面の結合テスト。`page.clock` で時刻を進める）
- アイコン生成: `@resvg/resvg-js` 2.6.x（SVG→PNG）。開発時の依存だけに入れる

SvelteKit 3 で、スペックシートの書き方から変わった点（スペックシートの §4 に注記済み）:

- `$service-worker` は廃止された。Service Worker は `src/service-worker/index.ts` に置き、`$app/manifest`（`immutable`・`assets`・`prerendered`）、`$app/env`（`version`）、`$app/paths`（`resolve`）、`$app/service-worker`（`self`）を使う。登録は `type: 'module'` になる
- `svelte.config.js` は使わず、`vite.config.ts` の `sveltekit({...})` に設定を書く
- `$lib` は `#lib` になり、`package.json` の `imports` で宣言する。import には拡張子を付ける
- `$app/environment` は `$app/env` に名前が変わった

## 2. 全体構成

画面は下の層を使うが、下の層は画面を知らない。純粋なTSの層（core）は、ブラウザAPIにもSvelteにも依存しない。

```
src/
├─ app.html                 起動画面（S00）の静的マークアップを含む
├─ routes/
│  ├─ +layout.ts            prerender = true, ssr = true
│  └─ +page.svelte          画面の切り替え（設定 ⇄ 計測）だけを持つ
├─ service-worker/
│  ├─ index.ts              事前キャッシュ・更新
│  └─ tsconfig.json
└─ lib/                     #lib/* として import する
   ├─ core/                 純粋なTS（テスト対象の中心）
   │  ├─ time.ts            時刻源の型、ミリ秒⇔表示の変換
   │  ├─ timer.ts           タイマーの状態遷移と計算
   │  └─ bells.ts           ベルの定義・並び・表記・判定
   ├─ settings/
   │  ├─ settings.ts        設定の型・初期値・検証（純粋なTS）
   │  ├─ repository.ts      保存インターフェースと「何もしない」実装
   │  └─ store.svelte.ts    設定ストア（runes）
   ├─ output/               「鳴らす」の実装
   │  ├─ ringer.ts          インターフェース
   │  ├─ audio_ringer.ts    Web Audio によるベル音の合成
   │  ├─ vibration_ringer.ts
   │  └─ composite_ringer.ts
   ├─ device/
   │  ├─ wake_lock.ts       スリープ防止
   │  └─ fullscreen.ts      全画面
   ├─ session/
   │  └─ session.svelte.ts  計測セッション（タイマー・ベル判定・出力・端末機能をつなぐ）
   ├─ pwa/
   │  └─ update.svelte.ts   新しい Service Worker の検知と切り替え
   ├─ theme/
   │  ├─ tokens.css         specs の tokens_v1.css の写し（値の唯一の置き場）
   │  ├─ base.css           リセット・共通の土台（値はトークン参照のみ）
   │  └─ theme.svelte.ts    テーマの選択（system / light / dark）と data-theme の反映
   └─ ui/
      ├─ parts/             部品（S90 の状態をすべて持つ）
      └─ screens/           SettingsScreen.svelte, TimerScreen.svelte ほか
scripts/
├─ check_tokens.ts          tokens の一致と、色・寸法の直書きを検査する
└─ gen_icons.ts             マスターSVGから各形式のアイコンを生成する
static/
├─ manifest.webmanifest    gen_icons.ts が生成する（色はトークンから読む）
└─ icons/                   生成したアイコン（リポジトリに含める）
docs/brand/                 brand.md とマスターSVGの写し
```

- 画面の遷移は `+page.svelte` 内の状態（`'settings' | 'timer'`）で切り替える。URLのルーティングは使わない
- 「計測セッション」は、スペックシート §5 の表にない層です。タイマー・ベル判定・出力・端末機能を束ねて、画面が計算をしないようにするために置きます（画面は `session` の値を描画し、操作を `session` に渡すだけにする）

## 3. コンポーネントの責務とインターフェース

### 3.1 time.ts

```ts
/** 単調増加するミリ秒を返す。本番は performance.now、テストは差し替える */
export type Now = () => number;

export const SECOND = 1000;
export const MAX_INPUT_MS = (99 * 60 + 59) * SECOND; // 99:59

/** 残り時間の表示（秒は切り上げ）。remainingMs > 0 のとき使う。例: 59001ms → "1:00" */
export function formatRemaining(remainingMs: number): string;
/** 超過時間の表示（秒は切り捨て）。例: 42900ms → "+0:42" */
export function formatOver(overMs: number): string;
/** 経過・持ち時間など、そのまま切り捨てで出す表示。例: "1:48" */
export function formatClock(ms: number): string;
```

- 残り時間は切り上げ、超過は切り捨てで表示する。残りが 0 になった瞬間に「+0:00」へ切り替わり、同時に超過になる
- このため、「残り 1:00」のベルは、表示が「1:00」に変わるのと同じ瞬間に鳴る（非機能要件「表示の秒と体感でずれない」）

### 3.2 timer.ts

```ts
export type Phase = 'ok' | 'warn' | 'over';

export interface TimerConfig {
  durationMs: number;          // 1秒以上
  warnAtElapsedMs: number | null; // 予鈴に変わる経過時間。予鈴の段階がなければ null
}

export interface TimerSnapshot {
  elapsedMs: number;           // 一時停止中の時間を除いた経過
  remainingMs: number;         // durationMs - elapsedMs（負になりうる）
  overMs: number;              // max(0, -remainingMs)
  phase: Phase;
  paused: boolean;
  progress: number;            // 残りの割合 0..1。超過では 1（赤で満たす）
}

export class Timer {
  constructor(config: TimerConfig, now: Now);
  start(): void;               // 開始時刻を記録する
  pause(): void;               // 一時停止の開始時刻を記録する
  resume(): void;              // 一時停止の長さを合計に足す
  snapshot(): TimerSnapshot;   // 毎回、開始時刻と一時停止の合計から計算する
}
```

- カウンターは持たない。`elapsed = now - startedAt - pausedTotal -（一時停止中なら now - pausedAt）`
- `phase`: `elapsed >= duration` なら over。`warnAtElapsedMs !== null && elapsed >= warnAtElapsedMs` なら warn。それ以外は ok
- 一時停止は phase とは別の `paused` で持つ。画面は `paused` を優先して灰色にする
- 終了は Timer を捨てることで表す（Timer に終了状態は持たせない）

### 3.3 bells.ts

```ts
export type BellBase = 'remaining' | 'over';   // 残り／超過後
export type Strikes = 1 | 2 | 3;

export interface Bell {
  id: string;           // 追加時に採番。並べ替えても変わらない
  base: BellBase;
  offsetMs: number;     // 0..MAX_INPUT_MS
  strikes: Strikes;
}

/** 計測開始からの経過で表したベルの時点。負なら鳴らない */
export function bellAtElapsed(bell: Bell, durationMs: number): number;
/** 時刻の早い順に並べる（同じ時点なら回数の多い順） */
export function sortBells(bells: Bell[], durationMs: number): Bell[];
/** 「残り」が持ち時間より長い＝鳴らないベル */
export function isSilent(bell: Bell, durationMs: number): boolean;
/** 予鈴に変わる経過時間。最初に鳴るベルが持ち時間より前にあればその時点、なければ null */
export function warnAtElapsed(bells: Bell[], durationMs: number): number | null;
/** 並び順の番号の表記。3件以下 "1鈴"、4件以上 "1" */
export function bellBadge(index: number, count: number): string;
/** 「次のベル」の表記。3件以下 "1鈴まで"、4件以上 "4番目のベルまで" */
export function nextBellLabel(index: number, count: number): string;
/** 行の補足文。'warn' | 'over' | 'silent' | null（null は「—」） */
export function bellNote(bell: Bell, bells: Bell[], durationMs: number): 'warn' | 'over' | 'silent' | null;

/** (prevElapsed, elapsed] のあいだに来たベルを、同じ時点ごとにまとめて返す。回数は最大値 */
export function dueStrikes(bells: Bell[], durationMs: number, prevElapsedMs: number, elapsedMs: number): Strikes[];
/** elapsed より後で最初に来るベル（並び順の番号と、そこまでの時間）。なければ null */
export function nextBell(bells: Bell[], durationMs: number, elapsedMs: number): { index: number; inMs: number } | null;
```

- 補足文の「赤に」は、時点が持ち時間と等しいベル（残り 0:00・超過後 +0:00）に付ける。「黄に」は `warnAtElapsed` と同じ時点の最初のベルに付ける
- 開始と同時に鳴るベル（残り＝持ち時間）を拾えるよう、開始直後の最初の判定は `prevElapsed = -1` から行う
- 同じベルを二度鳴らさない仕組みは、区間 `(prev, now]` を重ねずに進めることで保証する（`prev` は前回の判定で使った `elapsed`）

### 3.4 settings

```ts
export type ThemeChoice = 'system' | 'light' | 'dark';

export interface Settings {
  durationMs: number;
  bells: Bell[];
  title: string;
  volume: number;        // 0..1。初期値 0.7
  vibrate: boolean;      // 初期値 true（スイッチは対応端末でだけ出す）
}

export const DEFAULT_SETTINGS: Settings; // 5:00、残り1:00×1、残り0:00×2、超過+1:00×3、''、0.7、true

export interface SettingsIssues {
  durationZero: boolean;         // 開始できない
  silentBellIds: string[];       // 警告だけ。開始は止めない
}
export function validate(s: Settings): SettingsIssues;
export function canStart(s: Settings): boolean;

export interface SettingsRepository {
  load(): Settings | null;
  save(s: Settings): void;
}
export class NoopRepository implements SettingsRepository; // load は常に null、save は何もしない
```

- `store.svelte.ts` は `Settings` を `$state` で持つクラス。起動時に `repository.load() ?? DEFAULT_SETTINGS` で初期化し、変更のたびに `save` を呼ぶ（いまは何もしない）
- テーマはスペックシートで「設定」の一部とされているが、計測には関係しないため `theme.svelte.ts` に分けて持つ（同じく保存しない）

### 3.5 output（鳴らす）

```ts
export interface Ringer {
  /** 利用者の操作の中で呼ぶ（自動再生の制限を解除する） */
  unlock(): Promise<void>;
  ring(strikes: Strikes): void;
  setVolume(volume: number): void;
  /** 音を出せない状態か（AudioContext が running にならないなど） */
  readonly blocked: boolean;
}
```

- `AudioRinger`: AudioContext を1つ作り、`unlock` で `resume` する。ベル音は、正弦波の倍音を2〜3本重ね、指数関数的に減衰させて作る。複数回のときは一定の間隔をあけて続けて鳴らす。音量は GainNode で調整する
- `VibrationRinger`: `navigator.vibrate` に、回数分のパターンを渡す。`isSupported()` を静的に持ち、設定画面のスイッチの表示に使う
- `CompositeRinger`: 音と振動を同時に呼ぶ。振動がオフなら音だけ

### 3.6 device（端末機能）

```ts
export interface WakeLockControl {
  readonly supported: boolean;
  acquire(): Promise<boolean>;   // 失敗したら false
  release(): Promise<void>;
}
export interface FullscreenControl {
  readonly supported: boolean;   // document.fullscreenEnabled
  toggle(): Promise<void>;
}
```

- スリープ防止は、画面が見えなくなると解除される。見える状態に戻ったら取り直す（セッションが行う）

### 3.7 session（計測セッション）

```ts
export type Warning = 'audio' | 'wakeLock';

export class Session {
  constructor(settings: Settings, deps: { now: Now; ringer: Ringer; wakeLock: WakeLockControl });
  // 描画用の値（$state / $derived）
  readonly snapshot: TimerSnapshot;
  readonly display: { digits: string; sub: string; next: { label: string; in: string } | null };
  readonly warnings: Warning[];
  readonly controlsHidden: boolean;
  readonly confirming: boolean;
  // 操作
  start(): Promise<void>;        // 開始ボタンの処理の中で呼ぶ（unlock・wake lock を含む）
  togglePause(): void;
  requestFinish(): void;         // 確認を出す。計測は止めない
  cancelFinish(): void;
  finish(): void;                // 後片付け（wake lock 解除・ループ停止）
  dismissWarning(w: Warning): void;
  poke(): void;                  // マウス移動・キー・タップ。操作ボタンを再表示し、隠すまでの時間を数え直す
}
```

- 描画のループは `requestAnimationFrame` で回し、毎回 `snapshot()` を取り直す（再描画の間隔は委任事項）。ループの中で `dueStrikes(prev, now)` を求めて鳴らす
- 画面が見えないあいだ（`document.visibilityState === 'hidden'`）は rAF が止まるので、ベルも鳴らない。見える状態に戻ったら `prev` を現在の経過に合わせてから判定を再開する（裏にあったあいだに過ぎたベルは鳴らさない）。表示はその時点の正しい値になる
- 操作ボタンを隠す時間は、トークン `--controls-hide-delay` を `getComputedStyle` で読んで使う（値を直書きしない）。一時停止中と、確認ダイアログを出しているあいだは隠さない
- 状態の色・明滅は CSS のクラス（`is-ok` / `is-warn` / `is-over` / `is-paused`）で切り替える

### 3.8 pwa（更新）

```ts
export class UpdateNotifier {
  readonly available: boolean;   // 新しい SW が waiting
  dismissed: boolean;
  reload(): void;                // waiting に SKIP_WAITING を送り、controllerchange で再読み込み
}
```

- Service Worker は `version`（`$app/env`）を含むキャッシュ名を使う。`vite.config.ts` の `version.name` に `package.json` の version とビルド時刻を入れ、`cache-0.1.0+<時刻>` のようにする（SemVer をキャッシュ名に含めつつ、同じ版の再デプロイでも更新を検知するため）
- `install` で `immutable`・`assets`・`prerendered` をすべて事前にキャッシュする。`activate` で古いキャッシュを消す。`message` の `SKIP_WAITING` で `skipWaiting()` する
- 計測中に更新を受け取ったときは、S01 に戻るまで知らせない（`+page.svelte` で画面が `settings` のときだけ S01f を出す）
- 自動登録の挙動（`updatefound` を拾えるか）は、T5-1 でインストールした版の設定ドキュメントを確認して決める。拾えなければ自動登録を止め、自前で登録する

### 3.9 theme・ui

- `tokens.css` は specs の `lt_time_keeper_tokens_v1.css` を変更なしでコピーする。`--mock-` の値と、モックで vw を cqi に読み替えた部分は持ち込まない
- 部品は値をトークンからだけ参照する。モックにある計算式（例: `calc(var(--ring-size) * var(--ring-digit-ratio))`）は、トークンどうしの計算として書いてよい
- 広い画面（720px以上）の配置は、`.app` をコンテナにしたコンテナクエリで切り替える（720px はトークンにない値のため、ブレークポイントの定数として `base.css` の1か所にだけ書き、`check_tokens.ts` の例外に登録する）
- テーマは `<html data-theme>` を付け外しする。「OSに合わせる」では属性を外す
- リングは SVG の円で描き、`pathLength="100"` と `stroke-dasharray` で進み具合を表す（モックの円周の値に頼らない）

### 3.10 部品とモックの対応

- ボタン（主・通常・ゴースト・アイコン・危険・危険の塗り）、入力欄（数値・文字）、プリセット（チップ）、スイッチ、セグメント、状態ラベル、ベルの行、シート（モバイル）／ダイアログ（720px以上）、確認ダイアログ、警告バナー（警告・お知らせ）、テーマのメニュー、リング
- どの部品も S90 の通常・hover・focus・disabled を持つ。focus は `:focus-visible` でフォーカスリングを出す

## 4. データモデルと、メモリ上の状態の動き

永続化するデータはありません（保存インターフェースは「何もしない」実装）。代わりに、メモリ上の状態がどう変わるかを、架空の利用者の操作で示します。

### 4.1 状態の置き場所

- 設定ストア（`Settings`）: ページを開いてから閉じるまで残る
- テーマの選択（`ThemeChoice`）: 同上
- 計測セッション（`Session`）: 開始で作り、終了で捨てる
- 更新のお知らせ（`UpdateNotifier`）: ページを開いてから閉じるまで残る

### 4.2 画面の項目とデータの対応

- S01 持ち時間の分・秒・プリセット → `settings.durationMs`
- S01 表示名 → `settings.title`（S03 の上部に出す）
- S01 ベルの一覧・件数 → `settings.bells`（並びと番号は `sortBells`・`bellBadge` で毎回求める）
- S01d 基準・時刻・回数 → `Bell.base`・`Bell.offsetMs`・`Bell.strikes`
- S01 音量・振動 → `settings.volume`・`settings.vibrate`
- S01a のエラー・警告 → `validate(settings)` の結果（保持しない）
- S01e → `theme.choice`
- S01f → `update.available`・`update.dismissed`
- S03〜S03c の数字・リング・ラベル → `session.snapshot`・`session.display`
- S03d → `session.warnings`
- S03e → `session.controlsHidden`
- S03f → `session.confirming`

### 4.3 操作の流れ（架空の利用者「佐藤さん」）

1. ページを開く → `settings` が初期値（5:00、ベル3件、表示名なし、音量0.7、振動オン）になる。`theme` は system。セッションはない
2. プリセット「10分」を押す → `durationMs` が 600000 に変わる。ベルの時点は持ち時間から求めるので、`bells` は変わらない
3. 表示名に「LT」と入れる → `title` が変わる
4. 1鈴を開いて「残り 2:00」に変え、決定 → その `Bell` の `offsetMs` が変わる。`id` は変わらない。並びは表示のたびに求める
5. 「ベルを追加」で「残り 5:00・1回」を決定 → 新しい `id` の `Bell` が1件増える。並び順で先頭になり、番号は「1」〜「4」の数字表記に変わる
6. 追加したベルを開いて「キャンセル」→ 何も変わらない
7. 同じベルを開いて「削除」→ その `Bell` がなくなる。番号は「1鈴」〜「3鈴」に戻る
8. 「開始」→ `Session` が作られ、`Timer` が開始時刻を記録する。`settings` は変わらない（セッションは開始時点の値を使う）
9. 計測中にタブを切り替え、3分後に戻る → 状態は何も書き換えない。戻った時点で `snapshot` を取り直し、`prev` を現在の経過に合わせる。この間のベルは鳴らない
10. Space で一時停止 → `Timer` が一時停止の開始時刻を記録する。もう一度 Space で再開 → 一時停止の合計に足す
11. Esc → `confirming` が true になる。計測は続く。Esc → false に戻る（何も変わらない）。もう一度 Esc → Enter → セッションを捨て、S01 に戻る
12. S01 に戻る → `settings` は手順7の状態のまま（10分・表示名「LT」・ベル3件）
13. 「開始」を2回すばやく押す → 1回目で画面が S03 に切り替わるので、2回目の押下は届かない。開始の処理も、セッションがあるときは何もしない
14. ページを再読み込みする → すべて初期値に戻る

## 5. テストの方針

- core と settings は Vitest で単体テストする。時刻は `Now` を差し替えて進める
- 画面は Playwright で、ビルドした静的サイトを `vite preview` で開いて確かめる。時刻は `page.clock` で進める。音と振動は、テスト用に `Ringer` の呼び出しを記録して確かめる（`window` に記録用のフックを置くのは開発ビルドだけにする）
- `scripts/check_tokens.ts` は次を検査する。CI でも実行する
  - `src/lib/theme/tokens.css` と `roadmap/specs/` の最新版の tokens が一致すること
  - `src/` 内の `.svelte`・`.css` に、色（`#xxx`、`rgb(`、`hsl(`）と寸法（`px`・`rem`・`ms`）の直書きがないこと（`tokens.css` とブレークポイント定数を除く）

## 6. アイコン

- `scripts/gen_icons.ts` は、`roadmap/specs/` のマスターSVGを `@resvg/resvg-js` で描き、`static/icons/` に書き出す
  - `favicon.svg`（マスターのコピー）、`favicon-32.png`、`icon-192.png`、`icon-512.png`、`icon-maskable-512.png`（モチーフを拡大・移動しない）、`apple-touch-icon.png`（180px）、`og.png`（1200×630。地はマスターSVGの背景色を読み取って使い、アイコンを中央に置く）
- 生成したファイルはリポジトリに含める。CI では生成しない

## 7. 公開・CI

- Cloudflare Pages の GitHub 連携（ビルド `bun run build`、出力 `build`、`BUN_VERSION=1.4.3`、独自ドメイン `lt.rinontech.com`）。設定はユーザーが行う
- `.github/workflows/release.yml`: `v*` タグで起動 → Bun を入れる → `bun install --frozen-lockfile` → `check_tokens` → `bun run check` → `bun run test` → `bun run build` → `build/` を zip にしてドラフトリリースを作る
- バージョンは `package.json` だけにある。`CHANGELOG.md` は Keep a Changelog 形式で書く
