import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageKV, MemoryKV } from './storage.ts';

describe('MemoryKV', () => {
	it('書いた値を読め、未保存は null', () => {
		const kv = new MemoryKV();
		expect(kv.read('a')).toBeNull();
		kv.write('a', '1');
		expect(kv.read('a')).toBe('1');
		kv.write('a', '2');
		expect(kv.read('a')).toBe('2');
	});
});

describe('LocalStorageKV', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('localStorage に読み書きする', () => {
		const m = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => m.get(k) ?? null,
			setItem: (k: string, v: string) => void m.set(k, v)
		});
		const kv = new LocalStorageKV();
		kv.write('k', 'v');
		expect(m.get('k')).toBe('v');
		expect(kv.read('k')).toBe('v');
		expect(kv.read('none')).toBeNull();
	});

	it('例外を投げる環境でも、読みは null、書きは何もせず止まらない', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('denied');
			},
			setItem: () => {
				throw new Error('quota');
			}
		});
		const kv = new LocalStorageKV();
		expect(kv.read('k')).toBeNull();
		expect(() => kv.write('k', 'v')).not.toThrow();
	});

	it('localStorage の参照自体が使えなくても止まらない', () => {
		vi.stubGlobal('localStorage', undefined);
		const kv = new LocalStorageKV();
		expect(kv.read('k')).toBeNull();
		expect(() => kv.write('k', 'v')).not.toThrow();
	});
});
