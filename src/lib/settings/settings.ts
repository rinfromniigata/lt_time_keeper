import type { Bell, BellBase, Strikes } from '../core/bells.ts';

export type { Bell, BellBase, Strikes };

export interface Settings {
	durationMs: number;
	bells: Bell[];
	title: string;
	volume: number; // 0..1
	vibrate: boolean; // スイッチは対応端末でだけ出す
}

const MINUTE = 60 * 1000;

/** 5:00、残り1:00×1、残り0:00×2、超過+1:00×3、表示名なし、音量0.7、振動オン */
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
	durationMs: 5 * MINUTE,
	bells: [
		{ id: 'default-1', base: 'remaining', offsetMs: 1 * MINUTE, strikes: 1 },
		{ id: 'default-2', base: 'remaining', offsetMs: 0, strikes: 2 },
		{ id: 'default-3', base: 'over', offsetMs: 1 * MINUTE, strikes: 3 }
	] satisfies Bell[],
	title: '',
	volume: 0.7,
	vibrate: true
});

export interface SettingsIssues {
	durationZero: boolean; // 開始できない
	silentBellIds: string[]; // 警告だけ。開始は止めない
}

export function validate(s: Settings): SettingsIssues {
	return {
		durationZero: s.durationMs <= 0,
		// 鳴らないベルの検出は T3-2 で足す
		silentBellIds: []
	};
}

export function canStart(s: Settings): boolean {
	return !validate(s).durationZero;
}
