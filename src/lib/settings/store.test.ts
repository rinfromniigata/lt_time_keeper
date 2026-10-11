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
