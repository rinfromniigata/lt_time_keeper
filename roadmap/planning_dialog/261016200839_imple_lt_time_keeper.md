# lt_time_keeper 実装設計（imple）

- 対象スペック: `roadmap/specs/lt_time_keeper_SPEC_v3.md`（プランアセット v3、アプリ v0.2.0）
- 対応する tasks・walk: `261016200839_tasks_lt_time_keeper.md`・`261016200839_walk_lt_time_keeper.md`
- 仕様変更サマリー: `roadmap/development/261016195942_change_v0_2_0_update.md`
- 前版: `roadmap/archived/261011225751_imple_lt_time_keeper.md`（v0.1.0）。この版は前版を引き継ぎ、v0.2.0 で変わる部分を書き換えた。変わった節には【v0.2.0】を付けた

---

## 1. 前提とバージョン

2026-10-16 にインストール済みの版で確認した値です。実装時は、使う API をその版の公式ドキュメントで改めて確認します。

- `@sveltejs/kit` 3.0.1、`svelte` 5.57.2、`vite` 8.3.4、`@sveltejs/adapter-static` 4.0.0、TypeScript 6.0.3
- Bun 1.4.3（ローカル・Pages の `BUN_VERSION`・CI とも）
- テスト: Vitest 4.1.11（純粋なTSの単体テスト）、Playwright 1.64.0（画面の結合テスト。`page.clock` で時刻を進める）
- アイコン生成: `@resvg/resvg-js` 2.6.x（開発時の依存だけ）
- 【v0.2.0】依存は増やさない。i18n・OSS一覧・保存は自作する（スペック §4）

SvelteKit 3 で、一般的な書き方から変わっている点（v0.1.0 で確認済み）:

- Service Worker は `src/service-worker/index.ts` に置き、`$app/manifest`（`immutable`・`assets`・`prerendered`）、`$app/env`（`version`）、`$app/service-worker`（`self`）を使う
- `svelte.config.js` は使わず、`vite.config.ts` の `sveltekit({...})` に設定を書く
- `$lib` は `#lib` になり、`package.json` の `imports` で宣言する。import には拡張子を付ける

## 2. 全体構成

画面は下の層を使うが、下の層は画面を知らない。純粋なTSの層（core・i18n の辞書処理・保存の形の検証）は、ブラウザAPIにもSvelteにも依存しない。

