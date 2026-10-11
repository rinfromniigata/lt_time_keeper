export type BellBase = 'remaining' | 'over'; // 残り／超過後
export type Strikes = 1 | 2 | 3;

export interface Bell {
	id: string; // 追加時に採番。並べ替えても変わらない
	base: BellBase;
	offsetMs: number; // 0..MAX_INPUT_MS
	strikes: Strikes;
}

/** 計測開始からの経過で表したベルの時点。負なら鳴らない */
export function bellAtElapsed(bell: Bell, durationMs: number): number {
	return bell.base === 'remaining' ? durationMs - bell.offsetMs : durationMs + bell.offsetMs;
}

/** 「残り」が持ち時間より長い＝鳴らないベル */
export function isSilent(bell: Bell, durationMs: number): boolean {
	return bellAtElapsed(bell, durationMs) < 0;
}

/** 時刻の早い順に並べる（同じ時点なら回数の多い順。それも同じなら元の順）。元の配列は変えない */
export function sortBells(bells: Bell[], durationMs: number): Bell[] {
	return bells
		.map((bell, order) => ({ bell, order, at: bellAtElapsed(bell, durationMs) }))
		.sort((a, b) => a.at - b.at || b.bell.strikes - a.bell.strikes || a.order - b.order)
		.map((e) => e.bell);
}

/** 鳴るベル（鳴らないベルを除く）のうち最初のもの。なければ null */
function firstSounding(bells: Bell[], durationMs: number): Bell | null {
	return sortBells(bells, durationMs).find((b) => !isSilent(b, durationMs)) ?? null;
}

/** 予鈴に変わる経過時間。最初に鳴るベルが持ち時間より前にあればその時点、なければ null */
export function warnAtElapsed(bells: Bell[], durationMs: number): number | null {
	const first = firstSounding(bells, durationMs);
	if (first === null) return null;
	const at = bellAtElapsed(first, durationMs);
	return at < durationMs ? at : null;
}

/** 並び順の番号の表記。index は 0 始まり。3件以下 "1鈴"、4件以上 "1" */
export function bellBadge(index: number, count: number): string {
	return count <= 3 ? `${index + 1}鈴` : `${index + 1}`;
}

/** 「次のベル」の表記。index は 0 始まり。3件以下 "1鈴まで"、4件以上 "4番目のベルまで" */
export function nextBellLabel(index: number, count: number): string {
	return count <= 3 ? `${index + 1}鈴まで` : `${index + 1}番目のベルまで`;
}

/**
 * 行の補足文の種類。'silent'（鳴らない）・'warn'（ここで黄に）・'over'（ここで赤に）、
 * どれにも当たらなければ null（画面では「—」）
 */
export function bellNote(
	bell: Bell,
	bells: Bell[],
	durationMs: number
): 'warn' | 'over' | 'silent' | null {
	if (isSilent(bell, durationMs)) return 'silent';
	const at = bellAtElapsed(bell, durationMs);
	if (at === durationMs) return 'over';
	// 予鈴に変わる時点の最初のベル（同じ時点では回数の多い方が先頭に並ぶ）
	if (firstSounding(bells, durationMs)?.id === bell.id && at < durationMs) return 'warn';
	return null;
}

/**
 * (prevElapsed, elapsed] のあいだに来たベルを、同じ時点ごとにまとめて時刻順に返す。
 * 回数は同じ時点のうち最大のもの。鳴らないベルは含めない。
 * 開始と同時に鳴るベルを拾うには、最初の判定を prevElapsedMs = -1 から行う
 */
export function dueStrikes(
	bells: Bell[],
	durationMs: number,
	prevElapsedMs: number,
	elapsedMs: number
): Strikes[] {
	const byTime = new Map<number, Strikes>();
	for (const bell of bells) {
		const at = bellAtElapsed(bell, durationMs);
		if (at < 0 || at <= prevElapsedMs || at > elapsedMs) continue;
		const known = byTime.get(at);
		if (known === undefined || bell.strikes > known) byTime.set(at, bell.strikes);
	}
	return [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([, strikes]) => strikes);
}

/**
 * elapsed より後で最初に来るベル。index は並び順（0 始まり、鳴らないベルも数える）、
 * inMs はそこまでの時間。なければ null
 */
export function nextBell(
	bells: Bell[],
	durationMs: number,
	elapsedMs: number
): { index: number; inMs: number } | null {
	const sorted = sortBells(bells, durationMs);
	const index = sorted.findIndex((b) => {
		const at = bellAtElapsed(b, durationMs);
		return at >= 0 && at > elapsedMs;
	});
	if (index < 0) return null;
	return { index, inMs: bellAtElapsed(sorted[index], durationMs) - elapsedMs };
}
