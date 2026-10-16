import { describe, expect, it } from 'vitest';
import ja from './locales/ja.json';
import en from './locales/en.json';
import zhHans from './locales/zh-Hans.json';
import { detectLocale } from './detect.ts';
import { format, msg, type Dictionary, type MessageKey } from './messages.ts';

// 3言語とも、ja のキーをすべて持つこと（欠けたキーは型エラーになる）
const dicts = {
	ja,
	en: en satisfies Dictionary,
	'zh-Hans': zhHans satisfies Dictionary
};

describe('format', () => {
	it('プレースホルダを置き換える', () => {
		expect(format(dicts, 'ja', msg('settings.duration.preset', { n: 5 }))).toBe('5分');
		expect(format(dicts, 'en', msg('settings.duration.preset', { n: 5 }))).toBe('5 min');
		expect(format(dicts, 'zh-Hans', msg('settings.bells.remaining', { time: '1:00' }))).toBe('剩余 1:00');
	});

	it('英語の複数形は args.n で選ぶ', () => {
		expect(format(dicts, 'en', msg('settings.bells.count', { n: 1 }))).toBe('1 bell');
		expect(format(dicts, 'en', msg('settings.bells.count', { n: 3 }))).toBe('3 bells');
		expect(format(dicts, 'en', msg('settings.bells.count', { n: 0 }))).toBe('0 bells');
	});

	it('複数形のない言語は other を使う', () => {
		expect(format(dicts, 'ja', msg('settings.bells.count', { n: 1 }))).toBe('1件');
		expect(format(dicts, 'zh-Hans', msg('settings.bells.count', { n: 1 }))).toBe('1 个');
	});

	it('引数に別のメッセージを入れられる', () => {
		const label = msg('settings.bells.label_ordinal', { n: 2 });
		expect(format(dicts, 'ja', msg('timer.next_bell_short', { label, time: '4:00' }))).toBe(
			'2鈴まで 4:00'
		);
		expect(format(dicts, 'en', msg('timer.next_bell_short', { label, time: '4:00' }))).toContain(
			'Bell 2'
		);
	});

	it('その言語の辞書にないキーは ja にフォールバックする', () => {
		const partial = { ja: { 'app.name': '原文' }, en: {} } as unknown as Record<string, Dictionary>;
		expect(format(partial, 'en', msg('app.name'))).toBe('原文');
	});

	it('どの辞書にもないキーはキーをそのまま返し、足りない引数は残す', () => {
		expect(format(dicts, 'ja', { key: 'no.such.key' as MessageKey })).toBe('no.such.key');
		expect(format(dicts, 'ja', msg('settings.duration.preset'))).toBe('{n}分');
	});
});

describe('辞書', () => {
	it('3言語のキーが一致する', () => {
		const keys = Object.keys(ja).sort();
		expect(Object.keys(en).sort()).toEqual(keys);
		expect(Object.keys(zhHans).sort()).toEqual(keys);
	});
});

describe('detectLocale', () => {
	it('先頭から見て最初に当たった対応言語を返す', () => {
		expect(detectLocale(['ja-JP', 'en-US'])).toBe('ja');
		expect(detectLocale(['fr-FR', 'en-US'])).toBe('en');
		expect(detectLocale(['fr-FR', 'ja'])).toBe('ja');
	});

	it('中国語は繁体字も含めて zh-Hans にする', () => {
		expect(detectLocale(['zh-TW'])).toBe('zh-Hans');
		expect(detectLocale(['zh-Hant-HK'])).toBe('zh-Hans');
		expect(detectLocale(['zh'])).toBe('zh-Hans');
	});

	it('どれもなければ en', () => {
		expect(detectLocale(['fr-FR', 'de'])).toBe('en');
		expect(detectLocale([])).toBe('en');
	});

	it('接頭辞だけが似た言語は当てはめない', () => {
		expect(detectLocale(['jv', 'enm'])).toBe('en');
		expect(detectLocale(['jv'])).toBe('en');
	});
});