```
src/
├─ app.html                 起動画面（S00）の枠と、描画前に言語・テーマを決めるインラインスクリプト【v0.2.0】
├─ hooks.server.ts          【v0.2.0】書き出し時に、辞書から S00 の文言・題名の表を app.html に差し込む
├─ routes/
│  ├─ +layout.ts            prerender = true, ssr = true
│  ├─ +page.svelte          画面の切り替え（設定 ⇄ 計測）と、環境設定の開閉
│  ├─ oss.json/+server.ts               【v0.2.0】S05b が読む OSS 一覧（書き出し時に生成）
│  └─ third_party_licenses.txt/+server.ts【v0.2.0】ライセンス全文（書き出し時に生成）
├─ service-worker/
│  └─ index.ts              事前キャッシュ・更新（変更なし。上の2つは prerendered に入るので自動で事前キャッシュされる）
└─ lib/
   ├─ core/                 純粋なTS
   │  ├─ time.ts            時刻源の型、ミリ秒⇔表示の変換
   │  ├─ timer.ts           タイマーの状態遷移と計算
   │  └─ bells.ts           ベルの定義・並び・判定。表記は辞書のメッセージで返す【v0.2.0】
   ├─ i18n/                 【v0.2.0】
   │  ├─ locales/ja.json    原文（文言の正本）
   │  ├─ locales/en.json
   │  ├─ locales/zh-Hans.json
   │  ├─ messages.ts        キーの型、メッセージの型、format（純粋なTS）
   │  ├─ detect.ts          ブラウザの言語から対応言語を選ぶ（純粋なTS）
   │  ├─ pseudo.ts          疑似ロケールの生成（開発時だけ）
   │  └─ i18n.svelte.ts     現在の言語（$state）、t()、<html lang>・<title> の反映
   ├─ storage/              【v0.2.0】
   │  ├─ storage.ts         キーと文字列の読み書きのインターフェース、localStorage とメモリの実装
   │  └─ prefs_codec.ts     保存の形（版番号つき）の符号化と検証（純粋なTS）
   ├─ prefs/                【v0.2.0】
   │  ├─ prefs.ts           環境設定の型と初期値
   │  └─ store.svelte.ts    環境設定のストア（変わるたびに保存）
   ├─ settings/             計測の設定（持ち時間・ベル・表示名。保存しない）
   │  ├─ settings.ts        型・初期値・検証。volume・vibrate は prefs へ移した【v0.2.0】
   │  ├─ repository.ts      保存インターフェースと「何もしない」実装（変更なし）
   │  └─ store.svelte.ts
   ├─ output/               音と振動（変更なし）
   ├─ device/               スリープ防止・全画面（変更なし）
   ├─ session/
   │  └─ session.svelte.ts  計測セッション。表示はメッセージで返し、終了の確認の要否を受け取る【v0.2.0】
   ├─ pwa/
   │  └─ update.svelte.ts   新しい Service Worker の検知と切り替え（変更なし）
   ├─ theme/
   │  ├─ tokens.css         specs の tokens_v3.css の写し（値の唯一の置き場）
   │  ├─ base.css
   │  ├─ splash.css
   │  └─ theme.ts           prefs.theme を <html data-theme> に反映する【v0.2.0】（theme.svelte.ts から置き換え）
   └─ ui/
      ├─ parts/             部品。ThemeMenu.svelte は廃止【v0.2.0】。Tabs・Checkbox を追加
      └─ screens/           SettingsScreen・TimerScreen・PrefsScreen【v0.2.0】
scripts/
├─ check_tokens.ts          tokens の一致と、色・寸法の直書き、状態色の文字に -text を使っているかを検査する【v0.2.0】
├─ check_i18n.ts            【v0.2.0】辞書のキー・プレースホルダ・未使用キー・直書きを検査する
├─ oss_collect.ts           【v0.2.0】Vite プラグイン。クライアントのバンドルに入ったパッケージを集める
└─ gen_icons.ts             マスターSVGから各形式のアイコンと manifest を生成する
docs/brand/                 brand.md とマスターSVGの写し（v3）
docs/images/                【v0.2.0】README のスクリーンショット（版番号なしの固定名）
```

- 画面の遷移は `+page.svelte` 内の状態（`'settings' | 'timer'`）と、環境設定を開いているか（`prefsOpen`）で切り替える。URLのルーティングは使わず、言語もURLに入れない
- 「計測セッション」はスペック §5 の表にない層で、タイマー・ベル判定・出力・端末機能を束ねて、画面が計算をしないようにする

## 3. コンポーネントの責務とインターフェース

### 3.1 time.ts（変更なし）

```ts
export type Now = () => number;
export const SECOND = 1000;
export const MAX_INPUT_MS = (99 * 60 + 59) * SECOND; // 99:59
export function formatRemaining(remainingMs: number): string; // 秒は切り上げ。59001ms → "1:00"
export function formatOver(overMs: number): string;           // 秒は切り捨て。42900ms → "+0:42"
export function formatClock(ms: number): string;              // 切り捨て。"1:48"
```

- 時刻の表記（`m:ss`・`+m:ss`）は3言語で共通（スペック §3）。辞書には入れず、メッセージの引数として渡す

### 3.2 timer.ts（変更なし）

- `Timer`（`start`・`pause`・`resume`・`snapshot`）。カウンターは持たず、`elapsed = now - startedAt - pausedTotal -（一時停止中なら now - pausedAt）` で毎回求める
- `phase`: `elapsed >= duration` なら over、`warnAtElapsedMs` 以降なら warn、それ以外は ok。一時停止は `paused` で別に持つ

### 3.3 bells.ts【v0.2.0】

判定の関数（`bellAtElapsed`・`sortBells`・`isSilent`・`warnAtElapsed`・`bellNote`・`dueStrikes`・`nextBell`）は変えない。日本語の文字列を返していた2つの関数を、辞書のメッセージを返す形にする。

