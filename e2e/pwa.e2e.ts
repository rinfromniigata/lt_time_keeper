import { expect, test, type Page } from '@playwright/test';

const ORIGIN = 'http://localhost:4173';

async function open(page: Page) {
	await page.goto(`${ORIGIN}/`);
	await expect(page.locator('#splash')).toHaveCount(0);
	// 登録が終わり、有効になるまで待つ
	await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
}

const cacheNames = (page: Page) => page.evaluate(() => caches.keys());

test('Service Worker が登録され、版を含む名前のキャッシュに全資源が入る', async ({ page }) => {
	await open(page);

	const names = await cacheNames(page);
	expect(names).toHaveLength(1);
	expect(names[0]).toMatch(/^cache-\d+\.\d+\.\d+\+[0-9a-z]+$/);

	const urls = await page.evaluate(async (name) => {
		const cache = await caches.open(name);
		return (await cache.keys()).map((request) => new URL(request.url).pathname);
	}, names[0]);
	expect(urls).toContain('/');
	expect(urls.some((url) => /^\/_app\/immutable\/entry\/start\..+\.js$/.test(url))).toBe(true);
	expect(urls.some((url) => /^\/_app\/immutable\/assets\/.+\.css$/.test(url))).toBe(true);
	expect(urls).not.toContain('/service-worker.js');
});

test('オフラインで再読み込みしても起動できる', async ({ page, context }) => {
	await open(page);
	await context.setOffline(true);

	await page.reload();
	await expect(page.locator('#splash')).toHaveCount(0);
	await expect(page.getByText('持ち時間 5:00')).toBeVisible();
});

test('再登録すると、古い版のキャッシュは消え、関係ない名前のキャッシュは残る', async ({ page }) => {
	await open(page);
	const [current] = await cacheNames(page);

	await page.evaluate(async () => {
		await caches.open('cache-0.0.0+old');
		await caches.open('unrelated');
		const registration = await navigator.serviceWorker.ready;
		await registration.unregister();
	});
	await page.reload();
	await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));

	const names = await cacheNames(page);
	expect(names).toContain(current);
	expect(names).toContain('unrelated');
	expect(names).not.toContain('cache-0.0.0+old');
});
