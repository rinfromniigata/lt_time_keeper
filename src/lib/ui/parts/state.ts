/** 画面に出す状態。タイマーの phase（通常・予鈴・超過）に、一時停止を加えたもの */
export type DisplayState = 'ok' | 'warn' | 'over' | 'paused';

export const STATE_LABELS: Record<DisplayState, string> = {
	ok: '通常',
	warn: '予鈴',
	over: '超過',
	paused: '一時停止中'
};
