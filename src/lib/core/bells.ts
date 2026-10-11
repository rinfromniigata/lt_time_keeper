export type BellBase = 'remaining' | 'over'; // 残り／超過後
export type Strikes = 1 | 2 | 3;

export interface Bell {
	id: string; // 追加時に採番。並べ替えても変わらない
	base: BellBase;
	offsetMs: number; // 0..MAX_INPUT_MS
	strikes: Strikes;
}
