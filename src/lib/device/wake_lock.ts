export interface WakeLockControl {
	readonly supported: boolean;
	/** 失敗したら false。すでに取れているときは何もせず true */
	acquire(): Promise<boolean>;
	release(): Promise<void>;
}

/** WakeLockSentinel のうち使う部分 */
interface Sentinel {
	released: boolean;
	release(): Promise<void>;
	addEventListener(type: 'release', listener: () => void): void;
}

type RequestWakeLock = () => Promise<Sentinel>;

/**
 * Screen Wake Lock API によるスリープ防止。
 * 画面が見えなくなるとブラウザが解除する。取り直しはセッションが `acquire` を呼んで行う
 */
export class BrowserWakeLock implements WakeLockControl {
	#request: RequestWakeLock | null;
	#sentinel: Sentinel | null = null;

	constructor(request: RequestWakeLock | null = BrowserWakeLock.#browserRequest()) {
		this.#request = request;
	}

	static isSupported(): boolean {
		return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
	}

	static #browserRequest(): RequestWakeLock | null {
		return BrowserWakeLock.isSupported() ? () => navigator.wakeLock.request('screen') : null;
	}

	get supported(): boolean {
		return this.#request !== null;
	}

	async acquire(): Promise<boolean> {
		if (!this.#request) return false;
		if (this.#sentinel && !this.#sentinel.released) return true;
		try {
			const sentinel = await this.#request();
			sentinel.addEventListener('release', () => {
				if (this.#sentinel === sentinel) this.#sentinel = null;
			});
			this.#sentinel = sentinel;
			return true;
		} catch {
			// 省電力モード・権限・画面が見えない状態などで拒否される
			return false;
		}
	}

	async release(): Promise<void> {
		const sentinel = this.#sentinel;
		this.#sentinel = null;
		if (!sentinel || sentinel.released) return;
		try {
			await sentinel.release();
		} catch {
			// すでに解除されている
		}
	}
}