```ts
import type { Message } from '../i18n/messages.ts';

/** 並び順の番号。3件以下 settings.bells.label_ordinal（1鈴・Bell 1・第 1 铃）、4件以上 settings.bells.label_number（1） */
export function bellBadge(index: number, count: number): Message;
/** 「次のベル」の文に入れるベルの名前。3件以下は bellBadge と同じ、4件以上 timer.bell_ordinal_long（4番目のベル） */
export function nextBellName(index: number, count: number): Message;
```

- 「〜まで」は `timer.next_bell_long`・`timer.next_bell_short` の側で組む（`{label}` に上のメッセージを入れる）。文字列をつなげて文を作らない

### 3.4 i18n【v0.2.0】

```ts
// messages.ts（純粋なTS）
import ja from './locales/ja.json';
export type MessageKey = keyof typeof ja;
export type Locale = 'ja' | 'en' | 'zh-Hans';
export const LOCALES: readonly Locale[] = ['ja', 'en', 'zh-Hans'];
/** 文字列、または複数形の形ごとの文字列（Intl.PluralRules の分類） */
export type MessageValue = string | Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type Dictionary = Record<MessageKey, MessageValue>;
/** 引数には、文字列・数値のほか、別のメッセージを入れられる */
export interface Message { key: MessageKey; args?: Record<string, string | number | Message> }
export function msg(key: MessageKey, args?: Message['args']): Message;
/** 辞書を引いて組み立てる。複数形は args.n で選ぶ。キーがなければ原文（ja）にフォールバック */
export function format(dicts: Record<string, Dictionary>, locale: string, m: Message): string;

// detect.ts（純粋なTS）
/** navigator.languages を先頭から見て、ja* → ja、en* → en、zh*（繁体字を含む）→ zh-Hans。どれもなければ en */
export function detectLocale(languages: readonly string[]): Locale;

// i18n.svelte.ts
class I18n {
  locale = $state<Locale | 'pseudo'>('ja');
  t(key: MessageKey, args?: Message['args']): string;
  tm(m: Message): string;              // Message をそのまま渡す版（session・bells から受け取った値に使う）
  apply(): void;                       // <html lang> と document.title を現在の言語に合わせる（$effect から呼ぶ）
}
export const i18n: I18n;
```

- 辞書は3つとも起動時に静的に import する（124キー × 3 と小さく、切り替えで読み込み直さないため。スペック §4）
- 辞書の形はモックと同じ平らなキー（`"settings.bells.add": "…"`）。キーの各階層はスネークケース
- モックの辞書の `sample.title_short`・`sample.title_long` は利用者の入力の見本なので移さない（122キー）。表示名の欄の例（`settings.title.placeholder`）は残す
- `t()` は `this.locale` を読むので、言語を変えると、それを使っている箇所だけがその場で書き換わる。ストアの値（持ち時間・ベル・表示名）には触れない
- 言語名（日本語・English・简体中文）は辞書に入れず、`LOCALE_NAMES` の定数として持つ（常にその言語自身の表記。スペック §4）。直書きの検査の例外に登録する
- 数値の整形は `Intl`（音量の「70%」は `Intl.NumberFormat(locale, { style: 'percent' })`）
- `<html lang>` の値は `ja`・`en`・`zh-Hans`。書体は tokens の `:root:lang(...)` が切り替える
- **型による検査**: `MessageKey` は ja から作る。`en.json`・`zh-Hans.json` を `Dictionary` として読み込む箇所で `satisfies` を使い、欠けたキーを型エラーにする。余分なキー・プレースホルダの不一致は `check:i18n` で落とす
- **疑似ロケール**（`pseudo.ts`）: ja の各値を、前後を `［…］` で囲み、長さを約1.4倍に伸ばした文字列に変える（プレースホルダは残す）。開発サーバー（`import.meta.env.DEV`）か、環境変数 `VITE_PSEUDO_LOCALE=1` を付けたビルドで、URL に `?pseudo` を付けて開いたときだけ有効にする。公開版の言語選択には出さず、保存もしない

### 3.5 起動直後の言語とテーマ【v0.2.0】

