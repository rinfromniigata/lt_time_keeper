import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

// 新しい版を作る: プレビューが配信する service-worker.js（.svelte-kit/output/client/） に 1 行足す（ブラウザは中身が変わったものを新しい版とみなす）。
// ルートの解決（context.route）は Service Worker 本体の更新取得には効かないため、ファイルを直接書き換えて、終了時に戻す
const WORKER_FILE = fileURLToPath(new URL('../.svelte-kit/output/client/service-worker.js', import.meta.url));
let originalWorker: string | null = null;

function serveNewWorker() {
	originalWorker ??= readFileSync(WORKER_FILE, 'utf8');
	writeFileSync(WORKER_FILE, originalWorker + `
// new version ${Date.now()}`);
}

test.afterEach(() => {
	if (originalWorker !== null) writeFileSync(WORKER_FILE, originalWorker);
	originalWorker = null;
});

const banner = (page: Page) => page.getByText('新しいバージョンがあります。');

test('新しい版を受け取ると S01 の上部で知らせ、再読み込みで切り替わる（S01f）', async ({ page }) => {
	await open(page);
	await expect(banner(page)).toHaveCount(0);
	const before = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);

	serveNewWorker();
	// 入力中の値（再読み込みで初期値に戻ることを案内している値）
	await page.getByRole('button', { name: '10分' }).click();
	await page.evaluate(async () => {
		const registration = await navigator.serviceWorker.ready;
		await registration.update();
	});
	await expect(banner(page)).toBeVisible();
	await expect(page.getByText('再読み込みすると、入力中の値は初期値に戻ります。')).toBeVisible();
	// 待機中で、まだ切り替わっていない
	expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(before);
	await expect(page.getByText('持ち時間 10:00')).toBeVisible();

	await page.getByRole('button', { name: '再読み込み' }).click();
	// 読み込み直されて、初期値に戻る。新しい版が操作している
	await expect(page.getByText('持ち時間 5:00')).toBeVisible();
	await expect(banner(page)).toHaveCount(0);
	await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
	const waiting = await page.evaluate(async () => (await navigator.serviceWorker.ready).waiting !== null);
	expect(waiting).toBe(false);
});

test('お知らせは×で閉じられ、閉じたあとは値が残る', async ({ page }) => {
	await open(page);
	serveNewWorker();
	await page.getByRole('button', { name: '10分' }).click();
	await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
	await expect(banner(page)).toBeVisible();

	await page.getByRole('button', { name: '閉じる' }).click();
	await expect(banner(page)).toHaveCount(0);
	await expect(page.getByText('持ち時間 10:00')).toBeVisible();
});

test('計測中に新しい版を受け取っても計測画面には出さず、S01 に戻ってから出す', async ({ page }) => {
	await open(page);
	serveNewWorker();
	await page.getByRole('button', { name: '開始' }).click();
	await expect(page.getByRole('button', { name: '一時停止' })).toBeVisible();

	await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
	await page.waitForFunction(async () => (await navigator.serviceWorker.ready).waiting !== null);
	await expect(banner(page)).toHaveCount(0);

	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: '終了する' }).click();
	await expect(banner(page)).toBeVisible();
});
