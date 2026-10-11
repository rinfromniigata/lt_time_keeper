import { describe, expect, it } from 'vitest';
import { MAX_INPUT_MS } from '../core/time.ts';
import { NoopRepository, type SettingsRepository } from './repository.ts';
import { DEFAULT_SETTINGS, canStart, validate, type Settings } from './settings.ts';
import { SettingsStore } from './store.svelte.ts';

describe('DEFAULT_SETTINGS', () => {
	it('仕様の初期値', () => {
		expect(DEFAULT_SETTINGS.durationMs).toBe(300000);
		expect(DEFAULT_SETTINGS.bells.map((b) => [b.base, b.offsetMs, b.strikes])).toEqual([
			['remaining', 60000, 1],
			['remaining', 0, 2],
			['over', 60000, 3]
		]);
		expect(new Set(DEFAULT_SETTINGS.bells.map((b) => b.id)).size).toBe(3);
		expect(DEFAULT_SETTINGS.title).toBe('');
		expect(DEFAULT_SETTINGS.volume).toBe(0.7);
		expect(DEFAULT_SETTINGS.vibrate).toBe(true);
	});
});

describe('validate / canStart', () => {
	it('持ち時間0は開始できない', () => {
		const s: Settings = { ...DEFAULT_SETTINGS, durationMs: 0 };
		expect(validate(s).durationZero).toBe(true);
		expect(canStart(s)).toBe(false);
	});
	it('初期値は開始できる', () => {
		expect(validate(DEFAULT_SETTINGS).durationZero).toBe(false);
		expect(canStart(DEFAULT_SETTINGS)).toBe(true);
	});
});

describe('鳴らないベルの検証', () => {
	it('残りが持ち時間より長いベルだけが silentBellIds に入る。開始は止めない', () => {
		const s: Settings = {
			...structuredClone(DEFAULT_SETTINGS),
			bells: [
				{ id: 'a', base: 'remaining', offsetMs: 300001, strikes: 1 },
				{ id: 'b', base: 'remaining', offsetMs: 300000, strikes: 1 },
				{ id: 'c', base: 'over', offsetMs: MAX_INPUT_MS, strikes: 1 }
			]
		};
		expect(validate(s).silentBellIds).toEqual(['a']);
		expect(canStart(s)).toBe(true);
	});
	it('初期値には鳴らないベルがなく、持ち時間を縮めると現れる', () => {
		const store = new SettingsStore();
		expect(store.issues.silentBellIds).toEqual([]);
		store.setDuration(30000);
		expect(store.issues.silentBellIds).toEqual(['default-1']);
	});
});