書き出した HTML は1言語でしか描けないため、描画前に決める。

- `app.html` の `<head>` の先頭に小さなインラインスクリプトを置く
  1. `localStorage` の環境設定（§4 の形）を読む。読めなければ初期値
  2. 言語 = 保存値 ?? `navigator.languages` から決めた言語。`<html lang>` を書き換え、`document.title` をその言語のアプリ名にする
  3. テーマが light・dark なら `<html data-theme>` を付ける
- S00 の「読み込み中…」とアプリ名の表は、`hooks.server.ts` の `transformPageChunk` で、書き出し時に辞書から差し込む（`app.html` に文言を直書きしない）。S00 は3言語の文言を `lang` 属性つきで持ち、CSS で `<html lang>` に合うものだけを出す
- インラインスクリプトの言語の判定は `detect.ts` と同じ規則を手で書くことになるため、e2e で一致を確かめる（`ja-JP`・`en-US`・`zh-TW`・`fr-FR` のブラウザで開く）
- OGP と `<meta name="description">` は、JS を動かさないクローラー向けで1言語しか出せないため、原文（日本語）の辞書から差し込む
- 保存のキー名と形は `storage/prefs_codec.ts` が持ち、インラインスクリプトはその定数を `transformPageChunk` で受け取る（キー名を2か所に書かない）

### 3.6 storage・prefs【v0.2.0】

```ts
// storage.ts
export interface KeyValueStorage {
  read(key: string): string | null;    // 使えないとき・例外のときは null
  write(key: string, value: string): void; // 使えないとき・例外のときは何もしない
}
export class LocalStorageKV implements KeyValueStorage; // try/catch で囲む（プライベートモード・容量超過・無効化）
export class MemoryKV implements KeyValueStorage;       // テスト用

// prefs.ts
export type ThemeChoice = 'system' | 'light' | 'dark';
export interface Prefs {
  locale: Locale | null;   // null = まだ選んでいない（毎回ブラウザの言語で決める）
  theme: ThemeChoice;      // 初期値 'system'
  volume: number;          // 0..1。初期値 0.7
  vibrate: boolean;        // 初期値 true
  confirmEnd: boolean;     // 初期値 true（終了の確認を出す）
}
export const DEFAULT_PREFS: Readonly<Prefs>;

// prefs_codec.ts（純粋なTS）
export const PREFS_KEY = 'lt_time_keeper.prefs';
export const PREFS_VERSION = 1;
export function encodePrefs(p: Prefs): string;          // {"v":1,"locale":…,"theme":…,"volume":…,"vibrate":…,"confirmEnd":…}
/** JSON でない・v が違う・オブジェクトでない → null（全体を初期値に）。項目ごとに型や範囲が違えば、その項目だけ初期値 */
export function decodePrefs(raw: string | null): Prefs | null;

// prefs/store.svelte.ts
export class PrefsStore {
  constructor(storage: KeyValueStorage);
  readonly locale: Locale | null; readonly theme: ThemeChoice; readonly volume: number;
  readonly vibrate: boolean; readonly confirmEnd: boolean;
  setLocale(l: Locale): void; setTheme(t: ThemeChoice): void; setVolume(v: number): void;
  setVibrate(v: boolean): void; setConfirmEnd(v: boolean): void;  // どれも、変えたらすぐ保存する
}
```

- 保存の形に版番号（`v`）を持たせ、将来の名前付きプリセットで形を変えられるようにする（スペック §5）。v0.1.0 は何も保存していないので、移行は要らない
- 音量の保存は、スライダーを動かすたびに書く（値が小さく、`localStorage` は同期で速いため間引かない）
- `SettingsStore`（計測の設定）は `NoopRepository` のまま保存しない。`Settings` から `volume`・`vibrate` を外す
- テーマは `theme.ts` が `prefs.theme` を `$effect` で `<html data-theme>` に反映する（「システム」では属性を外す）

### 3.7 output・device（変更なし）

