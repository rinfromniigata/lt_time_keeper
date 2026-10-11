import type { Ringer, Strikes } from './ringer.ts';

/** 音と振動など、複数の Ringer を同時に呼ぶ。振動を使わないときは音の Ringer だけを渡す */
export class CompositeRinger implements Ringer {
	#ringers: Ringer[];

	constructor(ringers: Ringer[]) {
		this.#ringers = ringers;
	}

	get blocked(): boolean {
		return this.#ringers.some((r) => r.blocked);
	}

	async unlock(): Promise<void> {
		await Promise.all(this.#ringers.map((r) => r.unlock()));
	}

	ring(strikes: Strikes): void {
		for (const r of this.#ringers) r.ring(strikes);
	}

	setVolume(volume: number): void {
		for (const r of this.#ringers) r.setVolume(volume);
	}
}
