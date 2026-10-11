import { describe, expect, it } from 'vitest';
import type { Bell, Strikes } from '../core/bells.ts';
import type { Ringer } from '../output/ringer.ts';
import { DEFAULT_SETTINGS, type Settings } from '../settings/settings.ts';
import { Session, type FrameDriver, type KeyInput } from './session.svelte.ts';

/** 呼び出しを記録する Ringer。unlock の完了は手動で進められる */
function fakeRinger() {
	const calls = { unlock: 0, rings: [] as Strikes[], volumes: [] as number[] };
	let release: () => void = () => {};
	let hold = false;
	const ringer: Ringer = {
		blocked: false,
		unlock: () => {
			calls.unlock++;
			return hold ? new Promise<void>((resolve) => (release = resolve)) : Promise.resolve();
		},
		ring: (s) => void calls.rings.push(s),
		setVolume: (v) => void calls.volumes.push(v)
	};
	return { ringer, calls, holdUnlock: () => (hold = true), releaseUnlock: () => release() };
}

function fakeVisibility() {
	let visible = true;
	const listeners = new Set<() => void>();
	return {
		driver: {
			visible: () => visible,
			subscribe: (cb: () => void) => {
				listeners.add(cb);
				return () => void listeners.delete(cb);
			}
		},
		set(v: boolean) {
			visible = v;
			for (const l of [...listeners]) l();
		},
		listeners: () => listeners.size
	};
}