- `Ringer`（`unlock`・`ring`・`setVolume`・`blocked`）、`AudioRinger`（Web Audio でベル音を合成）、`VibrationRinger`（`isSupported()`）、`CompositeRinger`
- `WakeLockControl`・`FullscreenControl`
- 【v0.2.0】音量は `prefs.volume` を `$effect` で `AudioRinger.setVolume` に渡す。振動を添えるかは、開始時の `prefs.vibrate` で決める

### 3.8 session【v0.2.0】

変更点だけを書く（ほかは前版のとおり。rAF で毎回 `snapshot()`、`dueStrikes(prev, now)` で鳴らす、見えない間は鳴らさず戻ったら `prev` を合わせる、操作ボタンは `--controls-hide-delay` で隠す）。

```ts
export interface SessionDisplay {
  digits: string;                       // "3:12" / "+0:42"（言語によらない）
  sub: Message | null;                  // timer.elapsed（通常のときだけ）
  next: { name: Message; in: string } | null; // 画面が timer.next_bell_long / _short に入れる
}

export class Session {
  constructor(settings: Settings, deps: {
    now: Now; ringer: Ringer; wakeLock: WakeLockControl; onfinish?: () => void;
    shouldConfirmEnd: () => boolean;    // 終了の確認を出すか（prefs.confirmEnd を読む）
    onDontAskAgain: () => void;         // 「今後この確認を表示しない」を入れて終了したとき（prefs.setConfirmEnd(false)）
  });
  requestFinish(): void;                // 確認を出す設定なら confirming = true、そうでなければすぐ finish + onfinish
  confirmFinish(dontAskAgain: boolean): void; // dontAskAgain なら onDontAskAgain を呼んでから終了
  cancelFinish(): void;                 // チェックの状態は保存しない
}
```

- 状態ラベル（予鈴・超過・一時停止中）は、画面が `snapshot.phase`・`paused` から辞書のキーを選ぶ
- 確認のチェックボックスの状態はダイアログの中だけに持ち、確認を開くたびにオフから始める
- Esc・「終了」ボタンは、どちらも `requestFinish` を呼ぶ（確認を出さない設定ならすぐ S01 へ）

### 3.9 pwa（ほぼ変更なし）

- Service Worker のキャッシュ名は `cache-<version>+<ビルド時刻>`。`install` で `immutable`・`assets`・`prerendered` を事前キャッシュし、`activate` で古いキャッシュを消す。`SKIP_WAITING` で切り替える
- 【v0.2.0】辞書は JS に入るので `immutable` に含まれる。`oss.json`・`third_party_licenses.txt` は書き出したページとして `prerendered` に含まれる。どちらも追加の設定なしで事前キャッシュされることを W10 で確かめる
- 【v0.2.0】マニフェストは英語表記で固定（スペック §2）：`name` "LT Timekeeper"、`short_name` "LT Timer"、`description` は en の `prefs.about.tagline`、`lang` "en"。`id` は変えない。`gen_icons.ts` が en の辞書から作る

### 3.10 環境設定の画面（S05〜S05c）【v0.2.0】

- `PrefsScreen.svelte` を、720px 以上では S01 に重ねたモーダルのダイアログ、未満では全画面で出す（モックの S05・S05b のデスクトップ／モバイル）
- 開く：S01 のヘッダーの歯車（`header.open_prefs`）。計測中は S01 がないので開けない
- 閉じる：×（`common.close`）・Esc・ダイアログの外側（デスクトップ）。閉じたら歯車へフォーカスを戻す
- タブ（`prefs.tab.general`・`sound`・`about`）は WAI-ARIA の tabs（左右キーで移動）。開くたびに「一般」から始める
- 一般（S05）：言語（セグメント、`LOCALE_NAMES`）、表示テーマ（セグメント）、終了の確認（チェックボックス）
- 音（S05a）：音量（スライダーと割合の表示）、鳴らしてみる、振動（`VibrationRinger.isSupported()` のときだけ）
- アプリ情報（S05b）：アイコン（スプライトの `ic-brand`）、アプリ名、ひとこと説明、バージョン、ソースコード（`https://github.com/rinfromniigata/lt_time_keeper`）、ライセンス、OSS一覧、プライバシーポリシーへの入口
  - バージョンは `vite.config.ts` の `define` で `package.json` の `version` を `__APP_VERSION__` として埋め込む（Service Worker 用の `+ビルド時刻` は付けない）
  - OSS 一覧は `oss.json` を `fetch` して表示する（同じオリジン。オフラインでも SW のキャッシュから返る）。開発サーバーでは空の一覧を返す
