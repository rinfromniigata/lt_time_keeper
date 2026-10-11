# 警告バナー表示時にリングが操作ボタンに重なる不具合の修正

## 内容
- 症状: 計測画面に警告バナーが出ると、縦が足りなくなり、リング（`--ring-size` = `min(80vw, 70vh)` の固定サイズ）が `.main` からはみ出して操作ボタンに重なった（1280×720 で「終了」を押せない）。W4-2 の確認中に既存 e2e（`timer.e2e.ts` の「終了」ボタン）の失敗で発覚
- 修正: `TimerScreen.svelte` の `.main` をコンテナ（`container-type: size`）にし、`--ring-fit: min(var(--ring-size), 100cqmin)` を定義。`Ring.svelte` の寸法と数字・サブ表示の文字サイズは `--ring-fit` を使う（`--ring-size` が無い文脈では従来どおり `--ring-size`）
- トークン（`--ring-size`）の値は変えていない。バナーがないときは `--ring-size` のほうが小さいので見た目は変わらない

## 分類
軽微な修正（要件・設計・インターフェース・タスク構成・確定事項のいずれも変えない）。画面構成の追加・削除もない

## 影響
- `src/lib/ui/screens/TimerScreen.svelte`、`src/lib/ui/parts/Ring.svelte`
- 回帰防止として `e2e/phase4.e2e.ts` にバナー表示時のリングと操作ボタンの重なり検査を追加
