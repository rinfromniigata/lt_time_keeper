import type { Settings } from './settings.ts';

export interface SettingsRepository {
	load(): Settings | null;
	save(s: Settings): void;
}

/** 保存しない実装。load は常に null、save は何もしない */
export class NoopRepository implements SettingsRepository {
	load(): Settings | null {
		return null;
	}
	save(): void {}
}
