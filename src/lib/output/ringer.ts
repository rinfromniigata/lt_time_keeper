import type { Strikes } from '../core/bells.ts';

export type { Strikes };

/** 複数回鳴らすときの、打ち始めから次の打ち始めまでの間隔。音と振動でそろえる */
export const STRIKE_INTERVAL_MS = 700;

export interface Ringer {
	/** 利用者の操作の中で呼ぶ（自動再生の制限を解除する） */
	unlock(): Promise<void>;
	ring(strikes: Strikes): void;
	setVolume(volume: number): void;
	/** 音を出せない状態か（AudioContext が running にならないなど） */
	readonly blocked: boolean;
}
