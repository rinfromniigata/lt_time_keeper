import { type Page } from '@playwright/test';
import { expect, FONT_FILE_HOST, FONT_STYLESHEET_HOST, test } from './fixtures.ts';

// 書体の Web フォント（Google Fonts）：読み込みと、Service Worker の実行時キャッシュ（fonts-v1）の e2e。
// 2つのホストの応答は fixtures.ts が差し替える。実際の Google Fonts との通信は検証 W10-10 で確かめる

const ORIGIN = 'http://localhost:4173';
const FONTS_CACHE = 'fonts-v1';

async function open(page: Page) {
	await page.goto(`${ORIGIN}/`);
	await expect(page.locator('#splash')).toHaveCount(0);
	// 登録が終わり、有効になるまで待つ
	await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
}

/** 初回の読み込みは Service Worker の登録前なので、もう一度読み込んで、Service Worker 経由で書体を取らせる */
async function openControlled(page: Page) {
	await open(page);
	await page.reload();
	await expect(page.locator('#splash')).toHaveCount(0);
}

const cacheUrls = (page: Page, name: string) =>
	page.evaluate(async (cacheName) => {
		if (!(await caches.has(cacheName))) return [];
		const cache = await caches.open(cacheName);
		return (await cache.keys()).map((request) => request.url);
	}, name);

const versionCaches = (page: Page) =>
	page.evaluate(async () => {
		const result: Record<string, string[]> = {};
		for (const name of await caches.keys()) {
			if (!name.startsWith('cache-')) continue;
			result[name] = (await (await caches.open(name)).keys()).map((request) => request.url);
		}
		return result;
	});

const stylesheetLink = (page: Page) => page.locator(`link[rel="stylesheet"][href*="${FONT_STYLESHEET_HOST}"]`);

const isStylesheet = (url: string) => new URL(url).hostname === FONT_STYLESHEET_HOST;
const isFontFile = (url: string) => new URL(url).hostname === FONT_FILE_HOST;

test.describe('読み込み（app.html）', () => {
	test('書体の4つを、太さ 400〜700・swap で指定したスタイルシートを、描画を止めない形で読み込む', async ({ page }) => {
		await open(page);

		const head = await page.evaluate(() =>
			[...document.head.querySelectorAll('link')].map((link) => ({
				rel: link.rel,
				href: link.href,
				crossOrigin: link.crossOrigin
			}))
		);
		expect(head).toContainEqual(expect.objectContaining({ rel: 'preconnect', href: `https://${FONT_STYLESHEET_HOST}/` }));
		expect(head).toContainEqual(
			expect.objectContaining({ rel: 'preconnect', href: `https://${FONT_FILE_HOST}/`, crossOrigin: 'anonymous' })
		);

		const href = new URL((await stylesheetLink(page).getAttribute('href'))!);
		expect(href.origin).toBe(`https://${FONT_STYLESHEET_HOST}`);
		expect(href.pathname).toBe('/css2');
		expect(href.searchParams.getAll('family').sort()).toEqual([
			'JetBrains Mono:wght@400..700',
			'Noto Sans JP:wght@400..700',
			'Noto Sans SC:wght@400..700',
			'Noto Sans:wght@400..700'
		]);
		expect(href.searchParams.get('display')).toBe('swap');
		// 取得できたら有効になる（取得中・失敗時は media="print" のままで、描画を止めない）
		await expect(stylesheetLink(page)).toHaveJSProperty('media', 'all');
	});

	test('書体は、言語ごとのトークンの先頭にある（OS の書体は並べない）', async ({ page }) => {
		await open(page);
		const fonts = await page.evaluate(() => {
			const style = getComputedStyle(document.documentElement);
			return ['--font-sans-ja', '--font-sans-en', '--font-sans-zh-hans', '--font-digits'].map((name) =>
				style.getPropertyValue(name).trim()
			);
		});
		expect(fonts).toEqual(['"Noto Sans JP", sans-serif', '"Noto Sans", sans-serif', '"Noto Sans SC", sans-serif', '"JetBrains Mono", monospace']);
	});

	test('起動画面（S00）も、トークンの書体を使う', async ({ page }) => {
		// 起動画面は静的マークアップ（JS が動く前から出る）。JS を止めて、<body> から継承した書体がトークンの書体であることを確かめる
		await page.route(`${ORIGIN}/_app/**/*.js`, (route) => route.abort());
		await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded' });
		const family = await page.locator('#splash').evaluate((el) => getComputedStyle(el).fontFamily);
		expect(family).toContain('Noto Sans JP');
	});
});

