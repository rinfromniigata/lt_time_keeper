import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Playwright の読み込みは JSON の import を受け付けないため、ファイルから読む
const load = (locale: string): Record<string, string> =>
	JSON.parse(readFileSync(`src/lib/i18n/locales/${locale}.json`, 'utf-8'));
const ja = load('ja');
const en = load('en');
const zhHans = load('zh-Hans');

// ブラウザの言語ごとに、<html lang>・題名・S00・S01 の文言が決まる（app.html のインラインスクリプトと detect.ts の規則が一致する）
const CASES = [
	{ browser: 'ja-JP', lang: 'ja', dict: ja },
	{ browser: 'en-US', lang: 'en', dict: en },
	{ browser: 'zh-TW', lang: 'zh-Hans', dict: zhHans },
	{ browser: 'fr-FR', lang: 'en', dict: en } // 対応外の言語は英語
] as const;

for (const { browser, lang, dict } of CASES) {
	test.describe(`ブラウザの言語 ${browser}`, () => {
		test.use({ locale: browser });

		test(`描画前に lang=${lang} と題名が決まり、S00 はその言語の文言で出る`, async ({ page }) => {
			// アプリの JS を止めて、S00 が出ている状態を確かめる（lang と題名は、HTML 内のインラインスクリプトが決める）
			let release!: () => void;
			const gate = new Promise<void>((resolve) => (release = resolve));
			await page.route('**/_app/**/*.js', async (route) => {
				await gate;
				await route.continue();
			});
			await page.goto('http://localhost:4173/', { waitUntil: 'commit' });

			await expect(page.locator('html')).toHaveAttribute('lang', lang);
			await expect(page).toHaveTitle(dict['app.name']);
			const splash = page.locator('#splash');
			await expect(splash).toBeVisible();
			await expect(splash).toHaveText(dict['app.loading'], { useInnerText: true });

			release();
			await expect(page.locator('#splash')).toHaveCount(0);
		});

		test('S01 の文言がその言語で出て、題名と lang は変わらない', async ({ page }) => {
			await page.goto('http://localhost:4173/');
			await expect(page.locator('#splash')).toHaveCount(0);
			await expect(page.locator('html')).toHaveAttribute('lang', lang);
			await expect(page).toHaveTitle(dict['app.name']);
			await expect(page.getByText(dict['settings.duration.title'], { exact: true })).toBeVisible();
			await expect(page.getByRole('button', { name: dict['settings.start'], exact: true })).toBeVisible();
			await expect(page.getByText(dict['settings.title.title'], { exact: true }).first()).toBeVisible();
			// 日本語のときだけ日本語の文言が出る（辞書にない言語に日本語が混ざらない）
			if (lang !== 'ja') await expect(page.getByText(ja['settings.duration.title'], { exact: true })).toHaveCount(0);
		});
	});
}
