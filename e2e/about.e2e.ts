import { type Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { readFileSync } from 'node:fs';

// 環境設定の「アプリ情報」（S05b）、プライバシーポリシー（S05c）、manifest、オフラインでの表示の e2e

const load = (locale: string): Record<string, string> =>
	JSON.parse(readFileSync(`src/lib/i18n/locales/${locale}.json`, 'utf-8'));
const ja = load('ja');
const en = load('en');
const zhHans = load('zh-Hans');
const version = (JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string }).version;
const fill = (template: string, args: Record<string, string>) =>
	Object.entries(args).reduce((s, [k, v]) => s.replace(`{${k}}`, v), template);

const ORIGIN = 'http://localhost:4173';

async function open(page: Page) {
	await page.goto(`${ORIGIN}/`);
	await expect(page.locator('#splash')).toHaveCount(0);
}

async function openAbout(page: Page, labels: Record<string, string> = ja) {
	await page.getByRole('button', { name: labels['header.open_prefs'] }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('tab', { name: labels['prefs.tab.about'], exact: true }).click();
	return dialog;
}

const privacyEntry = (dialog: ReturnType<Page['getByRole']>, labels: Record<string, string> = ja) =>
	dialog.getByRole('button', { name: new RegExp(labels['prefs.about.privacy_link']) });

type OssEntry = { name: string; version: string; license: string };

test.describe('S05b アプリ情報', () => {
	test('アイコン・アプリ名・説明・バージョン・ソースコード・ライセンス・OSS 一覧・ポリシーへの入口が出る', async ({ page }) => {
		await open(page);
		const dialog = await openAbout(page);

		await expect(dialog.getByRole('tab', { name: ja['prefs.tab.about'], exact: true })).toHaveAttribute('aria-selected', 'true');
		await expect(dialog.getByRole('heading', { name: ja['prefs.about.heading'] })).toBeVisible();
		await expect(dialog.getByText(ja['prefs.about.tagline'])).toBeVisible();
		await expect(dialog.getByText(fill(ja['prefs.about.version'], { version }))).toBeVisible();
		await expect(dialog.locator('svg.about-icon use')).toHaveAttribute('href', '#ic-brand');

		// ソースコードのリンクは新しいタブで開く（アプリの画面から離れない）
		const source = dialog.getByRole('link', { name: 'github.com/rinfromniigata/lt_time_keeper' });
		await expect(source).toHaveAttribute('href', 'https://github.com/rinfromniigata/lt_time_keeper');
		await expect(source).toHaveAttribute('target', '_blank');
		await expect(source).toHaveAttribute('rel', /noopener/);

		await expect(dialog.getByText('Apache License 2.0')).toBeVisible();

		// OSS 一覧は oss.json の中身そのまま（名前の順）
		const oss = (await (await page.request.get(`${ORIGIN}/oss.json`)).json()) as OssEntry[];
		expect(oss.length).toBeGreaterThan(0);
		await expect(dialog.getByText(ja['prefs.about.third_party'])).toBeVisible();
		await expect(dialog.locator('.oss li')).toHaveText(oss.map((p) => `${p.name} — ${p.license}`));

		await expect(privacyEntry(dialog)).toBeVisible();
		await expect(dialog.getByText(ja['prefs.about.privacy_summary'])).toBeVisible();
	});

	test('言語を英語にすると文言が英語になる。左右キーでタブを移れる', async ({ page }) => {
		await open(page);
		await page.getByRole('button', { name: ja['header.open_prefs'] }).click();
		const dialog = page.getByRole('dialog');
		await dialog.getByRole('radio', { name: 'English' }).click();

		await dialog.getByRole('tab', { name: en['prefs.tab.sound'], exact: true }).click();
		await page.keyboard.press('ArrowRight');
		await expect(dialog.getByRole('tab', { name: en['prefs.tab.about'], exact: true })).toBeFocused();
		await expect(dialog.getByRole('heading', { name: en['prefs.about.heading'] })).toBeVisible();
		await expect(dialog.getByText(fill(en['prefs.about.version'], { version }))).toBeVisible();
		await expect(dialog.getByText(en['prefs.about.privacy_summary'])).toBeVisible();
	});

	for (const viewport of [
		{ name: 'モバイル', width: 390, height: 780 },
		{ name: 'デスクトップ', width: 1280, height: 720 }
	]) {
		test(`${viewport.name}（${viewport.width}px）：S05b・S05c とも横にはみ出さない`, async ({ page }) => {
			await page.setViewportSize({ width: viewport.width, height: viewport.height });
			await open(page);
			const dialog = await openAbout(page);

			const overflow = () =>
				page.evaluate(() => {
					const body = document.querySelector<HTMLElement>('[role="tabpanel"]')!;
					return {
						page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
						panel: body.scrollWidth - body.clientWidth
					};
				});
			expect((await overflow()).page).toBeLessThanOrEqual(0);
			expect((await overflow()).panel).toBeLessThanOrEqual(0);

			await privacyEntry(dialog).click();
			await expect(dialog.getByRole('heading', { name: ja['privacy.title'] })).toBeVisible();
			expect((await overflow()).page).toBeLessThanOrEqual(0);
			expect((await overflow()).panel).toBeLessThanOrEqual(0);
		});
	}
});

test.describe('S05c プライバシーポリシー', () => {
	test('入口から開き、「アプリ情報」で戻る。タブは「アプリ情報」のまま、フォーカスが移る', async ({ page }) => {
		await open(page);
		const dialog = await openAbout(page);
		const aboutTab = dialog.getByRole('tab', { name: ja['prefs.tab.about'], exact: true });

		await privacyEntry(dialog).click();
		await expect(dialog.getByRole('heading', { name: ja['privacy.title'] })).toBeVisible();
		await expect(aboutTab).toHaveAttribute('aria-selected', 'true');
		const back = dialog.getByRole('button', { name: ja['prefs.tab.about'], exact: true });
		await expect(back).toBeFocused();

		// 5つの節と、使う機能・使わない機能
		for (const key of ['collect', 'store', 'send', 'perm', 'change']) {
			await expect(dialog.getByRole('heading', { name: ja[`privacy.${key}.title`] })).toBeVisible();
		}
		await expect(dialog.getByText(ja['privacy.perm.vibration'])).toBeVisible();
		await expect(dialog.getByText(ja['privacy.perm.unused_list'])).toBeVisible();
		// 書体の読み込みで Google に接続情報が届くこと、書体のファイルを保存することを書く
		await expect(dialog.getByText(ja['privacy.send.body'])).toContainText('Google Fonts');
		await expect(dialog.getByText(ja['privacy.store.cache'])).toContainText('書体');
		await expect(dialog.getByText(fill(ja['privacy.change.body'], { version }))).toBeVisible();

		await back.click();
		await expect(dialog.getByRole('heading', { name: ja['prefs.about.heading'] })).toBeVisible();
		await expect(privacyEntry(dialog)).toBeFocused();
	});

	test('ほかのタブへ移って戻ると S05b から。Tab はダイアログの外へ出ず、Esc で閉じて歯車へ戻る', async ({ page }) => {
		await open(page);
		const dialog = await openAbout(page);
		await privacyEntry(dialog).click();
		await expect(dialog.getByRole('heading', { name: ja['privacy.title'] })).toBeVisible();

		await dialog.getByRole('tab', { name: ja['prefs.tab.general'], exact: true }).click();
		await dialog.getByRole('tab', { name: ja['prefs.tab.about'], exact: true }).click();
		await expect(dialog.getByRole('heading', { name: ja['prefs.about.heading'] })).toBeVisible();

		for (let i = 0; i < 12; i++) {
			await page.keyboard.press('Tab');
			expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
		}

		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		await expect(page.getByRole('button', { name: ja['header.open_prefs'] })).toBeFocused();
	});

	test('英語・簡体字中国語にすると、ポリシーも切り替わる', async ({ page }) => {
		await open(page);
		await page.getByRole('button', { name: ja['header.open_prefs'] }).click();
		const dialog = page.getByRole('dialog');
		await dialog.getByRole('radio', { name: 'English' }).click();
		await dialog.getByRole('tab', { name: en['prefs.tab.about'], exact: true }).click();
		await privacyEntry(dialog, en).click();
		await expect(dialog.getByRole('heading', { name: en['privacy.title'] })).toBeVisible();
		await expect(dialog.getByText(fill(en['privacy.change.body'], { version }))).toBeVisible();

		// 言語は「一般」で変える（ポリシーを開いたままタブを離れると S05b に戻る）
		await dialog.getByRole('tab', { name: en['prefs.tab.general'], exact: true }).click();
		await dialog.getByRole('radio', { name: '简体中文' }).click();
		await dialog.getByRole('tab', { name: zhHans['prefs.tab.about'], exact: true }).click();
		await privacyEntry(dialog, zhHans).click();
		await expect(dialog.getByRole('heading', { name: zhHans['privacy.title'] })).toBeVisible();
		await expect(dialog.getByText(fill(zhHans['privacy.change.body'], { version }))).toBeVisible();
	});
});

test.describe('manifest と、書き出した OSS 一覧', () => {
	test('manifest は英語表記で、id は変わらない', async ({ request }) => {
		const manifest = (await (await request.get(`${ORIGIN}/manifest.webmanifest`)).json()) as Record<string, unknown>;
		expect(manifest).toMatchObject({
			id: 'com.rinontech.lt-time-keeper',
			name: 'LT Timekeeper',
			short_name: 'LT Timer',
			description: en['prefs.about.tagline'],
			lang: 'en'
		});
	});

	test('oss.json は名前の順の一覧、third_party_licenses.txt は各パッケージのライセンス全文を持つ', async ({ request }) => {
		const oss = (await (await request.get(`${ORIGIN}/oss.json`)).json()) as OssEntry[];
		const names = oss.map((p) => p.name);
		expect(names).toContain('svelte');
		expect(names).toContain('@sveltejs/kit');
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
		for (const p of oss) {
			expect(p.version).toMatch(/^\d+\.\d+\.\d+/);
			expect(p.license).not.toBe('');
			expect(Object.keys(p).sort()).toEqual(['license', 'name', 'version']);
		}

		const text = await (await request.get(`${ORIGIN}/third_party_licenses.txt`)).text();
		for (const p of oss) expect(text).toContain(`${p.name} ${p.version}`);
		expect(text).toContain('Permission is hereby granted');
	});
});

test.describe('オフライン', () => {
	test('一度開いたあと通信を切って再読み込みしても、アプリ情報・OSS 一覧・ポリシーが出る', async ({ page, context }) => {
		await open(page);
		await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
		const oss = (await (await page.request.get(`${ORIGIN}/oss.json`)).json()) as OssEntry[];

		await context.setOffline(true);
		await page.reload();
		await expect(page.locator('#splash')).toHaveCount(0);

		const dialog = await openAbout(page);
		await expect(dialog.getByText(fill(ja['prefs.about.version'], { version }))).toBeVisible();
		await expect(dialog.locator('.oss li')).toHaveText(oss.map((p) => `${p.name} — ${p.license}`));
		await privacyEntry(dialog).click();
		await expect(dialog.getByRole('heading', { name: ja['privacy.title'] })).toBeVisible();
	});

	test('oss.json と third_party_licenses.txt は、事前キャッシュに入っている', async ({ page }) => {
		await open(page);
		await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
		const urls = await page.evaluate(async () => {
			const [name] = await caches.keys();
			const cache = await caches.open(name);
			return (await cache.keys()).map((request) => new URL(request.url).pathname);
		});
		expect(urls).toContain('/oss.json');
		expect(urls).toContain('/third_party_licenses.txt');
	});
});
