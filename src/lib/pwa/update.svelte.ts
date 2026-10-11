// 新しい Service Worker が待機状態になったことを知らせ、利用者が選んだら切り替えて再読み込みする。
// ブラウザの API は注入できる形にして、単体テストで確かめる

/** UpdateNotifier が使う、ServiceWorkerContainer の範囲 */
export interface WorkerContainer {
	readonly controller: unknown;
	readonly ready: Promise<WorkerRegistration>;
	addEventListener(type: 'controllerchange', listener: () => void): void;
}

export interface WorkerRegistration {
	readonly waiting: { postMessage(message: unknown): void } | null;
	readonly installing: WorkerInstalling | null;
	addEventListener(type: 'updatefound', listener: () => void): void;
	update(): Promise<unknown>;
}

interface WorkerInstalling {
	readonly state: string;
	addEventListener(type: 'statechange', listener: () => void): void;
}

export interface UpdateDeps {
	container?: WorkerContainer | null;
	/** 画面が見える状態に戻ったときの通知を購読する。戻り値は購読の解除 */
	onVisible?: (listener: () => void) => () => void;
	reloadPage?: () => void;
}

function browserContainer(): WorkerContainer | null {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
	return navigator.serviceWorker as unknown as WorkerContainer;
}

function browserOnVisible(listener: () => void): () => void {
	const handler = () => {
		if (document.visibilityState === 'visible') listener();
	};
	document.addEventListener('visibilitychange', handler);
	return () => document.removeEventListener('visibilitychange', handler);
}

export class UpdateNotifier {
	available = $state(false);
	dismissed = $state(false);

	#container: WorkerContainer | null;
	#onVisible: (listener: () => void) => () => void;
	#reloadPage: () => void;
	#registration: WorkerRegistration | null = null;
	#stopVisible: (() => void) | null = null;
	#stopped = false;
	#reloading = false;

	constructor(deps: UpdateDeps = {}) {
		this.#container = deps.container !== undefined ? deps.container : browserContainer();
		this.#onVisible = deps.onVisible ?? browserOnVisible;
		this.#reloadPage = deps.reloadPage ?? (() => location.reload());
	}

	/** 登録が終わって有効になるのを待ち、更新の検知を始める。ページを開いたとき1回だけ呼ぶ */
	async start(): Promise<void> {
		const container = this.#container;
		if (!container || this.#stopVisible) return;
		this.#stopVisible = this.#onVisible(() => void this.#registration?.update());

		container.addEventListener('controllerchange', () => {
			// 利用者が「再読み込み」を選んだあとの切り替えだけ読み込み直す（初回の有効化では読み込み直さない）
			if (this.#reloading) this.#reloadPage();
		});

		const registration = await container.ready;
		if (this.#stopped) return;
		this.#registration = registration;
		this.#check(registration);
		registration.addEventListener('updatefound', () => this.#watch(registration));
		void registration.update();
	}

	stop(): void {
		this.#stopped = true;
		this.#stopVisible?.();
	}

	/** 待機中の新しい Service Worker に切り替えて、ページを読み込み直す */
	reload(): void {
		const waiting = this.#registration?.waiting;
		if (!waiting) {
			this.#reloadPage();
			return;
		}
		this.#reloading = true;
		waiting.postMessage({ type: 'SKIP_WAITING' });
	}

	dismiss(): void {
		this.dismissed = true;
	}

	#check(registration: WorkerRegistration) {
		// 待機中の SW があって、すでに古い SW がページを操作しているときだけ更新とみなす（初回の有効化は更新ではない）
		if (registration.waiting && this.#container?.controller) this.available = true;
	}

	#watch(registration: WorkerRegistration) {
		const worker = registration.installing;
		if (!worker) return;
		worker.addEventListener('statechange', () => {
			if (worker.state === 'installed') this.#check(registration);
		});
	}
}
