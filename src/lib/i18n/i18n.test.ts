import { afterEach, describe, expect, it } from 'vitest';
import { i18n, LOCALE_NAMES } from './i18n.svelte.ts';
import { msg } from './messages.ts';

afterEach(() => i18n.setLocale('ja'));

describe('i18n', () => {
	it('t・tm は現在の言語で引き、言語を変えると結果が変わる', () => {
		expect(i18n.t('settings.start')).toBe('開始');
		expect(i18n.tm(msg('settings.bells.count', { n: 2 }))).toBe('2件');
		i18n.setLocale('en');
		expect(i18n.t('settings.start')).not.toBe('開始');
		expect(i18n.tm(msg('settings.bells.count', { n: 2 }))).toBe('2 bells');
	});

	it('apply は <html lang> と題名を現在の言語に合わせる', () => {
		const doc = { documentElement: { lang: '' }, title: '' };
		(globalThis as { document?: unknown }).document = doc;
		try {
			i18n.setLocale('zh-Hans');
			i18n.apply();
			expect(doc.documentElement.lang).toBe('zh-Hans');
			expect(doc.title).toBe(i18n.t('app.name'));
			i18n.setLocale('en');
			i18n.apply();
			expect(doc.documentElement.lang).toBe('en');
			expect(doc.title).toBe('LT Timekeeper');
		} finally {
			delete (globalThis as { document?: unknown }).document;
		}
	});

	it('言語名はその言語自身の表記', () => {
		expect(LOCALE_NAMES).toEqual({ ja: '日本語', en: 'English', 'zh-Hans': '简体中文' });
	});
});
