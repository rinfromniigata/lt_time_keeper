import type { Bell } from '../core/bells.ts';
import { MAX_INPUT_MS } from '../core/time.ts';
import { NoopRepository, type SettingsRepository } from './repository.ts';
import { DEFAULT_SETTINGS, canStart, validate, type Settings, type SettingsIssues } from './settings.ts';

function clampOffset(ms: number): number {
	return Math.min(MAX_INPUT_MS, Math.max(0, Math.round(ms)));
}

export class SettingsStore {
	#repository: SettingsRepository;
	#bellSeq = 0;
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

	/** ベルを足し、採番した id を返す。時刻は 0..99:59 に収める */
	addBell(bell: Omit<Bell, 'id'>): string {
		const id = this.#newBellId();
		this.#state.bells.push({ ...bell, id, offsetMs: clampOffset(bell.offsetMs) });
		this.#persist();
		return id;
	}
	/** id は変えずに中身を変える。該当するベルがなければ何もしない */
	updateBell(id: string, patch: Partial<Omit<Bell, 'id'>>): void {
		const bell = this.#state.bells.find((b) => b.id === id);
		if (!bell) return;
		Object.assign(bell, patch);
		bell.offsetMs = clampOffset(bell.offsetMs);
		this.#persist();
	}
	/** 該当するベルがなければ何もしない */
	removeBell(id: string): void {
		const index = this.#state.bells.findIndex((b) => b.id === id);
		if (index < 0) return;
		this.#state.bells.splice(index, 1);
		this.#persist();
	}

	#newBellId(): string {
		let id: string;
		do {
			id = `bell-${++this.#bellSeq}`;
		} while (this.#state.bells.some((b) => b.id === id));
		return id;
	}

	#persist(): void {
		this.#repository.save(this.snapshot());
	}
}
