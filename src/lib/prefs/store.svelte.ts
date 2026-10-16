import type { Locale } from '../i18n/messages.ts';
import type { KeyValueStorage } from '../storage/storage.ts';
import { PREFS_KEY, decodePrefs, encodePrefs } from '../storage/prefs_codec.ts';
import { DEFAULT_PREFS, type Prefs, type ThemeChoice } from './prefs.ts';

/** 環境設定。作るときに読み込み（保存はしない）、変えるたびにすぐ保存する */
export class PrefsStore {
	#storage: KeyValueStorage;
	#state = $state<Prefs>({ ...DEFAULT_PREFS });

	constructor(storage: KeyValueStorage) {
		this.#storage = storage;
		this.#state = { ...(decodePrefs(storage.read(PREFS_KEY)) ?? DEFAULT_PREFS) };
	}

	get locale(): Locale | null {
		return this.#state.locale;
	}
	get theme(): ThemeChoice {
		return this.#state.theme;
	}
	get volume(): number {
		return this.#state.volume;
	}
	get vibrate(): boolean {
		return this.#state.vibrate;
	}
	get confirmEnd(): boolean {
		return this.#state.confirmEnd;
	}

	setLocale(locale: Locale): void {
		this.#state.locale = locale;
		this.#persist();
	}
	setTheme(theme: ThemeChoice): void {
		this.#state.theme = theme;
		this.#persist();
	}
	/** 0..1 に収める */
	setVolume(volume: number): void {
		this.#state.volume = Math.min(1, Math.max(0, volume));
		this.#persist();
	}
	setVibrate(vibrate: boolean): void {
		this.#state.vibrate = vibrate;
		this.#persist();
	}
	setConfirmEnd(confirmEnd: boolean): void {
		this.#state.confirmEnd = confirmEnd;
		this.#persist();
	}

	#persist(): void {
		this.#storage.write(PREFS_KEY, encodePrefs($state.snapshot(this.#state)));
	}
}