test.describe('Service Worker の書体のキャッシュ', () => {
	test('スタイルシートと書体ファイルは別名のキャッシュ（fonts-v1）に入り、版つきの事前キャッシュには入らない', async ({ page }) => {
		await openControlled(page);

		await expect.poll(async () => (await cacheUrls(page, FONTS_CACHE)).some(isStylesheet)).toBe(true);
		await expect.poll(async () => (await cacheUrls(page, FONTS_CACHE)).some(isFontFile)).toBe(true);

		// スタイルシートは no-cors の読み込みなので opaque な応答で返る。それも入れて、次の読み込みで使える
		const urls = await cacheUrls(page, FONTS_CACHE);
		expect(urls.every((url) => isStylesheet(url) || isFontFile(url))).toBe(true);

		for (const cached of Object.values(await versionCaches(page))) {
			expect(cached.filter((url) => new URL(url).origin !== ORIGIN)).toEqual([]);
		}
	});

	test('スタイルシートは stale-while-revalidate（毎回取り直す）、書体ファイルは cache-first（取り直さない）', async ({ page, fonts }) => {
		await openControlled(page);
		await expect.poll(async () => (await cacheUrls(page, FONTS_CACHE)).some(isFontFile)).toBe(true);

		const before = { ...fonts.hits };
		await page.reload();
		await expect(page.locator('#splash')).toHaveCount(0);
		// 古い応答を返しつつ、裏で取り直す
		await expect.poll(() => fonts.hits.stylesheet).toBeGreaterThan(before.stylesheet);
		await expect(stylesheetLink(page)).toHaveJSProperty('media', 'all');
		// 書体ファイルはキャッシュから返し、ネットワークへ取りに行かない
		expect(fonts.hits.file).toBe(before.file);
	});

	test('オフラインで再読み込みしても、同じ応答が返り、書体のスタイルシートが有効になる', async ({ page, context, fonts }) => {
		await openControlled(page);
		await expect.poll(async () => (await cacheUrls(page, FONTS_CACHE)).some(isStylesheet)).toBe(true);
		await expect.poll(async () => (await cacheUrls(page, FONTS_CACHE)).some(isFontFile)).toBe(true);

		fonts.mode = 'fail';
		await context.setOffline(true);
		await page.reload();
		await expect(page.locator('#splash')).toHaveCount(0);
		// 取得できなければ media="print" のままになる。all になっているのは、キャッシュの応答が返ったから
		await expect(stylesheetLink(page)).toHaveJSProperty('media', 'all');
		expect(await cacheUrls(page, FONTS_CACHE)).not.toHaveLength(0);

		await page.getByRole('button', { name: '開始' }).click();
		await expect(page.getByRole('button', { name: '一時停止' })).toBeVisible();
	});

	test('初回がオフライン（書体の取得が失敗）でも、起動して計測できる。エラーは画面に出ない', async ({ page, fonts }) => {
		fonts.mode = 'fail';
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await open(page);
		await page.reload();
		await expect(page.locator('#splash')).toHaveCount(0);
		await expect(page.getByText('持ち時間 5:00')).toBeVisible();

		await page.getByRole('button', { name: '開始' }).click();
		await expect(page.getByRole('button', { name: '一時停止' })).toBeVisible();
		await expect(page.getByText(/^4:5\d$/).first()).toBeVisible();

		// 書体は総称のまま。スタイルシートは有効にならず、失敗した応答はキャッシュに入らない
		await expect(stylesheetLink(page)).toHaveJSProperty('media', 'print');
		expect(await cacheUrls(page, FONTS_CACHE)).toEqual([]);
		expect(errors).toEqual([]);
	});

	test('2つのホスト以外の外部のリクエストは、キャッシュも取得もしない', async ({ page, context }) => {
		let reached = 0;
		await context.route('https://example.com/**', (route) => {
			reached++;
			return route.fulfill({ status: 200, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' }, body: 'a{}' });
		});
		await openControlled(page);
		await expect.poll(async () => (await cacheUrls(page, FONTS_CACHE)).some(isFontFile)).toBe(true);

		await page.evaluate(async () => {
			await fetch('https://example.com/other.css', { mode: 'no-cors' });
			await fetch('https://example.com/other.woff2', { mode: 'cors' });
		});
		// Service Worker は答えず、ブラウザがそのまま取りに行く
		expect(reached).toBe(2);
		expect((await cacheUrls(page, FONTS_CACHE)).filter((url) => new URL(url).hostname === 'example.com')).toEqual([]);
		for (const cached of Object.values(await versionCaches(page))) {
			expect(cached.filter((url) => new URL(url).hostname === 'example.com')).toEqual([]);
		}
	});
});
