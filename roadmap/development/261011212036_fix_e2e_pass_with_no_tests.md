# 修正記録: e2e テストが0件でも `bun run test` を通す

- 契機: W1-1 の不合格（`bun run test` が Playwright の「No tests found」で終了コード1）
- 種別: 軽微な修正（要件・設計・インターフェース・タスク構成・確定事項のいずれも変えない）

## 内容
- `package.json` の `test:e2e` を `playwright install && playwright test --pass-with-no-tests` にした
- Playwright には設定項目がなく、CLI フラグのみのため

## 理由
- Phase 1 には e2e のテストがまだなく、W1-1 の `bun run test` が通らないため
- Vitest 側は `passWithNoTests: true` で同様に対処済み

## 後始末
- Phase 2 以降で最初の e2e テストを追加したら、`--pass-with-no-tests` と Vitest の `passWithNoTests` を外す
