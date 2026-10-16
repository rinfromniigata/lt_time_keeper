import { describe, expect, it } from 'vitest';
import ja from './locales/ja.json';
import en from './locales/en.json';
import zhHans from './locales/zh-Hans.json';
import { PREFS_KEY, PREFS_VERSION } from '../storage/prefs_codec.ts';
import { fillShell, shellValues } from './shell.ts';

describe('fillShell', () => {
	it('app.html の差し込み位置を、辞書の値で置き換える', () => {
		const html = '<title>%i18n.title%</title>%i18n.description%|%i18n.splash%|%i18n.names%|%i18n.prefs%';
		const out = fillShell(html);
		expect(out).not.toContain('%i18n.');
		expect(out).toContain(`<title>${ja['app.name']}</title>`);
		expect(out).toContain(ja['prefs.about.tagline']);
	});

	it('S00 は3言語の文言を lang つきで持つ', () => {
		const splash = shellValues()['%i18n.splash%'];
		expect(splash).toContain(`<span lang="ja">${ja['app.loading']}</span>`);
		expect(splash).toContain(`<span lang="en">${en['app.loading']}</span>`);
		expect(splash).toContain(`<span lang="zh-Hans">${zhHans['app.loading']}</span>`);
	});

	it('アプリ名の表は言語ごとの値を持つ JSON で、<script> を閉じる文字を含まない', () => {
		const raw = shellValues()['%i18n.names%'];
		expect(raw).not.toContain('<');
		expect(JSON.parse(raw)).toEqual({
			ja: ja['app.name'],
			en: en['app.name'],
			'zh-Hans': zhHans['app.name']
		});
	});

	it('保存のキー名・版番号・言語の一覧を prefs_codec の定数から渡す', () => {
		const raw = shellValues()['%i18n.prefs%'];
		expect(raw).not.toContain('<');
		expect(JSON.parse(raw)).toEqual({ key: PREFS_KEY, version: PREFS_VERSION, locales: ['ja', 'en', 'zh-Hans'] });
	});
});
