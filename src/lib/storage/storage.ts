/** キーと文字列の読み書き。保存先が使えなくても例外を出さない */
export interface KeyValueStorage {
	/** 使えないとき・例外のときは null */
	read(key: string): string | null;
	/** 使えないとき・例外のときは何もしない */
	write(key: string, value: string): void;
}

/** `localStorage` の実装。プライベートモード・容量超過・無効化で例外が出ても握りつぶす */
export class LocalStorageKV implements KeyValueStorage {
	read(key: string): string | null {
		try {
			return globalThis.localStorage.getItem(key);
		} catch {
			return null;
		}
	}

	write(key: string, value: string): void {
		try {
			globalThis.localStorage.setItem(key, value);
		} catch {
			// 保存できなくても、そのセッションは動かす
		}
	}
}

/** テスト用のメモリ上の実装 */
export class MemoryKV implements KeyValueStorage {
	readonly #map = new Map<string, string>();

	read(key: string): string | null {
		return this.#map.get(key) ?? null;
	}

	write(key: string, value: string): void {
		this.#map.set(key, value);
	}
}
