import ja from './locales/ja.json';
import en from './locales/en.json';
import zhHans from './locales/zh-Hans.json';
import { format, LOCALES, msg, type Dictionary, type Locale, type MessageKey } from './messages.ts';

// app.html の %i18n.…% を、書き出し時に辞書から差し込む（純粋なTS。hooks.server.ts が呼ぶ）
const dicts: Record<Locale, Dictionary> = { ja, en, 'zh-Hans': zhHans };

function text(locale: Locale, key: MessageKey): string {
	return format(dicts, locale, msg(key));
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * `<script>` の中に置ける JSON。`<` を `<` にして、`</script>` で閉じられないようにする
 * （U+2028・U+2029 は JS の文字列として書けないため同様に直す）
 */
function scriptJson(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, '\\u003c')
		.replace(new RegExp('\\u2028', 'g'), '\\u2028')
		.replace(new RegExp('\\u2029', 'g'), '\\u2029');
}

/**
 * 差し込む値。
 * - %i18n.names%: 言語ごとのアプリ名（インラインスクリプトが `document.title` に使う）
 * - %i18n.splash%: S00 の「読み込み中…」。3言語を `lang` つきで持ち、CSS が `<html lang>` に合うものだけを出す
 * - %i18n.title%・%i18n.description%: 原文（日本語）の題名と説明。OGP と description は
 *   JS を動かさないクローラー向けで1言語しか出せないため
 */
export function shellValues(): Record<string, string> {
	const names = Object.fromEntries(LOCALES.map((l) => [l, text(l, 'app.name')]));
	const splash = LOCALES.map((l) => `<span lang="${l}">${escapeHtml(text(l, 'app.loading'))}</span>`).join('');
	return {
		'%i18n.names%': scriptJson(names),
		'%i18n.splash%': splash,
		'%i18n.title%': escapeHtml(text('ja', 'app.name')),
		'%i18n.description%': escapeHtml(text('ja', 'prefs.about.tagline'))
	};
}

/** app.html の差し込み位置をすべて置き換える */
export function fillShell(html: string): string {
	let out = html;
	for (const [placeholder, value] of Object.entries(shellValues())) {
		out = out.split(placeholder).join(value);
	}
	return out;
}
