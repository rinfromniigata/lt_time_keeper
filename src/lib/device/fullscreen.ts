export interface FullscreenControl {
	/** document.fullscreenEnabled */
	readonly supported: boolean;
	toggle(): Promise<void>;
}

/** Document のうち使う部分 */
interface FullscreenHost {
	fullscreenEnabled: boolean;
	fullscreenElement: Element | null;
	documentElement: { requestFullscreen(): Promise<void> };
	exitFullscreen(): Promise<void>;
}

/** Fullscreen API による全画面表示。ページ全体を全画面にする */
export class BrowserFullscreen implements FullscreenControl {
	#host: FullscreenHost | null;

	constructor(host: FullscreenHost | null = typeof document === 'undefined' ? null : document) {
		this.#host = host;
	}

	get supported(): boolean {
		return this.#host?.fullscreenEnabled === true;
	}

	async toggle(): Promise<void> {
		const host = this.#host;
		if (!host || !this.supported) return;
		try {
			if (host.fullscreenElement) await host.exitFullscreen();
			else await host.documentElement.requestFullscreen();
		} catch {
			// 拒否された場合は全画面にならないだけで、計測には影響しない
		}
	}
}
