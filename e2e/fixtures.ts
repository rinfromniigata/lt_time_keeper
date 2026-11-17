import { test as base, expect } from '@playwright/test';

// e2e が実際の Google Fonts に依存して不安定にならないよう、書体の2つのホスト（fonts.googleapis.com・fonts.gstatic.com）への
// リクエストは、すべてテスト側で応答を差し替える（スタイルシートと、小さなダミーの書体）。
// 実際の Google Fonts との通信は、検証 W10-10 で確かめる。
// ほかの外部ホストへのリクエストは差し替えない（外部通信が増えたら、テストが失敗して気づける）。

export const FONT_STYLESHEET_HOST = 'fonts.googleapis.com';
export const FONT_FILE_HOST = 'fonts.gstatic.com';

export interface FontStub {
	/** 'ok'：差し替えた応答を返す、'fail'：接続できない（初回がオフラインの代わり） */
	mode: 'ok' | 'fail';
	/** ここまでに、ネットワークまで届いた（キャッシュから返らなかった）リクエストの数 */
	hits: { stylesheet: number; file: number };
}

const FAMILIES = [
	['Noto Sans JP', 'noto-sans-jp'],
	['Noto Sans', 'noto-sans'],
	['Noto Sans SC', 'noto-sans-sc'],
	['JetBrains Mono', 'jetbrains-mono']
] as const;

const stylesheet = FAMILIES.map(
	([family, file]) =>
		`@font-face { font-family: '${family}'; font-style: normal; font-weight: 400 700; font-display: swap; src: url(https://${FONT_FILE_HOST}/s/stub/${file}.woff2) format('woff2'); }`
).join('\n');

// 中身は書体ではない（ブラウザは読み込みに失敗して総称に置き換える）。リクエストが出るかを見るためのもの
const dummyFont = Buffer.from('wOF2-dummy');

export const test = base.extend<{ fonts: FontStub }>({
	// Playwright の fixture は、第1引数をオブジェクトの分割で受ける決まり（使うものがなくても空の分割が要る）
	// eslint-disable-next-line no-empty-pattern
	fonts: async ({}, use) => {
		await use({ mode: 'ok', hits: { stylesheet: 0, file: 0 } });
	},
	context: async ({ context, fonts }, use) => {
		await context.route(`https://${FONT_STYLESHEET_HOST}/**`, (route) => {
			fonts.hits.stylesheet++;
			if (fonts.mode === 'fail') return route.abort('internetdisconnected');
			return route.fulfill({
				status: 200,
				contentType: 'text/css; charset=utf-8',
				headers: { 'access-control-allow-origin': '*' },
				body: stylesheet
			});
		});
		await context.route(`https://${FONT_FILE_HOST}/**`, (route) => {
			fonts.hits.file++;
			if (fonts.mode === 'fail') return route.abort('internetdisconnected');
			return route.fulfill({
				status: 200,
				contentType: 'font/woff2',
				headers: { 'access-control-allow-origin': '*' },
				body: dummyFont
			});
		});
		await use(context);
	}
});

export { expect };
