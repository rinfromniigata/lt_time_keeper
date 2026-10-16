import type { Locale } from '../i18n/messages.ts';

export type ThemeChoice = 'system' | 'light' | 'dark';
export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

/** 端末に保存する環境設定（持ち時間・ベル・表示名は含めない） */
export interface Prefs {
	/** null = まだ選んでいない（毎回ブラウザの言語で決める） */
	locale: Locale | null;
	theme: ThemeChoice;
	/** 0..1 */
	volume: number;
	vibrate: boolean;
	/** 終了の確認を出すか */
	confirmEnd: boolean;
}

export const DEFAULT_PREFS: Readonly<Prefs> = Object.freeze({
	locale: null,
	theme: 'system',
	volume: 0.7,
	vibrate: true,
	confirmEnd: true
});
