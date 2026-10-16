import { LOCALES, type Locale } from '../i18n/messages.ts';
import { DEFAULT_PREFS, THEME_CHOICES, type Prefs, type ThemeChoice } from '../prefs/prefs.ts';

export const PREFS_KEY = 'lt_time_keeper.prefs';
export const PREFS_VERSION = 1;

/** `{"v":1,"locale":…,"theme":…,"volume":…,"vibrate":…,"confirmEnd":…}` */
export function encodePrefs(p: Prefs): string {
	return JSON.stringify({
		v: PREFS_VERSION,
		locale: p.locale,
		theme: p.theme,
		volume: p.volume,
		vibrate: p.vibrate,
		confirmEnd: p.confirmEnd
	});
}

/**
 * JSON でない・オブジェクトでない・`v` が違う → null（全体を初期値にする）。
 * 項目ごとに型や範囲が違えば、その項目だけ初期値にする。知らない項目は無視する
 */
export function decodePrefs(raw: string | null): Prefs | null {
	if (raw === null) return null;
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		return null;
	}
	if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
	const o = data as Record<string, unknown>;
	if (o.v !== PREFS_VERSION) return null;
	return {
		locale: isLocale(o.locale) ? o.locale : DEFAULT_PREFS.locale,
		theme: isTheme(o.theme) ? o.theme : DEFAULT_PREFS.theme,
		volume: isVolume(o.volume) ? o.volume : DEFAULT_PREFS.volume,
		vibrate: typeof o.vibrate === 'boolean' ? o.vibrate : DEFAULT_PREFS.vibrate,
		confirmEnd: typeof o.confirmEnd === 'boolean' ? o.confirmEnd : DEFAULT_PREFS.confirmEnd
	};
}

function isLocale(v: unknown): v is Locale {
	return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

function isTheme(v: unknown): v is ThemeChoice {
	return typeof v === 'string' && (THEME_CHOICES as readonly string[]).includes(v);
}

function isVolume(v: unknown): v is number {
	return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}
