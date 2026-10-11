import { describe, expect, it } from 'vitest';
import { BrowserFullscreen } from './fullscreen.ts';
import { BrowserWakeLock } from './wake_lock.ts';

function fakeSentinel() {
	let onRelease: () => void = () => {};
	const s = {
		released: false,
		releaseCalls: 0,
		async release() {
			s.releaseCalls++;
			s.released = true;
			onRelease();
		},
		addEventListener(_: 'release', l: () => void) {
			onRelease = l;
		},
		/** ブラウザ側が解除した（画面が見えなくなった）状態 */
		revokeByBrowser() {
			s.released = true;
			onRelease();
		}
	};
	return s;
}

describe('BrowserWakeLock', () => {
	it('API がなければ supported は false で、acquire は false', async () => {
		const w = new BrowserWakeLock(null);
		expect(w.supported).toBe(false);
		expect(await w.acquire()).toBe(false);
		await expect(w.release()).resolves.toBeUndefined();
	});

	it('取れているあいだの acquire は再要求しない', async () => {
		let requests = 0;
		const s = fakeSentinel();
		const w = new BrowserWakeLock(async () => (requests++, s));
		expect(await w.acquire()).toBe(true);
		expect(await w.acquire()).toBe(true);
		expect(requests).toBe(1);
	});

	it('ブラウザに解除されたあとの acquire は取り直す', async () => {
		const sentinels = [fakeSentinel(), fakeSentinel()];
		let i = 0;
		const w = new BrowserWakeLock(async () => sentinels[i++]);
		await w.acquire();
		sentinels[0].revokeByBrowser();
		expect(await w.acquire()).toBe(true);
		expect(i).toBe(2);
	});

	it('要求が拒否されたら false', async () => {
		const w = new BrowserWakeLock(async () => {
			throw new DOMException('denied', 'NotAllowedError');
		});
		expect(await w.acquire()).toBe(false);
	});

	it('release で解除し、二度呼んでも壊れない', async () => {
		const s = fakeSentinel();
		const w = new BrowserWakeLock(async () => s);
		await w.acquire();
		await w.release();
		await w.release();
		expect(s.releaseCalls).toBe(1);
		expect(s.released).toBe(true);
	});
});

function fakeHost(enabled = true) {
	const log = { enter: 0, exit: 0 };
	const host = {
		fullscreenEnabled: enabled,
		fullscreenElement: null as Element | null,
		documentElement: {
			requestFullscreen: async () => {
				log.enter++;
				host.fullscreenElement = {} as Element;
			}
		},
		exitFullscreen: async () => {
			log.exit++;
			host.fullscreenElement = null;
		}
	};
	return { host, log };
}

describe('BrowserFullscreen', () => {
	it('対応していなければ supported は false で、toggle は何もしない', async () => {
		const { host, log } = fakeHost(false);
		const f = new BrowserFullscreen(host);
		expect(f.supported).toBe(false);
		await f.toggle();
		expect(log.enter).toBe(0);
		expect(new BrowserFullscreen(null).supported).toBe(false);
	});

	it('toggle で入り、もう一度で出る', async () => {
		const { host, log } = fakeHost();
		const f = new BrowserFullscreen(host);
		expect(f.supported).toBe(true);
		await f.toggle();
		await f.toggle();
		expect(log).toEqual({ enter: 1, exit: 1 });
	});

	it('拒否されても例外にしない', async () => {
		const { host } = fakeHost();
		host.documentElement.requestFullscreen = async () => {
			throw new TypeError('denied');
		};
		await expect(new BrowserFullscreen(host).toggle()).resolves.toBeUndefined();
	});
});
