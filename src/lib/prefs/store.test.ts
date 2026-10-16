import { describe, expect, it, vi } from 'vitest';
import { PREFS_KEY } from '../storage/prefs_codec.ts';
import { LocalStorageKV, MemoryKV, type KeyValueStorage } from '../storage/storage.ts';
import { applyTheme } from '../theme/theme.ts';
import { DEFAULT_PREFS } from './prefs.ts';
import { PrefsStore } from './store.svelte.ts';

const saved = (kv: KeyValueStorage) => JSON.parse(kv.read(PREFS_KEY)!);

describe('PrefsStore の読み込み', () => {
	it('何も保存されていなければ初期値で、読み込みだけでは保存しない', () => {
		const kv = new MemoryKV();
		const p = new PrefsStore(kv);
		expect([p.locale, p.theme, p.volume, p.vibrate, p.confirmEnd]).toEqual([
			DEFAULT_PREFS.locale,
			DEFAULT_PREFS.theme,
			DEFAULT_PREFS.volume,
			DEFAULT_PREFS.vibrate,
			DEFAULT_PREFS.confirmEnd
		]);
		expect(kv.read(PREFS_KEY)).toBeNull();
	});

	it('保存された値を読み込む', () => {
		const kv = new MemoryKV();
		kv.write(PREFS_KEY, '{"v":1,"locale":"en","theme":"dark","volume":0.2,"vibrate":false,"confirmEnd":false}');
		const p = new PrefsStore(kv);
		expect([p.locale, p.theme, p.volume, p.vibrate, p.confirmEnd]).toEqual(['en', 'dark', 0.2, false, false]);
	});

	it('壊れた値・版の違う値は初期値、項目ごとの不正はその項目だけ初期値', () => {
		const a = new MemoryKV();
		a.write(PREFS_KEY, '{broken');
		expect(new PrefsStore(a).theme).toBe('system');
		const b = new MemoryKV();
		b.write(PREFS_KEY, '{"v":1,"theme":"blue","volume":2,"vibrate":"yes","locale":"ja"}');
		const p = new PrefsStore(b);
		expect([p.locale, p.theme, p.volume, p.vibrate]).toEqual(['ja', 'system', 0.7, true]);
	});
});

describe('PrefsStore の保存', () => {
	it('値を変えるたびに保存し、ほかの項目は保たれる', () => {
		const kv = new MemoryKV();
		const p = new PrefsStore(kv);
		p.setLocale('ja');
		expect(saved(kv)).toEqual({ v: 1, locale: 'ja', theme: 'system', volume: 0.7, vibrate: true, confirmEnd: true });
		p.setTheme('dark');
		expect(saved(kv).theme).toBe('dark');
		p.setVolume(0.5);
		expect(saved(kv).volume).toBe(0.5);
		p.setVibrate(false);
		expect(saved(kv).vibrate).toBe(false);
		p.setConfirmEnd(false);
		expect(saved(kv)).toEqual({ v: 1, locale: 'ja', theme: 'dark', volume: 0.5, vibrate: false, confirmEnd: false });
	});

	it('音量は動かすたびに書き、0..1 に収める', () => {
		const kv = new MemoryKV();
		const writes: string[] = [];
		const spy: KeyValueStorage = { read: (k) => kv.read(k), write: (k, v) => (writes.push(v), kv.write(k, v)) };
		const p = new PrefsStore(spy);
		p.setVolume(0.1);
		p.setVolume(0.2);
		p.setVolume(3);
		p.setVolume(-1);
		expect(writes).toHaveLength(4);
		expect(p.volume).toBe(0);
		p.setVolume(3);
		expect(p.volume).toBe(1);
	});

	it('開き直すと保存した値が戻る', () => {
		const kv = new MemoryKV();
		const p = new PrefsStore(kv);
		p.setLocale('zh-Hans');
		p.setTheme('light');
		const q = new PrefsStore(kv);
		expect([q.locale, q.theme]).toEqual(['zh-Hans', 'light']);
	});

	it('localStorage が例外を投げても止まらず、メモリ上の値は変わる', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('denied');
			},
			setItem: () => {
				throw new Error('quota');
			}
		});
		try {
			const p = new PrefsStore(new LocalStorageKV());
			expect(p.theme).toBe('system');
			expect(() => p.setTheme('dark')).not.toThrow();
			expect(p.theme).toBe('dark');
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe('applyTheme', () => {
	it('light・dark では data-theme を付け、system では外す', () => {
		const attrs = new Map<string, string>();
		const root = {
			setAttribute: (k: string, v: string) => void attrs.set(k, v),
			removeAttribute: (k: string) => void attrs.delete(k)
		} as unknown as HTMLElement;
		applyTheme('dark', root);
		expect(attrs.get('data-theme')).toBe('dark');
		applyTheme('light', root);
		expect(attrs.get('data-theme')).toBe('light');
		applyTheme('system', root);
		expect(attrs.has('data-theme')).toBe(false);
	});
});
