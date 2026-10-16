import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, type Prefs } from '../prefs/prefs.ts';
import { PREFS_KEY, PREFS_VERSION, decodePrefs, encodePrefs } from './prefs_codec.ts';

const sample: Prefs = {
	locale: 'zh-Hans',
	theme: 'dark',
	volume: 0.5,
	vibrate: false,
	confirmEnd: false
};

describe('定数', () => {
	it('キーと版番号', () => {
		expect(PREFS_KEY).toBe('lt_time_keeper.prefs');
		expect(PREFS_VERSION).toBe(1);
	});
});

describe('encodePrefs', () => {
	it('版番号つきの形で書く', () => {
		expect(JSON.parse(encodePrefs(sample))).toEqual({ v: 1, ...sample });
	});
});

describe('decodePrefs', () => {
	it('書いた値をそのまま読み戻せる', () => {
		expect(decodePrefs(encodePrefs(sample))).toEqual(sample);
		expect(decodePrefs(encodePrefs(DEFAULT_PREFS))).toEqual(DEFAULT_PREFS);
	});

	it('未保存（null）・JSON でない・オブジェクトでない・v が違う値は null', () => {
		expect(decodePrefs(null)).toBeNull();
		expect(decodePrefs('')).toBeNull();
		expect(decodePrefs('{broken')).toBeNull();
		expect(decodePrefs('[]')).toBeNull();
		expect(decodePrefs('"x"')).toBeNull();
		expect(decodePrefs('null')).toBeNull();
		expect(decodePrefs('{"theme":"dark"}')).toBeNull();
		expect(decodePrefs('{"v":2,"theme":"dark"}')).toBeNull();
		expect(decodePrefs('{"v":"1","theme":"dark"}')).toBeNull();
	});

	it('項目ごとの不正は、その項目だけ初期値になる', () => {
		const raw = JSON.stringify({
			v: 1,
			locale: 'fr',
			theme: 'blue',
			volume: 2,
			vibrate: 'yes',
			confirmEnd: false
		});
		expect(decodePrefs(raw)).toEqual({ ...DEFAULT_PREFS, confirmEnd: false });
	});

	it('正しい項目は、ほかの項目が不正でも保たれる', () => {
		const raw = JSON.stringify({ v: 1, locale: 'en', theme: 'light', volume: 'loud' });
		expect(decodePrefs(raw)).toEqual({ ...DEFAULT_PREFS, locale: 'en', theme: 'light' });
	});

	it('音量は 0 と 1 を含む範囲だけ受け付ける', () => {
		const vol = (v: unknown) => decodePrefs(JSON.stringify({ v: 1, volume: v }))!.volume;
		expect(vol(0)).toBe(0);
		expect(vol(1)).toBe(1);
		expect(vol(-0.1)).toBe(DEFAULT_PREFS.volume);
		expect(vol(1.1)).toBe(DEFAULT_PREFS.volume);
		expect(vol(null)).toBe(DEFAULT_PREFS.volume);
		expect(decodePrefs('{"v":1,"volume":1e999}')!.volume).toBe(DEFAULT_PREFS.volume);
	});

	it('locale は null（未選択）を保てる', () => {
		expect(decodePrefs('{"v":1,"locale":null}')!.locale).toBeNull();
	});

	it('項目が欠けていれば初期値、知らない項目は無視する', () => {
		const p = decodePrefs('{"v":1,"theme":"dark","extra":123}');
		expect(p).toEqual({ ...DEFAULT_PREFS, theme: 'dark' });
		expect(p).not.toHaveProperty('extra');
	});
});