function setup(durationMs = 300000, overrides: Partial<Settings> = {}) {
	let t = 5000;
	let pending: (() => void) | null = null;
	let finished = 0;
	const r = fakeRinger();
	const vis = fakeVisibility();
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
		{ ...structuredClone(DEFAULT_SETTINGS), durationMs, ...overrides },
		{ now: () => t, frames, ringer: r.ringer, visibility: vis.driver, onfinish: () => void finished++ }
	);
	return {
		session,
		rung: r.calls,
		holdUnlock: r.holdUnlock,
		releaseUnlock: r.releaseUnlock,
		visibility: vis,
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
		expect(session.display).toEqual({
			digits: '5:00',
			state: 'ok',
			sub: '経過 0:00 ／ 5:00',
			next: { label: '1鈴まで', in: '4:00' }
		});
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
		expect(session.display).toEqual({
			digits: '+0:00',
			state: 'over',
			sub: null,
			next: { label: '3鈴まで', in: '1:00' }
		});
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

const MIN = 60000;
function bell(id: string, base: Bell['base'], offsetMs: number, strikes: Strikes): Bell {
	return { id, base, offsetMs, strikes };
}

describe('ベル', () => {
	it('開始ボタンの操作の中で unlock を呼び、音量を渡す。計測は音の準備を待たずに始まる', () => {
		const { session, rung, holdUnlock, advance } = setup(300000, { volume: 0.3 });
		holdUnlock();
		expect(rung.volumes).toEqual([0.3]);
		void session.start(); // await しない＝同じ呼び出しの中で unlock まで進む
		expect(rung.unlock).toBe(1);
		advance(1000);
		expect(session.snapshot.elapsedMs).toBe(1000);
	});

	it('初期のベル：1鈴（残り1:00）で1回、2鈴（残り0:00）で2回、3鈴（+1:00）で3回。それぞれ1度だけ', async () => {
		const { session, rung, advance } = setup();
		await session.start();
		advance(4 * MIN - 1);
		expect(rung.rings).toEqual([]);
		advance(1);
		expect(rung.rings).toEqual([1]);
		advance(16);
		advance(16);
		expect(rung.rings).toEqual([1]);
		advance(MIN - 33);
		expect(rung.rings).toEqual([1]);
		advance(33);
		expect(rung.rings).toEqual([1, 2]);
		advance(MIN);
		expect(rung.rings).toEqual([1, 2, 3]);
		advance(10 * MIN);
		expect(rung.rings).toEqual([1, 2, 3]);
	});

	it('予鈴は最初のベルから、超過は残り0:00から', async () => {
		const { session, advance } = setup();
		await session.start();
		advance(4 * MIN - 1);
		expect(session.display.state).toBe('ok');
		advance(1);
		expect(session.display.state).toBe('warn');
		advance(MIN);
		expect(session.display.state).toBe('over');
	});

	it('最初のベルが残り0:00以降なら、予鈴の段階はない', async () => {
		const { session, advance } = setup(300000, { bells: [bell('a', 'remaining', 0, 2)] });
		await session.start();
		advance(4 * MIN + 59000);
		expect(session.display.state).toBe('ok');
	});

	it('開始と同時に鳴るベル（残り＝持ち時間）は、開始直後に鳴る', async () => {
		const { session, rung, advance } = setup(300000, { bells: [bell('a', 'remaining', 300000, 2)] });
		await session.start();
		advance(16);
		expect(rung.rings).toEqual([2]);
		expect(session.display.state).toBe('warn');
		advance(MIN);
		expect(rung.rings).toEqual([2]);
	});

	it('音の準備が終わるまで判定を待ち、終わったら取りこぼさずに鳴らす', async () => {
		const { session, rung, advance, holdUnlock, releaseUnlock } = setup(300000, {
			bells: [bell('a', 'remaining', 300000, 1)]
		});
		holdUnlock();
		const started = session.start();
		advance(16);
		expect(rung.rings).toEqual([]);
		releaseUnlock();
		await started;
		advance(16);
		expect(rung.rings).toEqual([1]);
	});

	it('音の準備が終わらなくても、1秒たてば判定を始める', async () => {
		const { session, rung, advance, holdUnlock } = setup(300000, { bells: [bell('a', 'over', 0, 1)] });
		holdUnlock();
		void session.start();
		advance(5 * MIN);
		expect(rung.rings).toEqual([1]);
	});

	it('同じ時点のベルは、回数の多い方を1回だけ鳴らす', async () => {
		const { session, rung, advance } = setup(300000, {
			bells: [bell('a', 'remaining', 0, 1), bell('b', 'over', 0, 3)]
		});
		await session.start();
		advance(5 * MIN);
		expect(rung.rings).toEqual([3]);
	});

	it('ベルが0件でも計測でき、何も鳴らさず、次のベルは出ない', async () => {
		const { session, rung, advance } = setup(300000, { bells: [] });
		await session.start();
		expect(session.display.next).toBeNull();
		advance(6 * MIN);
		expect(rung.rings).toEqual([]);
		expect(session.display.state).toBe('over');
	});

	it('鳴らないベルは鳴らさず、予鈴にもならない', async () => {
		const { session, rung, advance } = setup(30000, { bells: [bell('a', 'remaining', MIN, 3)] });
		await session.start();
		advance(40000);
		expect(rung.rings).toEqual([]);
		expect(session.display.state).toBe('over');
	});

	it('一時停止中は鳴らず、再開してから続きの時間で鳴る', async () => {
		const { session, rung, advance } = setup();
		await session.start();
		advance(3 * MIN + 59000);
		session.togglePause();
		advance(10 * MIN);
		expect(rung.rings).toEqual([]);
		session.togglePause();
		advance(1000);
		expect(rung.rings).toEqual([1]);
	});

	it('画面が見えなかったあいだに過ぎたベルは、戻ってもあとから鳴らさず、表示は正しい値になる', async () => {
		const { session, rung, advance, visibility } = setup();
		await session.start();
		advance(3 * MIN);
		visibility.set(false);
		advance(2 * MIN + 30000); // 1鈴（4:00）と2鈴（5:00）が過ぎる。rAF は止まっているので呼ばれない
		visibility.set(true);
		advance(16);
		expect(rung.rings).toEqual([]);
		expect(session.display.digits).toBe('+0:30'); // 経過 5:30.016 → 超過 30.016 秒（切り捨て）
		expect(session.display.state).toBe('over');
		advance(MIN - 30000 - 16); // 経過 6:00 ちょうど。+1:00 の 3鈴は、見えているので鳴る
		expect(rung.rings).toEqual([3]);
	});

	it('見えないあいだにフレームが回っても鳴らさない', async () => {
		const { session, rung, advance, visibility } = setup();
		await session.start();
		visibility.set(false);
		advance(4 * MIN);
		advance(16);
		expect(rung.rings).toEqual([]);
		visibility.set(true);
		advance(16);
		expect(rung.rings).toEqual([]);
	});

	it('描画が長く止まって複数のベルが重なったときは、最後の1つだけ鳴らす', async () => {
		const { session, rung, advance } = setup();
		await session.start();
		advance(2 * MIN);
		advance(3 * MIN + 30000); // 経過 5:30。1鈴（4:00）・2鈴（5:00）が同じ判定に入る
		expect(rung.rings).toEqual([2]);
	});

	it('次のベルは、残り時間と同じ切り上げで、並び順の番号つきで出る。最後のベルを過ぎると消える', async () => {
		const { session, advance } = setup();
		await session.start();
		advance(1);
		expect(session.display.next).toEqual({ label: '1鈴まで', in: '4:00' });
		advance(4 * MIN - 1);
		expect(session.display.next).toEqual({ label: '2鈴まで', in: '1:00' });
		advance(MIN);
		expect(session.display.next).toEqual({ label: '3鈴まで', in: '1:00' });
		advance(MIN);
		expect(session.display.next).toBeNull();
	});

	it('4件以上のときは「n番目のベルまで」と出る', async () => {
		const bells = [1, 2, 3, 4].map((i) => bell(`b${i}`, 'remaining', i * MIN, 1));
		const { session } = setup(300000, { bells });
		await session.start();
		// 時刻順は 残り4:00・3:00・2:00・1:00 の順なので、最初に来るのは残り4:00（経過1:00）の1番目
		expect(session.display.next).toEqual({ label: '1番目のベルまで', in: '1:00' });
	});

	it('設定を後から変えても、開始時点の値で動く', async () => {
		const settings = { ...structuredClone(DEFAULT_SETTINGS) };
		const { session } = setup(300000, { bells: settings.bells });
		settings.bells.length = 0;
		await session.start();
		expect(session.display.next).not.toBeNull();
	});

	it('終了すると、見え方の購読を解く', async () => {
		const { session, visibility } = setup();
		await session.start();
		expect(visibility.listeners()).toBe(1);
		session.finish();
		expect(visibility.listeners()).toBe(0);
	});
});
