import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'bun run build && bun run preview', port: 4173 },
	// 画面の文言はまだ日本語の直書きが残る（T8-5 で辞書へ）ため、既定は日本語のブラウザにする
	use: { locale: 'ja-JP' },
	testMatch: '**/*.e2e.{ts,js}'
});
