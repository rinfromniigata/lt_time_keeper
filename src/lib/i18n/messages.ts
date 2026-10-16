import ja from './locales/ja.json';

export type MessageKey = keyof typeof ja;
export type Locale = 'ja' | 'en' | 'zh-Hans';
export const LOCALES: readonly Locale[] = ['ja', 'en', 'zh-Hans'];

/** 文字列、または複数形の形ごとの文字列（Intl.PluralRules の分類） */
export type MessageValue = string | (Partial<Record<Intl.LDMLPluralRule, string>> & { other: string });
export type Dictionary = Record<MessageKey, MessageValue>;

/** 引数には、文字列・数値のほか、別のメッセージを入れられる */
export interface Message {
	key: MessageKey;
	args?: Record<string, string | number | Message>;
}

export function msg(key: MessageKey, args?: Message['args']): Message {
	return args === undefined ? { key } : { key, args };
}

const SOURCE_LOCALE: Locale = 'ja';

/**
 * 辞書を引いて組み立てる。複数形は args.n で選ぶ。
 * キーがその言語の辞書になければ原文（ja）にフォールバックする
 */
export function format(dicts: Record<string, Dictionary>, locale: string, m: Message): string {
	const value = dicts[locale]?.[m.key] ?? dicts[SOURCE_LOCALE]?.[m.key];
	if (value === undefined) return m.key;

	let template: string;
	if (typeof value === 'string') {
		template = value;
	} else {
		const n = m.args?.n;
		const category = typeof n === 'number' ? new Intl.PluralRules(locale).select(n) : 'other';
		template = value[category] ?? value.other;
	}

	return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
		const arg = m.args?.[name];
		if (arg === undefined) return whole;
		return typeof arg === 'object' ? format(dicts, locale, arg) : String(arg);
	});
}
