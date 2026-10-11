import { self } from '$app/service-worker';
import { immutable, assets, prerendered } from '$app/manifest';
import { version } from '$app/env';

const CACHE_PREFIX = 'cache-';
const CACHE_NAME = `${CACHE_PREFIX}${version}`;

// マニフェストの path は基底パスからの相対（ルートのページは空文字）。登録範囲を基準に絶対 URL へ直す
const ROOT_URL = self.registration.scope;
const PRECACHE_URLS = [...immutable, ...assets, ...prerendered].map(({ path }) => new URL(path, ROOT_URL).href);

self.addEventListener('install', (event) => {
	// 有効にするのは、利用者が更新を選んで SKIP_WAITING を送ったとき（または古い SW がないとき）
	event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
	event.waitUntil(deleteOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	if (new URL(request.url).origin !== self.location.origin) return;
	event.respondWith(respond(request));
});

async function precache(): Promise<void> {
	const cache = await caches.open(CACHE_NAME);
	// HTTP キャッシュ経由で古い資源を拾わないよう、毎回ネットワークへ取りに行く
	await cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })));
}

async function deleteOldCaches(): Promise<void> {
	const names = await caches.keys();
	await Promise.all(
		names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name))
	);
}

async function respond(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE_NAME);
	const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
	if (cached) return cached;

	try {
		return await fetch(request);
	} catch (error) {
		// 画面の遷移は URL を使わない 1 ページのアプリのため、オフラインの遷移は常にルートのページで答える
		if (request.mode === 'navigate') {
			const root = await cache.match(ROOT_URL);
			if (root) return root;
		}
		throw error;
	}
}
