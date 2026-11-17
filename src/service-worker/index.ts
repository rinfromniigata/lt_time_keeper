import { self } from '$app/service-worker';
import { immutable, assets, prerendered } from '$app/manifest';
import { version } from '$app/env';

const CACHE_PREFIX = 'cache-';
const CACHE_NAME = `${CACHE_PREFIX}${version}`;

// 書体（Google Fonts）の実行時キャッシュ。版つきの事前キャッシュ（cache-…）とは別の名前にし、
// activate の古いキャッシュの削除（cache- ではじまる名前だけ）で消えないようにする。アプリを更新しても書体は取り直さない
const FONTS_CACHE_NAME = 'fonts-v1';
const FONT_STYLESHEET_HOST = 'fonts.googleapis.com'; // スタイルシート：stale-while-revalidate
const FONT_FILE_HOST = 'fonts.gstatic.com'; // 書体ファイル：cache-first

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
	const url = new URL(request.url);
	if (url.origin === self.location.origin) {
		event.respondWith(respond(request));
	} else if (url.protocol === 'https:' && url.hostname === FONT_STYLESHEET_HOST) {
		event.respondWith(staleWhileRevalidate(event, request));
	} else if (url.protocol === 'https:' && url.hostname === FONT_FILE_HOST) {
		event.respondWith(cacheFirst(request));
	}
	// この2つのホスト以外の外部のリクエストは、キャッシュも取得もしない（ブラウザにそのまま任せる）
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

// 取得できた応答だけを入れる。スタイルシートは no-cors の読み込みなので opaque（status 0）で返る。それも入れてよい
const cacheable = (response: Response) => response.ok || response.type === 'opaque';

async function staleWhileRevalidate(event: FetchEvent, request: Request): Promise<Response> {
	const cache = await caches.open(FONTS_CACHE_NAME);
	const cached = await cache.match(request, { ignoreVary: true });
	const refresh = fetch(request)
		.then(async (response) => {
			if (cacheable(response)) await cache.put(request, response.clone());
			return response;
		})
		.catch(() => Response.error());
	if (cached) {
		// 古い応答をすぐ返し、裏で取り直して次回に使う
		event.waitUntil(refresh);
		return cached;
	}
	return refresh;
}

async function cacheFirst(request: Request): Promise<Response> {
	const cache = await caches.open(FONTS_CACHE_NAME);
	const cached = await cache.match(request, { ignoreVary: true });
	if (cached) return cached;
	try {
		const response = await fetch(request);
		if (cacheable(response)) await cache.put(request, response.clone());
		return response;
	} catch {
		// オフラインの初回など。書体は総称のまま動くので、画面にはエラーを出さない
		return Response.error();
	}
}
