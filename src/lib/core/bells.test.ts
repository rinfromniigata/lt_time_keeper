import { describe, expect, it } from 'vitest';
import {
	bellAtElapsed,
	bellBadge,
	bellNote,
	dueStrikes,
	isSilent,
	nextBell,
	nextBellLabel,
	sortBells,
	warnAtElapsed,
	type Bell,
	type BellBase,
	type Strikes
} from './bells.ts';

const MIN = 60 * 1000;
const D = 5 * MIN;

function bell(id: string, base: BellBase, offsetMs: number, strikes: Strikes = 1): Bell {
	return { id, base, offsetMs, strikes };
}

// 初期値と同じ: 残り1:00×1、残り0:00×2、超過+1:00×3
const b1 = bell('b1', 'remaining', 1 * MIN, 1);
const b2 = bell('b2', 'remaining', 0, 2);
const b3 = bell('b3', 'over', 1 * MIN, 3);
const defaults = [b1, b2, b3];

describe('bellAtElapsed / isSilent', () => {
	it('残り基準は持ち時間から引き、超過後基準は足す', () => {
		expect(bellAtElapsed(b1, D)).toBe(4 * MIN);
		expect(bellAtElapsed(b2, D)).toBe(5 * MIN);
		expect(bellAtElapsed(b3, D)).toBe(6 * MIN);
	});

	it('残りが持ち時間より長いベルだけが鳴らない（等しければ開始と同時に鳴る）', () => {
		expect(isSilent(bell('x', 'remaining', D + 1), D)).toBe(true);
		expect(isSilent(bell('x', 'remaining', D), D)).toBe(false);
		expect(bellAtElapsed(bell('x', 'remaining', D), D)).toBe(0);
		expect(isSilent(bell('x', 'over', 99 * MIN), D)).toBe(false);
	});
});

