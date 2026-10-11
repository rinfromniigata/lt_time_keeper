/** 単調増加するミリ秒を返す。本番は performance.now、テストは差し替える */
export type Now = () => number;

export const SECOND = 1000;
export const MAX_INPUT_MS = (99 * 60 + 59) * SECOND; // 99:59

/** 秒数を「分:秒」にする。分は繰り上げず（99:59 を超えても 100:00 のように）、秒は2桁にそろえる */
function minutesSeconds(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** 残り時間の表示（秒は切り上げ）。remainingMs > 0 のとき使う。例: 59001ms → "1:00" */
export function formatRemaining(remainingMs: number): string {
	return minutesSeconds(Math.max(0, Math.ceil(remainingMs / SECOND)));
}

/** 超過時間の表示（秒は切り捨て）。例: 42900ms → "+0:42" */
export function formatOver(overMs: number): string {
	return `+${formatClock(overMs)}`;
}

/** 経過・持ち時間など、そのまま切り捨てで出す表示。例: "1:48" */
export function formatClock(ms: number): string {
	return minutesSeconds(Math.max(0, Math.floor(ms / SECOND)));
}
