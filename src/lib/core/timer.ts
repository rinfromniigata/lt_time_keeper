import type { Now } from './time.ts';

export type Phase = 'ok' | 'warn' | 'over';

export interface TimerConfig {
	durationMs: number; // 1秒以上
	warnAtElapsedMs: number | null; // 予鈴に変わる経過時間。予鈴の段階がなければ null
}

export interface TimerSnapshot {
	elapsedMs: number; // 一時停止中の時間を除いた経過
	remainingMs: number; // durationMs - elapsedMs（負になりうる）
	overMs: number; // max(0, -remainingMs)
	phase: Phase;
	paused: boolean;
	progress: number; // 残りの割合 0..1。超過では 1（赤で満たす）
}

/** カウンターは持たず、開始時刻と一時停止の合計から毎回計算する。終了は Timer を捨てることで表す */
export class Timer {
	#config: TimerConfig;
	#now: Now;
	#startedAt: number | null = null;
	#pausedAt: number | null = null;
	#pausedTotal = 0;

	constructor(config: TimerConfig, now: Now) {
		this.#config = config;
		this.#now = now;
	}

	/** 開始時刻を記録する。開始済みなら何もしない */
	start(): void {
		if (this.#startedAt !== null) return;
		this.#startedAt = this.#now();
	}

	/** 一時停止の開始時刻を記録する。未開始・一時停止中なら何もしない */
	pause(): void {
		if (this.#startedAt === null || this.#pausedAt !== null) return;
		this.#pausedAt = this.#now();
	}

	/** 一時停止の長さを合計に足す。一時停止中でなければ何もしない */
	resume(): void {
		if (this.#pausedAt === null) return;
		this.#pausedTotal += this.#now() - this.#pausedAt;
		this.#pausedAt = null;
	}

	snapshot(): TimerSnapshot {
		const { durationMs, warnAtElapsedMs } = this.#config;
		const elapsedMs = this.#elapsed();
		const remainingMs = durationMs - elapsedMs;
		const over = elapsedMs >= durationMs;
		const phase: Phase = over
			? 'over'
			: warnAtElapsedMs !== null && elapsedMs >= warnAtElapsedMs
				? 'warn'
				: 'ok';
		return {
			elapsedMs,
			remainingMs,
			overMs: Math.max(0, -remainingMs),
			phase,
			paused: this.#pausedAt !== null,
			progress: over ? 1 : remainingMs / durationMs
		};
	}

	#elapsed(): number {
		if (this.#startedAt === null) return 0;
		const now = this.#now();
		const pausing = this.#pausedAt === null ? 0 : now - this.#pausedAt;
		return Math.max(0, now - this.#startedAt - this.#pausedTotal - pausing);
	}
}
