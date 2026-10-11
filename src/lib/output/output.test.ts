import { describe, expect, it } from 'vitest';
import { AudioRinger } from './audio_ringer.ts';
import { CompositeRinger } from './composite_ringer.ts';
import { STRIKE_INTERVAL_MS, type Ringer, type Strikes } from './ringer.ts';
import { VibrationRinger, vibrationPattern } from './vibration_ringer.ts';

/** 呼び出しだけを記録する AudioContext の代役 */
function fakeContext(initial: 'suspended' | 'running' = 'suspended', resumes = true) {
	const log = { oscillators: [] as { frequency: number; start: number }[], created: 0, resumed: 0 };
	const master = { gain: { value: 0, calls: [] as number[], setValueAtTime(v: number) { this.calls.push(v); } }, connect() {} };
	const ctx = {
		state: initial as string,
		currentTime: 10,
		destination: {},
		createGain: () =>
			log.created++ === 0
				? master
				: { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect() {} }) },
		createOscillator: () => {
			const osc = {
				type: '',
				frequency: { value: 0 },
				connect: () => ({ connect() {} }),
				start: (t: number) => log.oscillators.push({ frequency: osc.frequency.value, start: t }),
				stop() {}
			};
			return osc;
		},
		resume: async () => {
			log.resumed++;
			if (resumes) ctx.state = 'running';
		}
	};
	return { ctx: ctx as unknown as AudioContext, log, master };
}

describe('AudioRinger', () => {
	it('unlock 前は blocked で、ring しても何も鳴らさない', () => {
		const { ctx, log } = fakeContext();
		const r = new AudioRinger(() => ctx);
		expect(r.blocked).toBe(true);
		r.ring(1);
		expect(log.oscillators).toEqual([]);
	});

	it('unlock で resume し、blocked でなくなる。二度呼んでも context は1つ', async () => {
		const { ctx, log } = fakeContext();
		let made = 0;
		const r = new AudioRinger(() => (made++, ctx));
		await r.unlock();
		await r.unlock();
		expect(r.blocked).toBe(false);
		expect(made).toBe(1);
		expect(log.resumed).toBe(1);
	});

	it('resume できなければ blocked のまま', async () => {
		const { ctx } = fakeContext('suspended', false);
		const r = new AudioRinger(() => ctx);
		await r.unlock();
		expect(r.blocked).toBe(true);
	});

	it('context を作れない環境でも例外を出さず blocked', async () => {
		const r = new AudioRinger(() => {
			throw new Error('unsupported');
		});
		await expect(r.unlock()).resolves.toBeUndefined();
		expect(r.blocked).toBe(true);
		expect(() => r.ring(2)).not.toThrow();
	});

	it('回数分、一定の間隔で、倍音を重ねて鳴らす', async () => {
		const { ctx, log } = fakeContext();
		const r = new AudioRinger(() => ctx);
		await r.unlock();
		r.ring(3);
		const starts = [...new Set(log.oscillators.map((o) => o.start))];
		expect(starts).toEqual([10, 10 + STRIKE_INTERVAL_MS / 1000, 10 + (2 * STRIKE_INTERVAL_MS) / 1000]);
		expect(log.oscillators.length).toBe(3 * 3);
		expect(log.oscillators.slice(0, 3).map((o) => o.frequency)).toEqual([880, 880 * 2.4, 880 * 4.1]);
	});

	it('音量は 0..1 に収めて GainNode に渡す', async () => {
		const { ctx, master } = fakeContext();
		const r = new AudioRinger(() => ctx);
		await r.unlock();
		expect(master.gain.value).toBe(0.7);
		r.setVolume(2);
		r.setVolume(-1);
		r.setVolume(0.3);
		expect(master.gain.calls).toEqual([1, 0, 0.3]);
	});

	it('unlock 前に setVolume した値が、unlock 後に使われる', async () => {
		const { ctx, master } = fakeContext();
		const r = new AudioRinger(() => ctx);
		r.setVolume(0.2);
		await r.unlock();
		expect(master.gain.value).toBe(0.2);
	});
});

describe('VibrationRinger', () => {
	it('パターンは回数分の振動を、打ち始めの間隔をそろえて並べる', () => {
		expect(vibrationPattern(1)).toEqual([200]);
		expect(vibrationPattern(2)).toEqual([200, STRIKE_INTERVAL_MS - 200, 200]);
		expect(vibrationPattern(3)).toHaveLength(5);
	});

	it('ring でパターンを渡す。非対応なら何もしない', () => {
		const calls: number[][] = [];
		new VibrationRinger((p) => (calls.push(p), true)).ring(2);
		expect(calls).toEqual([vibrationPattern(2)]);
		expect(() => new VibrationRinger(null).ring(3)).not.toThrow();
	});

	it('音の仕組み（unlock・volume・blocked）には関与しない', async () => {
		const r = new VibrationRinger(null);
		await r.unlock();
		r.setVolume();
		expect(r.blocked).toBe(false);
	});

	it('node には navigator.vibrate がないので非対応', () => {
		expect(VibrationRinger.isSupported()).toBe(false);
	});
});

describe('CompositeRinger', () => {
	function spy(blocked = false) {
		const calls: string[] = [];
		const r: Ringer = {
			blocked,
			unlock: async () => void calls.push('unlock'),
			ring: (s: Strikes) => void calls.push(`ring${s}`),
			setVolume: (v) => void calls.push(`vol${v}`)
		};
		return { r, calls };
	}

	it('すべての Ringer に同じ呼び出しを渡す', async () => {
		const a = spy();
		const b = spy();
		const c = new CompositeRinger([a.r, b.r]);
		await c.unlock();
		c.ring(2);
		c.setVolume(0.5);
		for (const x of [a, b]) expect(x.calls).toEqual(['unlock', 'ring2', 'vol0.5']);
	});

	it('どれかが blocked なら blocked', () => {
		expect(new CompositeRinger([spy().r, spy(true).r]).blocked).toBe(true);
		expect(new CompositeRinger([spy().r]).blocked).toBe(false);
		expect(new CompositeRinger([]).blocked).toBe(false);
	});
});
