import { defineConfig } from '@playwright/test';

export default defineConfig({
	// 単独の `bun run test:e2e` は build してから開く。checkコマンド（scripts/check.ts）の中では、直前の段が作った build/ を使う（二重に build しない）
	webServer: { command: process.env.LT_E2E_SKIP_BUILD ? 'bun run preview' : 'bun run build && bun run preview', port: 4173 },
	// 画面の文言はまだ日本語の直書きが残る（T8-5 で辞書へ）ため、既定は日本語のブラウザにする
	use: { locale: 'ja-JP' },
	testMatch: '**/*.e2e.{ts,js}'
});