- プライバシーポリシー（S05c）：S05b の中で切り替える下位の表示。タブは「アプリ情報」のまま、左上の「アプリ情報」（`i-back`）で S05b に戻る。`{version}` には `__APP_VERSION__` を入れる
- 新しい部品：`Tabs`、`Checkbox`（S90 の状態をすべて持つ。境界は `--color-border-input`）

### 3.11 OSS 一覧の生成【v0.2.0】

- `scripts/oss_collect.ts` を Vite プラグインとして `vite.config.ts` に足す
  - クライアントのビルドの `generateBundle` で、出力に入ったモジュールの ID から `node_modules/<パッケージ>` を取り出し、重複を除く
  - 各パッケージの `package.json`（`name`・`version`・`license`）と、`LICENSE*`・`NOTICE*` のファイルを読み、`.svelte-kit/oss/packages.json` に書く
- `routes/oss.json/+server.ts`・`routes/third_party_licenses.txt/+server.ts`（`prerender = true`）は、書き出し時に `.svelte-kit/oss/packages.json` を読んで返す
  - `oss.json`: `[{ name, version, license }]`（名前の順）
  - `third_party_licenses.txt`: パッケージごとに、名前・版・ライセンス名・ライセンスの全文（著作権表示を含む）を並べたテキスト
- クライアントのビルドが書き出しより先に終わることを前提にしている。T10-2 で、インストールした版のビルドの順序を確かめ、前提が成り立たない場合は、ビルド後に `build/` へ書き出すスクリプトに切り替える（その場合は SW の事前キャッシュに明示的に足す）
- ライセンスのファイルがないパッケージは `license` の名前だけを書き、ビルドのログで警告する

### 3.12 theme・ui

- `tokens.css` は specs の `lt_time_keeper_tokens_v3.css` を変更なしでコピーする。`--mock-` の値と、モックで vw を cqi に読み替えた部分は持ち込まない
- 【v0.2.0】状態色で文字を書くときは `--color-state-*-text` を使う（状態ラベル・ベルの行の補足文・次のベル）。リング・点・アイコンは無印の `--color-state-*`
- 【v0.2.0】入力欄・チェックボックス・スイッチ・セグメントの境界は `--color-border-input`。パネルや行の区切りは `--color-border`
- 部品は値をトークンからだけ参照する。広い画面（720px以上）の配置はコンテナクエリで切り替え、720px は `base.css` の1か所だけに書く
- リングは SVG の円で描き、`pathLength="100"` と `stroke-dasharray` で進み具合を表す
- 文字列の長さが言語で変わっても崩れないよう、ボタンやラベルに固定幅を使わない。長い補足文は省略せずに折り返す（表示名だけは1行で省略。スペック §2）

### 3.13 部品とモックの対応

- ボタン（主・通常・ゴースト・アイコン・危険・危険の塗り）、入力欄、プリセット、スイッチ、チェックボックス【v0.2.0】、セグメント、タブ【v0.2.0】、状態ラベル、ベルの行、シート／ダイアログ、確認ダイアログ、警告バナー・お知らせバナー、リング
- テーマのメニュー（S01e）とヘッダーの GitHub リンクは廃止【v0.2.0】
- どの部品も S90 の通常・hover・focus・disabled を持つ。focus は `:focus-visible` でフォーカスリングを出す

## 4. データモデルと動き

### 4.1 状態の置き場所

- 環境設定（`Prefs`）【v0.2.0】: `localStorage` の `lt_time_keeper.prefs` に保存する。ページを閉じても残る
- 計測の設定（`Settings`：持ち時間・ベル・表示名）: メモリだけ。ページを開いてから閉じるまで残る
- 現在の言語（`i18n.locale`）: `prefs.locale ?? detectLocale(navigator.languages)` から作る。メモリ上の状態
- 計測セッション（`Session`）: 開始で作り、終了で捨てる
- 更新のお知らせ（`UpdateNotifier`）: ページを開いてから閉じるまで残る

