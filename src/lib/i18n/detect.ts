import type { Locale } from './messages.ts';

/**
 * navigator.languages を先頭から見て、対応言語に当たったものを返す。
 * ja* → ja、en* → en、zh*（繁体字を含む）→ zh-Hans。どれもなければ en
 */
export function detectLocale(languages: readonly string[]): Locale {
	for (const tag of languages) {
		const primary = tag.toLowerCase().split(/[-_]/)[0];
		if (primary === 'ja') return 'ja';
		if (primary === 'en') return 'en';
		if (primary === 'zh') return 'zh-Hans';
	}
	return 'en';
}
