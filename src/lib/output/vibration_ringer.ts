import { STRIKE_INTERVAL_MS, type Ringer, type Strikes } from './ringer.ts';

const PULSE_MS = 200;

type Vibrate = (pattern: number[]) => boolean;

/** 回数分のパルス（振動・休止の交互）。最後の休止は付けない */
export function vibrationPattern(strikes: Strikes): number[] {
	const pattern: number[] = [];
	for (let i = 0; i < strikes; i++) {
		if (i > 0) pattern.push(STRIKE_INTERVAL_MS - PULSE_MS);
		pattern.push(PULSE_MS);
	}
	return pattern;
}

/** navigator.vibrate による振動。音量や unlock は関係しない */
export class VibrationRinger implements Ringer {
	#vibrate: Vibrate | null;

	constructor(vibrate: Vibrate | null = VibrationRinger.#browserVibrate()) {
		this.#vibrate = vibrate;
	}

	/** 設定画面のスイッチを出すかどうかの判定に使う */
	static isSupported(): boolean {
		return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
	}

	static #browserVibrate(): Vibrate | null {
		return VibrationRinger.isSupported() ? (p) => navigator.vibrate(p) : null;
	}

	readonly blocked = false;

	async unlock(): Promise<void> {}

	setVolume(): void {}

	ring(strikes: Strikes): void {
		this.#vibrate?.(vibrationPattern(strikes));
	}
}