### 4.2 保存する形

```json
{ "v": 1, "locale": "en", "theme": "dark", "volume": 0.5, "vibrate": true, "confirmEnd": false }
```

- `locale` は、環境設定で言語を選ぶまで `null`（ブラウザの言語に毎回合わせるため）
- 読み込みの規則：JSON として読めない・`v` が 1 でない → 全体を捨てて初期値。項目の型や範囲が違う（例：`volume: 2`、`theme: "blue"`）→ その項目だけ初期値。知らない項目は無視する
- 書き込みは、いずれかの値を変えるたびに全体を書き直す

### 4.3 画面の項目とデータの対応

- S01 持ち時間・プリセット → `settings.durationMs`
- S01 表示名 → `settings.title`
- S01 ベルの一覧 → `settings.bells`（並びと番号は毎回求める）
- S01d 基準・時刻・回数 → `Bell.base`・`Bell.offsetMs`・`Bell.strikes`
- S01a のエラー・警告 → `validate(settings)` の結果（保持しない）
- S01f → `update.available`・`update.dismissed`
- S03〜S03c → `session.snapshot`・`session.display`
- S03d → `session.warnings`、S03e → `session.controlsHidden`、S03f → `session.confirming`
- S03f「今後この確認を表示しない」→ ダイアログ内の一時的な値。「終了する」で `prefs.confirmEnd = false`
- S05 言語 → `prefs.locale`（と `i18n.locale`）、表示テーマ → `prefs.theme`、終了の確認 → `prefs.confirmEnd`
- S05a 音量 → `prefs.volume`、振動 → `prefs.vibrate`、鳴らしてみる → 保存しない
- S05b バージョン → `__APP_VERSION__`、OSS 一覧 → `oss.json`（どちらも保存しない）
- S05c → 保存しない（`{version}` だけ `__APP_VERSION__`）

### 4.4 操作の流れ（架空の利用者「陳さん」。ブラウザの言語は `zh-TW`）

1. 初めてページを開く → `localStorage` に何もないので、`prefs` は初期値（`locale: null`、テーマ system、音量 0.7、振動オン、確認オン）。言語は `zh-TW` から簡体字中国語に決まり、`<html lang="zh-Hans">`、題名は「LT 计时器」。**何も保存しない**（値を変えていないため）
2. 持ち時間を10分にし、表示名に「LT」と入れる → `settings` だけが変わる。`localStorage` は変わらない
3. 歯車で環境設定を開く → 何も変わらない。タブは「一般」
4. 言語で「日本語」を選ぶ → `prefs.locale = 'ja'`、**保存する**（`{"v":1,"locale":"ja",…}`）。画面がその場で日本語になり、`<html lang="ja">`、題名「LTタイムキーパー」。10分と「LT」は残る
5. テーマで「ダーク」を選ぶ → `prefs.theme = 'dark'`、保存する。`<html data-theme="dark">`
6. 「音」タブで音量を 50% にする → 動かすたびに `prefs.volume` を保存する（最後は 0.5）
7. 「鳴らしてみる」→ 0.5 の音量で1回鳴る。何も保存しない
8. 環境設定を閉じて「開始」→ `Session` を作る。`settings`・`prefs` は変わらない
9. Esc → 確認（S03f）が出る。チェックを入れて「続ける」→ 確認が閉じ、**保存しない**（`confirmEnd` は true のまま）
10. もう一度 Esc → 確認のチェックはオフから始まる。チェックを入れて Enter（終了する）→ `prefs.confirmEnd = false`、保存する。S01 に戻り、10分・「LT」は残る
11. もう一度開始して Esc → 確認を出さず、すぐ S01 に戻る
12. ページを閉じて開き直す → インラインスクリプトが保存値を読み、描画前に `lang="ja"`・`data-theme="dark"`。`settings` は初期値（5:00、ベル3件、表示名なし）に戻る。`prefs` は手順10の状態（日本語・ダーク・0.5・振動オン・確認オフ）
13. 環境設定で「計測を終了するときに確認する」をオンに戻す → `confirmEnd = true`、保存する
14. ブラウザの設定でこのサイトのデータを消す → 次に開くと手順1と同じ状態（言語は再びブラウザの言語）
15. 保存値が壊れている（`{"v":1,"theme":"blue","volume":"x"}`）状態で開く → `theme`・`volume` だけ初期値、`locale` は欠けているので `null`。画面は正常に開く。次に値を変えたときに正しい形で書き直す
16. `localStorage` が使えないブラウザで開く → 初期値で動く。値を変えると画面には反映されるが、保存はされない（エラーは出さない）

