# 文言が長いときのレイアウトの崩れを直す（W8-5・W8-6 の不合格の修正）

## 内容
- 症状1（W8-6、3言語とも）: S01 のベルの行の補足文（「ここで黄（予鈴）に変わる」など）が、1行に収まらないと省略記号で切れた。スペックシートの非機能要件（「長い補足文は省略せずに折り返す」）に反する
- 修正1: `src/lib/ui/parts/BellRow.svelte` の `.note` から `white-space: nowrap`・`overflow: hidden`・`text-overflow: ellipsis` を外し、`overflow-wrap: anywhere` にした
- 症状2（W8-5、疑似ロケールの 390px）: 計測画面の操作ボタン（一時停止・終了）が、ラベルが長いと画面の左右にはみ出した（左 -3px・右 393px）
- 修正2: `src/lib/ui/screens/TimerScreen.svelte` の `.controls` を `flex-wrap: wrap` にした（収まらないときは、ボタンが次の行へ折り返す）
- 症状3（W8-5、疑似ロケールの 390px）: S01f の更新のお知らせが、文が長いと列を押し広げ、バナーとパネルが画面の右にはみ出した（横スクロール）
- 修正3: `src/lib/ui/parts/Banner.svelte` を `flex-wrap: wrap`、本文の `.grow` を `flex: 1 1 50%` にして、操作のボタンが本文の下へ折り返せるようにした。`src/lib/ui/screens/SettingsScreen.svelte` の `.update`（グリッドの項目）に `min-width: 0` を足した
- 確認: 疑似ロケール・ja・en・zh-Hans × 390px・1280px で、S01・S01a・S01b・S01c・S01d（編集と追加）・S01f・S03・S03a・S03b・S03c・S03d・S03e・S03f を開き直し、`［…］` で囲まれていない文言、横スクロール、要素のはみ出し、補足文の省略（`.note`・`.hint`）、表示名の1行の省略が、すべて0件。`check`（0エラー）・`check:tokens`・`check:i18n`・単体テスト187件・e2e 71件通過

## 分類
軽微な修正（要件・設計・インターフェース・タスク構成・確定事項のいずれも変えない）
- 修正1は、スペックシートと imple §3.12 がすでに定めている「折り返す」に、実装を合わせたもの
- 修正2・3は、文言が長い言語でも崩れないという同じ要件を、疑似ロケールの確認で見つかった箇所に適用したもの。画面構成・値（トークン）は変えていない

## 影響
- `src/lib/ui/parts/BellRow.svelte`、`src/lib/ui/parts/Banner.svelte`、`src/lib/ui/screens/TimerScreen.svelte`、`src/lib/ui/screens/SettingsScreen.svelte`
- 通常の長さの文言では見た目は変わらない（折り返しが起きる長さのときだけ変わる）。ベルの行は、補足文が折り返すと高くなる
