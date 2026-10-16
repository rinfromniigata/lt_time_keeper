import { describe, expect, it } from 'vitest';
import ja from './locales/ja.json';
import en from './locales/en.json';
import { pseudoDictionary, pseudolocalize } from './pseudo.ts';
import { format, msg, type Dictionary } from './messages.ts';

describe('pseudolocalize', () => {
	it('前後を ［］ で囲み、長さを約1.4倍にする', () => {
		const out = pseudolocalize('ベルを追加');
		expect(out.startsWith('［ベルを追加')).toBe(true);
		expect(out.endsWith('］')).toBe(true);
		expect(out.length).toBe(1 + 5 + 2 + 1); // 5文字 × 0.4 = 2 の埋め草
	});

	it('プレースホルダは残し、長さの計算に入れない', () => {
		const out = pseudolocalize('残り {time}');
		expect(out).toContain('{time}');
		expect(out.match(/\{\w+\}/g)).toEqual(['{time}']);
	});
});

describe('pseudoDictionary', () => {
	const pseudo = pseudoDictionary(ja);

	it('ja と同じキーを持ち、すべての値が囲まれている', () => {
		expect(Object.keys(pseudo).sort()).toEqual(Object.keys(ja).sort());
		for (const value of Object.values(pseudo)) {
			const forms = typeof value === 'string' ? [value] : Object.values(value);
			for (const s of forms) expect(s).toMatch(/^［.*］$/);
		}
	});

	it('format で引け、プレースホルダが置き換わる', () => {
		const dicts: Record<string, Dictionary> = { ja, pseudo };
		const out = format(dicts, 'pseudo', msg('settings.duration.preset', { n: 5 }));
		expect(out).toMatch(/^［5分〜*］$/);
	});

	it('複数形の辞書は、各形を変える（en の複数形で確かめる）', () => {
		const p = pseudoDictionary(en);
		const dicts: Record<string, Dictionary> = { ja, pseudo: p };
		expect(format(dicts, 'pseudo', msg('settings.bells.count', { n: 1 }))).toMatch(/^［1 bell/);
		expect(format(dicts, 'pseudo', msg('settings.bells.count', { n: 3 }))).toMatch(/^［3 bells/);
	});
});
