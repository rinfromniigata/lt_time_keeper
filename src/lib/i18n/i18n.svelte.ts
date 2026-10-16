import ja from './locales/ja.json';
import en from './locales/en.json';
import zhHans from './locales/zh-Hans.json';
import { format, msg, type Dictionary, type Locale, type Message, type MessageKey } from './messages.ts';

// 3つの辞書は起動時に静的に読み込む（小さく、切り替えで読み込み直さないため）。ja が原文
const dictionaries = {
	ja,
	en: en satisfies Dictionary,
	'zh-Hans': zhHans satisfies Dictionary
};

/** 言語名は、常にその言語自身の表記で出す（辞書には入れない） */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
	ja: '日本語',
	en: 'English',
	'zh-Hans': '简体中文'
};

/** 現在の言語。疑似ロケール（T8-6）は開発時だけ加わる */
export type ActiveLocale = Locale | 'pseudo';

class I18n {
	locale = $state<ActiveLocale>('ja');

	/** 辞書は、疑似ロケール（T8-6）が加わっても同じ形で引けるよう、レコードとして持つ */
	dictionaries: Record<string, Dictionary> = { ...dictionaries };

	/** 言語を変える。ストアの値（持ち時間・ベル・表示名）には触れない */
	setLocale(locale: ActiveLocale): void {
		this.locale = locale;
	}

	t(key: MessageKey, args?: Message['args']): string {
		return this.tm(msg(key, args));
	}

	/** session・bells から受け取った Message をそのまま渡す版。`locale` を読むので、言語の変更で書き換わる */
	tm(m: Message): string {
		return format(this.dictionaries, this.locale, m);
	}

	/** `<html lang>` と `document.title` を現在の言語に合わせる（$effect から呼ぶ） */
	apply(): void {
		// 疑似ロケールの文字は原文（ja）の字形・書体で出す
		document.documentElement.lang = this.locale === 'pseudo' ? 'ja' : this.locale;
		document.title = this.t('app.name');
	}
}

export const i18n = new I18n();
