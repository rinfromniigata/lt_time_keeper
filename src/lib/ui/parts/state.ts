/** 画面に出す状態。タイマーの phase（通常・予鈴・超過）に、一時停止を加えたもの */
import type { MessageKey } from '#lib/i18n/messages.ts';

export type DisplayState = 'ok' | 'warn' | 'over' | 'paused';

/** 状態ラベルの辞書のキー。通常（ok）はラベルを出さない（経過の表示になる） */
export const STATE_LABEL_KEYS = {
	warn: 'timer.state.warn',
	over: 'timer.state.over',
	paused: 'timer.state.paused'
} as const satisfies Partial<Record<DisplayState, MessageKey>>;
