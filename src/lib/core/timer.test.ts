import { describe, expect, it } from 'vitest';
import { Timer, type TimerConfig } from './timer.ts';

function setup(config: Partial<TimerConfig> = {}) {
	let t = 1000; // 0 から始めず、開始時刻が 0 でない場合を確かめる
	const timer = new Timer({ durationMs: 300000, warnAtElapsedMs: 240000, ...config }, () => t);
	return {
		timer,
		advance(ms: number) {
			t += ms;
		}
	};
}

describe('Timer', () => {
	it('開始前は経過0・停止していない', () => {
		const { timer, advance } = setup();
		advance(5000);
		const s = timer.snapshot();
		expect(s.elapsedMs).toBe(0);
		expect(s.remainingMs).toBe(300000);
		expect(s.phase).toBe('ok');
		expect(s.paused).toBe(false);
		expect(s.progress).toBe(1);
	});

	it('開始後は時間の経過に従う', () => {
		const { timer, advance } = setup();
		timer.start();
		advance(60000);
		const s = timer.snapshot();
		expect(s.elapsedMs).toBe(60000);
		expect(s.remainingMs).toBe(240000);
		expect(s.overMs).toBe(0);
		expect(s.progress).toBeCloseTo(0.8);
	});

	it('start を二度呼んでも開始時刻は変わらない', () => {
		const { timer, advance } = setup();
		timer.start();
		advance(10000);
		timer.start();
		expect(timer.snapshot().elapsedMs).toBe(10000);
	});

	it('phase は境界ちょうどで切り替わる', () => {
		const { timer, advance } = setup();
		timer.start();
		advance(239999);
		expect(timer.snapshot().phase).toBe('ok');
		advance(1);
		expect(timer.snapshot().phase).toBe('warn');
		advance(59999);
		expect(timer.snapshot().phase).toBe('warn');
		advance(1);
		expect(timer.snapshot().phase).toBe('over');
	});

	it('予鈴の段階がなければ warn にならない', () => {
		const { timer, advance } = setup({ warnAtElapsedMs: null });
		timer.start();
		advance(299999);
		expect(timer.snapshot().phase).toBe('ok');
	});

	it('超過では overMs が増え、progress は 1 のまま', () => {
		const { timer, advance } = setup();
		timer.start();
		advance(300000);
		let s = timer.snapshot();
		expect(s.remainingMs).toBe(0);
		expect(s.overMs).toBe(0);
		expect(s.progress).toBe(1);
		advance(42900);
		s = timer.snapshot();
		expect(s.remainingMs).toBe(-42900);
		expect(s.overMs).toBe(42900);
		expect(s.progress).toBe(1);
	});

	it('一時停止中は経過が進まず、再開後は停止分を除く', () => {
		const { timer, advance } = setup();
		timer.start();
		advance(30000);
		timer.pause();
		advance(100000);
		let s = timer.snapshot();
		expect(s.paused).toBe(true);
		expect(s.elapsedMs).toBe(30000);
		timer.resume();
		expect(timer.snapshot().paused).toBe(false);
		advance(5000);
		s = timer.snapshot();
		expect(s.elapsedMs).toBe(35000);
	});

	it('一時停止を複数回くり返しても合計が正しい', () => {
		const { timer, advance } = setup();
		timer.start();
		advance(10000);
		timer.pause();
		advance(7000);
		timer.resume();
		advance(10000);
		timer.pause();
		advance(3000);
		timer.resume();
		advance(10000);
		expect(timer.snapshot().elapsedMs).toBe(30000);
	});

	it('pause・resume の重ね呼びと未開始での呼び出しは何もしない', () => {
		const { timer, advance } = setup();
		timer.pause();
		expect(timer.snapshot().paused).toBe(false);
		timer.start();
		advance(10000);
		timer.pause();
		advance(5000);
		timer.pause(); // 停止の起点を更新しない
		advance(5000);
		timer.resume();
		timer.resume(); // 二重に足さない
		expect(timer.snapshot().elapsedMs).toBe(10000);
	});

	it('一時停止中に持ち時間を超える時間が過ぎても超過にならない', () => {
		const { timer, advance } = setup();
		timer.start();
		advance(100000);
		timer.pause();
		advance(1000000);
		expect(timer.snapshot().phase).toBe('ok');
	});
});
