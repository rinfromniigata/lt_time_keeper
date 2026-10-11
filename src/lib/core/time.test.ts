import { describe, expect, it } from 'vitest';
import { MAX_INPUT_MS, SECOND, formatClock, formatOver, formatRemaining } from './time.ts';

describe('定数', () => {
	it('SECOND は1000ms、MAX_INPUT_MS は 99:59', () => {
		expect(SECOND).toBe(1000);
		expect(MAX_INPUT_MS).toBe(5999 * 1000);
		expect(formatClock(MAX_INPUT_MS)).toBe('99:59');
	});
});

describe('formatRemaining（秒は切り上げ）', () => {
	it('ちょうどの秒はそのまま', () => {
		expect(formatRemaining(300000)).toBe('5:00');
		expect(formatRemaining(60000)).toBe('1:00');
		expect(formatRemaining(1000)).toBe('0:01');
	});
	it('端数があれば次の秒へ切り上げる', () => {
		expect(formatRemaining(59001)).toBe('1:00');
		expect(formatRemaining(60001)).toBe('1:01');
		expect(formatRemaining(1)).toBe('0:01');
		expect(formatRemaining(999)).toBe('0:01');
	});
	it('秒は2桁にそろえる', () => {
		expect(formatRemaining(5000)).toBe('0:05');
		expect(formatRemaining(65000)).toBe('1:05');
	});
	it('0以下は 0:00 に丸める', () => {
		expect(formatRemaining(0)).toBe('0:00');
		expect(formatRemaining(-500)).toBe('0:00');
	});
	it('99:59 を表示できる', () => {
		expect(formatRemaining(MAX_INPUT_MS)).toBe('99:59');
	});
});

describe('formatOver（秒は切り捨て）', () => {
	it('先頭に + を付ける', () => {
		expect(formatOver(42900)).toBe('+0:42');
		expect(formatOver(60000)).toBe('+1:00');
	});
	it('超過した瞬間は +0:00', () => {
		expect(formatOver(0)).toBe('+0:00');
		expect(formatOver(999)).toBe('+0:00');
		expect(formatOver(1000)).toBe('+0:01');
	});
	it('負の値は +0:00 に丸める', () => {
		expect(formatOver(-1)).toBe('+0:00');
	});
});

describe('formatClock（秒は切り捨て）', () => {
	it('分:秒で表示する', () => {
		expect(formatClock(0)).toBe('0:00');
		expect(formatClock(108000)).toBe('1:48');
		expect(formatClock(299999)).toBe('4:59');
	});
	it('負の値は 0:00 に丸める', () => {
		expect(formatClock(-1000)).toBe('0:00');
	});
});

describe('残りと超過の境目', () => {
	it('残りが0になる瞬間に 0:01 → +0:00 と切り替わる', () => {
		expect(formatRemaining(1)).toBe('0:01');
		expect(formatOver(0)).toBe('+0:00');
	});
});