describe('SettingsStore のベル操作', () => {
	it('追加で新しい id が付き、既存の id と重ならない', () => {
		const store = new SettingsStore();
		const a = store.addBell({ base: 'remaining', offsetMs: 300000, strikes: 1 });
		const b = store.addBell({ base: 'over', offsetMs: 0, strikes: 2 });
		expect(store.bells).toHaveLength(5);
		expect(new Set(store.bells.map((x) => x.id)).size).toBe(5);
		expect(a).not.toBe(b);
	});
	it('変更しても id は変わらず、時刻は範囲に収める', () => {
		const store = new SettingsStore();
		store.updateBell('default-1', { offsetMs: 120000, strikes: 3 });
		expect(store.bells[0]).toEqual({ id: 'default-1', base: 'remaining', offsetMs: 120000, strikes: 3 });
		store.updateBell('default-1', { offsetMs: MAX_INPUT_MS + 1000 });
		expect(store.bells[0].offsetMs).toBe(MAX_INPUT_MS);
		store.updateBell('default-1', { offsetMs: -1 });
		expect(store.bells[0].offsetMs).toBe(0);
	});
	it('削除でそのベルだけがなくなり、全部消しても 0 件になる', () => {
		const store = new SettingsStore();
		store.removeBell('default-2');
		expect(store.bells.map((b) => b.id)).toEqual(['default-1', 'default-3']);
		store.removeBell('default-1');
		store.removeBell('default-3');
		expect(store.bells).toEqual([]);
		expect(store.canStart).toBe(true);
	});
	it('存在しない id の変更・削除は何もせず、save も呼ばない', () => {
		const saved: Settings[] = [];
		const store = new SettingsStore({ load: () => null, save: (s) => void saved.push(s) });
		store.updateBell('nothing', { strikes: 2 });
		store.removeBell('nothing');
		expect(saved).toEqual([]);
		expect(store.bells).toHaveLength(3);
	});
	it('追加・変更・削除のたびに save を呼ぶ', () => {
		const saved: Settings[] = [];
		const store = new SettingsStore({ load: () => null, save: (s) => void saved.push(s) });
		const id = store.addBell({ base: 'remaining', offsetMs: 0, strikes: 1 });
		store.updateBell(id, { strikes: 2 });
		store.removeBell(id);
		expect(saved.map((s) => s.bells.length)).toEqual([4, 4, 3]);
	});
	it('DEFAULT_SETTINGS のベルを書き換えない', () => {
		const store = new SettingsStore();
		store.updateBell('default-1', { offsetMs: 1 });
		store.removeBell('default-2');
		expect(DEFAULT_SETTINGS.bells).toHaveLength(3);
		expect(DEFAULT_SETTINGS.bells[0].offsetMs).toBe(60000);
	});
	it('読み込んだ設定に bell-1 があっても id が重ならない', () => {
		const loaded: Settings = {
			...structuredClone(DEFAULT_SETTINGS),
			bells: [{ id: 'bell-1', base: 'remaining', offsetMs: 0, strikes: 1 }]
		};
		const store = new SettingsStore({ load: () => loaded, save: () => {} });
		const id = store.addBell({ base: 'over', offsetMs: 0, strikes: 1 });
		expect(id).not.toBe('bell-1');
	});
});

describe('NoopRepository', () => {
	it('load は null、save は何も起こさない', () => {
		const r = new NoopRepository();
		r.save();
		expect(r.load()).toBeNull();
	});
});

describe('SettingsStore', () => {
	it('初期値で始まり、DEFAULT_SETTINGS を書き換えない', () => {
		const store = new SettingsStore();
		expect(store.durationMs).toBe(300000);
		store.setDuration(600000);
		store.setTitle('LT');
		expect(DEFAULT_SETTINGS.durationMs).toBe(300000);
		expect(DEFAULT_SETTINGS.title).toBe('');
		expect(new SettingsStore().durationMs).toBe(300000);
	});
	it('値を変更でき、範囲に収める', () => {
		const store = new SettingsStore();
		store.setDuration(MAX_INPUT_MS + 1000);
		expect(store.durationMs).toBe(MAX_INPUT_MS);
		store.setDuration(-5);
		expect(store.durationMs).toBe(0);
		expect(store.canStart).toBe(false);
		expect(store.issues.durationZero).toBe(true);
		store.setVolume(2);
		expect(store.volume).toBe(1);
		store.setVolume(-1);
		expect(store.volume).toBe(0);
		store.setVibrate(false);
		expect(store.vibrate).toBe(false);
	});
	it('変更のたびに save を呼び、複製を渡す', () => {
		const saved: Settings[] = [];
		const repo: SettingsRepository = { load: () => null, save: (s) => void saved.push(s) };
		const store = new SettingsStore(repo);
		store.setTitle('A');
		store.setTitle('B');
		expect(saved.map((s) => s.title)).toEqual(['A', 'B']);
	});
	it('load の結果があればそれで初期化する', () => {
		const loaded: Settings = { ...structuredClone(DEFAULT_SETTINGS), title: '保存済み' };
		const store = new SettingsStore({ load: () => loaded, save: () => {} });
		expect(store.title).toBe('保存済み');
	});
	it('snapshot は状態から切り離されている', () => {
		const store = new SettingsStore();
		const snap = store.snapshot();
		store.setDuration(1000);
		expect(snap.durationMs).toBe(300000);
	});
});
