import { describe, expect, it } from 'vitest';
import { UpdateNotifier, type WorkerContainer, type WorkerRegistration } from './update.svelte.ts';

class FakeWorker {
	state = 'installing';
	messages: unknown[] = [];
	#listeners: (() => void)[] = [];
	postMessage(message: unknown) {
		this.messages.push(message);
	}
	addEventListener(_: 'statechange', listener: () => void) {
		this.#listeners.push(listener);
	}
	become(state: string) {
		this.state = state;
		this.#listeners.forEach((l) => l());
	}
}

class FakeRegistration implements WorkerRegistration {
	waiting: FakeWorker | null = null;
	installing: FakeWorker | null = null;
	updates = 0;
	#found: (() => void)[] = [];
	addEventListener(_: 'updatefound', listener: () => void) {
		this.#found.push(listener);
	}
	async update() {
		this.updates++;
	}
	/** 新しい SW が見つかり、インストールを始める */
	found(): FakeWorker {
		this.installing = new FakeWorker();
		this.#found.forEach((l) => l());
		return this.installing;
	}
	/** インストールが終わり、待機に入る */
	install(worker: FakeWorker) {
		this.installing = null;
		this.waiting = worker;
		worker.become('installed');
	}
}

class FakeContainer implements WorkerContainer {
	controller: unknown;
	#changed: (() => void)[] = [];
	constructor(
		readonly registration: FakeRegistration,
		controlled: boolean
	) {
		this.controller = controlled ? {} : null;
	}
	get ready() {
		return Promise.resolve(this.registration);
	}
	addEventListener(_: 'controllerchange', listener: () => void) {
		this.#changed.push(listener);
	}
	changeController() {
		this.#changed.forEach((l) => l());
	}
}

function setup(controlled = true) {
	const registration = new FakeRegistration();
	const container = new FakeContainer(registration, controlled);
	let reloads = 0;
	let visible: () => void = () => {};
	const notifier = new UpdateNotifier({
		container,
		reloadPage: () => reloads++,
		onVisible: (listener) => {
			visible = listener;
			return () => {};
		}
	});
	return { registration, container, notifier, reloads: () => reloads, becomeVisible: () => visible() };
}

describe('UpdateNotifier', () => {
	it('更新がなければ知らせない', async () => {
		const { notifier } = setup();
		await notifier.start();
		expect(notifier.available).toBe(false);
	});

	it('Service Worker に対応しない環境では何もしない', async () => {
		const notifier = new UpdateNotifier({ container: null });
		await notifier.start();
		expect(notifier.available).toBe(false);
	});

	it('起動時にすでに待機中の SW があれば知らせる', async () => {
		const { registration, notifier } = setup();
		registration.waiting = new FakeWorker();
		await notifier.start();
		expect(notifier.available).toBe(true);
	});

	it('開いたあとに新しい SW が見つかり、待機に入ったら知らせる（インストール中は知らせない）', async () => {
		const { registration, notifier } = setup();
		await notifier.start();
		const worker = registration.found();
		expect(notifier.available).toBe(false);
		registration.install(worker);
		expect(notifier.available).toBe(true);
	});

	it('初回の有効化（操作中の古い SW がない）は更新として知らせない', async () => {
		const { registration, notifier } = setup(false);
		await notifier.start();
		registration.install(registration.found());
		expect(notifier.available).toBe(false);
	});

	it('閉じても available は変わらず、dismissed だけが立つ', async () => {
		const { registration, notifier } = setup();
		registration.waiting = new FakeWorker();
		await notifier.start();
		notifier.dismiss();
		expect(notifier.available).toBe(true);
		expect(notifier.dismissed).toBe(true);
	});

	it('再読み込みは SKIP_WAITING を送り、切り替わったときに読み込み直す（送っただけでは読み込み直さない）', async () => {
		const { registration, container, notifier, reloads } = setup();
		const waiting = new FakeWorker();
		registration.waiting = waiting;
		await notifier.start();
		notifier.reload();
		expect(waiting.messages).toEqual([{ type: 'SKIP_WAITING' }]);
		expect(reloads()).toBe(0);
		container.changeController();
		expect(reloads()).toBe(1);
	});

	it('利用者が選んでいない切り替えでは、読み込み直さない', async () => {
		const { container, notifier, reloads } = setup();
		await notifier.start();
		container.changeController();
		expect(reloads()).toBe(0);
	});

	it('待機中の SW がなければ、そのまま読み込み直す', async () => {
		const { notifier, reloads } = setup();
		await notifier.start();
		notifier.reload();
		expect(reloads()).toBe(1);
	});

	it('起動時と、画面が見える状態に戻ったときに更新を確かめる', async () => {
		const { registration, notifier, becomeVisible } = setup();
		await notifier.start();
		expect(registration.updates).toBe(1);
		becomeVisible();
		expect(registration.updates).toBe(2);
	});
});
