import { MAX_INPUT_MS } from '../core/time.ts';
import { NoopRepository, type SettingsRepository } from './repository.ts';
import { DEFAULT_SETTINGS, canStart, validate, type Settings, type SettingsIssues } from './settings.ts';

export class SettingsStore {
	#repository: SettingsRepository;
	#state = $state<Settings>(structuredClone(DEFAULT_SETTINGS));

	constructor(repository: SettingsRepository = new NoopRepository()) {
		this.#repository = repository;
		this.#state = structuredClone(repository.load() ?? DEFAULT_SETTINGS);
	}

	get durationMs(): number {
		return this.#state.durationMs;
	}
	get title(): string {
		return this.#state.title;
	}
	get volume(): number {
		return this.#state.volume;
	}
	get vibrate(): boolean {
		return this.#state.vibrate;
	}
	get bells(): Settings['bells'] {
		return this.#state.bells;
	}
	get issues(): SettingsIssues {
		return validate(this.#state);
	}
	get canStart(): boolean {
		return canStart(this.#state);
	}

	/** セッションが開始時点の値を使えるよう、状態から切り離した複製を返す */
	snapshot(): Settings {
		return $state.snapshot(this.#state);
	}

	setDuration(ms: number): void {
		this.#state.durationMs = Math.min(MAX_INPUT_MS, Math.max(0, Math.round(ms)));
		this.#persist();
	}
	setTitle(title: string): void {
		this.#state.title = title;
		this.#persist();
	}
	setVolume(volume: number): void {
		this.#state.volume = Math.min(1, Math.max(0, volume));
		this.#persist();
	}
	setVibrate(vibrate: boolean): void {
		this.#state.vibrate = vibrate;
		this.#persist();
	}

	#persist(): void {
		this.#repository.save(this.snapshot());
	}
}
