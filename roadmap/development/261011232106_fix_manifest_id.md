# manifest.webmanifest に id を追加

## 内容
- 症状: W5-4 の確認で、生成した `static/manifest.webmanifest` に `id` がなかった。スペックシート §10 は識別子 `com.rinontech.lt-time-keeper` を「PWA マニフェストの `id` などに使う」と定めており、W5-4 も `id` の一致を求めている（T5-2 で入れ忘れていた）
- 修正: `scripts/gen_icons.ts` の manifest に `id: 'com.rinontech.lt-time-keeper'` を足し、`bun run gen:icons` で再生成した
- 回帰防止として、`src/lib/pwa/icons.test.ts` で manifest の `id` を検査する

## 分類
軽微な修正（要件・設計・インターフェース・タスク構成・確定事項のいずれも変えない。仕様どおりの値を入れ忘れていたのを直しただけ）

## 影響
- `scripts/gen_icons.ts`、`static/manifest.webmanifest`
- ブラウザは `id` を `https://<オリジン>/com.rinontech.lt-time-keeper` として扱う。まだ公開前でインストール済みの端末がないため、既存のインストールへの影響はない
