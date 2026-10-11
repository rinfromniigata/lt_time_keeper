import { STRIKE_INTERVAL_MS, type Ringer, type Strikes } from './ringer.ts';

/** 基音と、それに重ねる倍音（周波数の比と、音量の比） */
const FUNDAMENTAL_HZ = 880;
const PARTIALS: readonly (readonly [ratio: number, gain: number])[] = [
	[1, 1],
	[2.4, 0.45],
	[4.1, 0.2]
];
const ATTACK_S = 0.005;
const DECAY_S = 1.6;
const PEAK_GAIN = 0.5;
const SILENT_GAIN = 0.0001; // 指数関数的な減衰は 0 に届かないため
const INITIAL_VOLUME = 0.7;

/** Web Audio API でベル音を合成して鳴らす */
export class AudioRinger implements Ringer {
	#createContext: () => AudioContext;
	#ctx: AudioContext | null = null;
	#master: GainNode | null = null;
	#volume = INITIAL_VOLUME;

	constructor(createContext: () => AudioContext = () => new AudioContext()) {
		this.#createContext = createContext;
	}

	get blocked(): boolean {
		return this.#ctx === null || this.#ctx.state !== 'running';
	}

	async unlock(): Promise<void> {
		try {
			if (this.#ctx === null) {
				this.#ctx = this.#createContext();
				this.#master = this.#ctx.createGain();
				this.#master.gain.value = this.#volume;
				this.#master.connect(this.#ctx.destination);
			}
			if (this.#ctx.state !== 'running') await this.#ctx.resume();
		} catch {
			// 音を出せない環境。blocked で伝える
		}
	}

	setVolume(volume: number): void {
		this.#volume = Math.min(1, Math.max(0, volume));
		if (this.#master && this.#ctx) {
			this.#master.gain.setValueAtTime(this.#volume, this.#ctx.currentTime);
		}
	}

	ring(strikes: Strikes): void {
		const ctx = this.#ctx;
		if (ctx === null || this.#master === null || ctx.state !== 'running') return;
		for (let i = 0; i < strikes; i++) {
			this.#strike(ctx, this.#master, ctx.currentTime + (i * STRIKE_INTERVAL_MS) / 1000);
		}
	}

	#strike(ctx: AudioContext, out: GainNode, at: number): void {
		for (const [ratio, partialGain] of PARTIALS) {
			const osc = ctx.createOscillator();
			const env = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.value = FUNDAMENTAL_HZ * ratio;
			// 倍音は基音より早く消える
			const decay = DECAY_S / ratio;
			env.gain.setValueAtTime(SILENT_GAIN, at);
			env.gain.linearRampToValueAtTime(PEAK_GAIN * partialGain, at + ATTACK_S);
			env.gain.exponentialRampToValueAtTime(SILENT_GAIN, at + ATTACK_S + decay);
			osc.connect(env).connect(out);
			osc.start(at);
			osc.stop(at + ATTACK_S + decay);
		}
	}
}