describe('sortBells', () => {
	it('時刻の早い順に並べ、元の配列は変えない', () => {
		const input = [b3, b2, b1];
		expect(sortBells(input, D).map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
		expect(input.map((b) => b.id)).toEqual(['b3', 'b2', 'b1']);
	});

	it('同じ時点なら回数の多い順、それも同じなら元の順', () => {
		const a = bell('a', 'remaining', 0, 1);
		const b = bell('b', 'over', 0, 3);
		const c = bell('c', 'over', 0, 1);
		expect(sortBells([a, c, b], D).map((x) => x.id)).toEqual(['b', 'a', 'c']);
	});

	it('鳴らないベルは先頭に並ぶ', () => {
		const silent = bell('s', 'remaining', D + MIN);
		expect(sortBells([b1, silent], D).map((x) => x.id)).toEqual(['s', 'b1']);
	});
});

describe('warnAtElapsed', () => {
	it('最初のベルが持ち時間より前なら、その時点', () => {
		expect(warnAtElapsed(defaults, D)).toBe(4 * MIN);
	});

	it('最初のベルが残り0:00以降なら null', () => {
		expect(warnAtElapsed([b2, b3], D)).toBeNull();
		expect(warnAtElapsed([b3], D)).toBeNull();
	});

	it('ベルがなければ null', () => {
		expect(warnAtElapsed([], D)).toBeNull();
	});

	it('鳴らないベルは最初のベルに数えない', () => {
		const silent = bell('s', 'remaining', D + MIN);
		expect(warnAtElapsed([silent, b1], D)).toBe(4 * MIN);
		expect(warnAtElapsed([silent, b2], D)).toBeNull();
		expect(warnAtElapsed([silent], D)).toBeNull();
	});

	it('残り＝持ち時間のベルが最初なら、開始時点から予鈴', () => {
		expect(warnAtElapsed([bell('x', 'remaining', D)], D)).toBe(0);
	});
});

describe('bellBadge / nextBellLabel', () => {
	it('3件以下は「n鈴」、4件以上は数字だけ', () => {
		expect(bellBadge(0, 1)).toBe('1鈴');
		expect(bellBadge(2, 3)).toBe('3鈴');
		expect(bellBadge(0, 4)).toBe('1');
		expect(bellBadge(3, 4)).toBe('4');
	});

	it('次のベルは、3件以下で「n鈴まで」、4件以上で「n番目のベルまで」', () => {
		expect(nextBellLabel(0, 3)).toBe('1鈴まで');
		expect(nextBellLabel(2, 3)).toBe('3鈴まで');
		expect(nextBellLabel(3, 4)).toBe('4番目のベルまで');
	});
});

describe('bellNote', () => {
	it('初期値: 1鈴は黄に、2鈴は赤に、3鈴は —', () => {
		expect(bellNote(b1, defaults, D)).toBe('warn');
		expect(bellNote(b2, defaults, D)).toBe('over');
		expect(bellNote(b3, defaults, D)).toBeNull();
	});

	it('超過後+0:00 も持ち時間と同じ時点なので赤に', () => {
		expect(bellNote(bell('x', 'over', 0), [bell('x', 'over', 0)], D)).toBe('over');
	});

	it('鳴らないベルは silent。予鈴の基準にはならない', () => {
		const silent = bell('s', 'remaining', D + MIN);
		const all = [silent, b1, b2];
		expect(bellNote(silent, all, D)).toBe('silent');
		expect(bellNote(b1, all, D)).toBe('warn');
	});

	it('予鈴の時点が同じベルが複数あれば、回数の多い方だけが黄に', () => {
		const x = bell('x', 'remaining', 1 * MIN, 1);
		const y = bell('y', 'remaining', 1 * MIN, 2);
		expect(bellNote(y, [x, y], D)).toBe('warn');
		expect(bellNote(x, [x, y], D)).toBeNull();
	});

	it('最初のベルが残り0:00以降なら、黄になるベルはない', () => {
		expect(bellNote(b2, [b2, b3], D)).toBe('over');
		expect(bellNote(b3, [b2, b3], D)).toBeNull();
	});
});

describe('dueStrikes', () => {
	it('区間 (prev, elapsed] のベルを返す。境界は prev を含まず elapsed を含む', () => {
		expect(dueStrikes(defaults, D, 4 * MIN - 1, 4 * MIN)).toEqual([1]);
		expect(dueStrikes(defaults, D, 4 * MIN, 4 * MIN + 1)).toEqual([]);
		expect(dueStrikes(defaults, D, 0, 4 * MIN - 1)).toEqual([]);
	});

	it('区間を重ねずに進めれば、同じベルは二度鳴らない', () => {
		const rung: Strikes[] = [];
		let prev = -1;
		for (let t = 0; t <= 7 * MIN; t += 16) {
			rung.push(...dueStrikes(defaults, D, prev, t));
			prev = t;
		}
		expect(rung).toEqual([1, 2, 3]);
	});

	it('開始と同時に鳴るベルは prev = -1 から拾える。prev = 0 では拾わない', () => {
		const now = bell('x', 'remaining', D, 2);
		expect(dueStrikes([now], D, -1, 0)).toEqual([2]);
		expect(dueStrikes([now], D, 0, 100)).toEqual([]);
	});

	it('同じ時点のベルは、回数の多い方を1回だけ', () => {
		const a = bell('a', 'remaining', 0, 1);
		const b = bell('b', 'over', 0, 3);
		expect(dueStrikes([a, b], D, D - 1, D)).toEqual([3]);
	});

	it('区間に複数の時点があれば、時刻順にまとめて返す', () => {
		expect(dueStrikes(defaults, D, 0, 7 * MIN)).toEqual([1, 2, 3]);
	});

	it('鳴らないベルは返さない', () => {
		const silent = bell('s', 'remaining', D + MIN, 3);
		expect(dueStrikes([silent], D, -1, 10 * MIN)).toEqual([]);
	});

	it('ベルがなければ空', () => {
		expect(dueStrikes([], D, -1, 10 * MIN)).toEqual([]);
	});
});

describe('nextBell', () => {
	it('elapsed より後で最初のベルの並び順と、そこまでの時間を返す', () => {
		expect(nextBell(defaults, D, 0)).toEqual({ index: 0, inMs: 4 * MIN });
		expect(nextBell(defaults, D, 4 * MIN)).toEqual({ index: 1, inMs: MIN });
		expect(nextBell(defaults, D, 5 * MIN + 1)).toEqual({ index: 2, inMs: MIN - 1 });
	});

	it('ちょうど鳴った時点では、そのベルは「次」に数えない', () => {
		expect(nextBell(defaults, D, 6 * MIN)).toBeNull();
	});

	it('残りがなければ null', () => {
		expect(nextBell(defaults, D, 7 * MIN)).toBeNull();
		expect(nextBell([], D, 0)).toBeNull();
	});

	it('鳴らないベルは次にならないが、番号には数える', () => {
		const silent = bell('s', 'remaining', D + MIN);
		expect(nextBell([silent, b1], D, 0)).toEqual({ index: 1, inMs: 4 * MIN });
		expect(nextBell([silent], D, 0)).toBeNull();
	});

	it('開始と同時のベルは、elapsed = 0 では次にならない', () => {
		expect(nextBell([bell('x', 'remaining', D)], D, 0)).toBeNull();
	});
});
