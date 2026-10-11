import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../settings/settings.ts';
import { Session, type FrameDriver, type KeyInput } from './session.svelte.ts';

function setup(durationMs = 300000) {
	let t = 5000;
	let pending: (() => void) | null = null;
	let finished = 0;
	const frames: FrameDriver = {
		request: (cb) => {
			pending = cb;
			return 1;
		},
		cancel: () => {
			pending = null;
		}
	};
	const session = new Session(
		{ ...structuredClone(DEFAULT_SETTINGS), durationMs },
		{ now: () => t, frames, onfinish: () => void finished++ }
	);
	return {
		session,
		/** 時刻を進め、アニメーションフレームを1回進める */
		advance(ms: number) {
			t += ms;
			const cb = pending;
			pending = null;
			cb?.();
		},
		hasFrame: () => pending !== null,
		finishedCount: () => finished
	};
}

function key(k: string, extra: Partial<KeyInput> = {}): KeyInput & { prevented: boolean } {
	const e = {
		key: k,
		repeat: false,
		ctrlKey: false,
		altKey: false,
		metaKey: false,
		target: null,
		prevented: false,
		preventDefault() {
			e.prevented = true;
		},
		...extra
	};
	return e;
}

describe('Session の表示', () => {
	it('開始前は止まっていて、開始するとフレームが回る', async () => {
		const { session, advance, hasFrame } = setup();
		expect(hasFrame()).toBe(false);
		await session.start();
		expect(hasFrame()).toBe(true);
		advance(1000);
		expect(session.snapshot.elapsedMs).toBe(1000);
	});

	it('残りは切り上げ、経過は切り捨てで表示する', async () => {
		const { session, advance } = setup();
		await session.start();
		advance(1);
		expect(session.display).toEqual({ digits: '5:00', state: 'ok', sub: '経過 0:00 ／ 5:00' });
		advance(108000);
		expect(session.display.digits).toBe('3:12');
		expect(session.display.sub).toBe('経過 1:48 ／ 5:00');
	});

	it('持ち時間を過ぎると +m:ss で数え上げ、サブ表示は消える', async () => {
		const { session, advance } = setup();
		await session.start();
		advance(299999);
		expect(session.display.digits).toBe('0:01');
		advance(1);
		expect(session.display).toEqual({ digits: '+0:00', state: 'over', sub: null });
		advance(42900);
		expect(session.display.digits).toBe('+0:42');
	});

	it('時刻を一気に進めても、その時点の正しい値になる', async () => {
		const { session, advance } = setup();
		await session.start();
		advance(3 * 60000 + 1);
		expect(session.display.digits).toBe('2:00'); // 残り 119999ms は切り上げ
	});

	it('進み具合（リング）は残りの割合', async () => {
		const { session, advance } = setup();
		await session.start();
		advance(60000);
		expect(session.snapshot.progress).toBeCloseTo(0.8);
	});
});

describe('一時停止', () => {
	it('一時停止中は進まず、状態は paused になり、再開で続きから進む', async () => {
		const { session, advance } = setup();
		await session.start();
		advance(10000);
		session.togglePause();
		expect(session.display).toMatchObject({ state: 'paused', sub: null });
		advance(60000);
		expect(session.snapshot.elapsedMs).toBe(10000);
		session.togglePause();
		advance(5000);
		expect(session.snapshot.elapsedMs).toBe(15000);
		expect(session.display.state).toBe('ok');
	});

	it('開始前は一時停止できない', () => {
		const { session } = setup();
		session.togglePause();
		expect(session.snapshot.paused).toBe(false);
	});
});

describe('終了の確認', () => {
	it('確認を出しても計測は止まらず、閉じると何も変わらない', async () => {
		const { session, advance, finishedCount } = setup();
		await session.start();
		session.requestFinish();
		expect(session.confirming).toBe(true);
		advance(3000);
		expect(session.snapshot.elapsedMs).toBe(3000);
		session.cancelFinish();
		expect(session.confirming).toBe(false);
		advance(1000);
		expect(session.snapshot.elapsedMs).toBe(4000);
		expect(finishedCount()).toBe(0);
	});

	it('確認してから終了すると、ループが止まり、通知が1回だけ届く', async () => {
		const { session, hasFrame, finishedCount } = setup();
		await session.start();
		session.confirmFinish(); // 確認なしでは終了しない
		expect(finishedCount()).toBe(0);
		session.requestFinish();
		session.confirmFinish();
		session.confirmFinish();
		expect(finishedCount()).toBe(1);
		expect(hasFrame()).toBe(false);
		expect(session.confirming).toBe(false);
	});

	it('終了後は開始も確認も受け付けない', async () => {
		const { session, hasFrame } = setup();
		await session.start();
		session.finish();
		await session.start();
		session.requestFinish();
		expect(hasFrame()).toBe(false);
		expect(session.confirming).toBe(false);
	});
});

describe('キー操作', () => {
	it('Space で一時停止・再開し、押しっぱなし（repeat）は無視する', async () => {
		const { session } = setup();
		await session.start();
		const e = key(' ');
		session.handleKey(e);
		expect(e.prevented).toBe(true);
		expect(session.snapshot.paused).toBe(true);
		session.handleKey(key(' ', { repeat: true }));
		expect(session.snapshot.paused).toBe(true);
		session.handleKey(key(' '));
		expect(session.snapshot.paused).toBe(false);
	});

	it('ボタンにフォーカスがあるときの Space は、ボタン自身に任せる', async () => {
		const { session } = setup();
		await session.start();
		const e = key(' ', { target: { tagName: 'BUTTON' } as unknown as EventTarget });
		session.handleKey(e);
		expect(e.prevented).toBe(false);
		expect(session.snapshot.paused).toBe(false);
	});

	it('確認中の Space は一時停止しない', async () => {
		const { session } = setup();
		await session.start();
		session.requestFinish();
		session.handleKey(key(' '));
		expect(session.snapshot.paused).toBe(false);
	});

	it('Esc で確認を出し、もう一度 Esc で閉じる', async () => {
		const { session } = setup();
		await session.start();
		session.handleKey(key('Escape'));
		expect(session.confirming).toBe(true);
		session.handleKey(key('Escape'));
		expect(session.confirming).toBe(false);
	});

	it('確認中の Enter で終了する。確認中でなければ何もしない', async () => {
		const { session, finishedCount } = setup();
		await session.start();
		const idle = key('Enter');
		session.handleKey(idle);
		expect(idle.prevented).toBe(false);
		expect(finishedCount()).toBe(0);
		session.handleKey(key('Escape'));
		const e = key('Enter', { target: { tagName: 'BUTTON' } as unknown as EventTarget });
		session.handleKey(e);
		expect(e.prevented).toBe(true); // フォーカス中の「続ける」が押されたことにならない
		expect(finishedCount()).toBe(1);
	});

	it('修飾キー付き・開始前・終了後は無視する', async () => {
		const { session } = setup();
		session.handleKey(key('Escape'));
		expect(session.confirming).toBe(false);
		await session.start();
		session.handleKey(key(' ', { ctrlKey: true }));
		expect(session.snapshot.paused).toBe(false);
		session.finish();
		session.handleKey(key(' '));
		expect(session.snapshot.paused).toBe(false);
	});
});