## 5. テストの方針

- core・i18n（format・detect・pseudo）・storage（codec）・prefs・settings・session は Vitest で単体テストする。時刻は `Now` を差し替えて進める
- 画面は Playwright で、ビルドした静的サイトを `vite preview` で開いて確かめる。時刻は `page.clock` で進める
  - 【v0.2.0】`playwright.config.ts` の既定のロケールを `ja-JP` にする（既存の e2e が日本語の文言で要素を探しているため）。言語ごとのテストは `test.use({ locale })` で切り替える
  - 【v0.2.0】保存のテストは `page.addInitScript` で `localStorage` に値を入れてから開く
- `scripts/check_tokens.ts`（`bun run check:tokens`）
  - tokens.css が specs の最新版と一致すること
  - `.svelte`・`.css` に色と寸法の直書きがないこと
  - 【v0.2.0】`color:` に無印の `--color-state-*` を使っていないこと（文字には `-text` を使う）
- 【v0.2.0】`scripts/check_i18n.ts`（`bun run check:i18n`）
  - 3つの辞書のキーが一致し、余分・不足がないこと
  - 各キーのプレースホルダの集合が、ja と一致すること（複数形の各形もそれぞれ）
  - `src/` の中で参照されないキーがないこと（キーは `t('…')`・`msg('…')`・`key: '…'` の形で書き、静的に拾えるようにする）
  - `.svelte` のテンプレートの文字と、`aria-label`・`title`・`placeholder`・`alt` の値に、文字（`\p{L}`）の直書きがないこと（`LOCALE_NAMES` など、登録した例外を除く）
  - CI（`release.yml`）で `check:tokens` の後に実行する

## 6. アイコン

- `scripts/gen_icons.ts` は、`roadmap/specs/` の最新版のマスターSVGを描き、`static/icons/` に書き出す（favicon.svg・favicon-32.png・icon-192/512.png・icon-maskable-512.png・apple-touch-icon.png・og.png）。生成物はリポジトリに含め、CI では生成しない
- 【v0.2.0】マスターSVGは v2 から変わらないので、生成したアイコンは変わらない想定。再生成して差分がないことを確かめる。manifest の名前は英語にする（§3.9）

## 7. 公開・CI・ドキュメント

- Cloudflare Pages の GitHub 連携（ビルド `bun run build`、出力 `build`、`BUN_VERSION=1.4.3`、`lt.rinontech.com`）。変更なし
- `.github/workflows/release.yml`: `v*` タグで起動 → `bun install --frozen-lockfile` → `check:tokens` → `check:i18n`【v0.2.0】 → `check` → `test` → `build` → ドラフトリリース
- バージョンは `package.json` だけにある。`CHANGELOG.md` は Keep a Changelog 形式
- 【v0.2.0】`README.md`（日本語・原文）・`README.en.md`・`README.zh-Hans.md`：利用者向け。冒頭に言語のリンク。目的・スクリーンショット・特徴・使い方・対応環境・プライバシー・ライセンス
- 【v0.2.0】`CONTRIBUTING.md`（日本語）：受け付け方針、開発環境、セットアップ、確認・テスト（`check:i18n`・疑似ロケールを含む）、ビルド、アイコン生成、リリース手順、リポジトリ構成。いまの README の開発情報はここへ移す
- 【v0.2.0】スクリーンショットは `docs/images/` に、`screenshot_ja.png`・`screenshot_en.png`・`screenshot_zh-Hans.png` の固定名で置く。いまの `docs/lt_time_keeper_pr_v0.1.0.png` はここへ移すか差し替える
