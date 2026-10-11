import { dueStrikes, nextBell, nextBellLabel, warnAtElapsed, type Bell } from '../core/bells.ts';
import { formatClock, formatOver, formatRemaining, SECOND, type Now } from '../core/time.ts';
import { Timer, type TimerSnapshot } from '../core/timer.ts';
import type { Ringer } from '../output/ringer.ts';
import type { Settings } from '../settings/settings.ts';
import type { DisplayState } from '../ui/parts/state.ts';

/** アニメーションフレームの呼び出し。テストでは差し替える */
export interface FrameDriver {
	request(callback: () => void): number;
	cancel(handle: number): void;
}

const browserFrames: FrameDriver = {
	request: (callback) => requestAnimationFrame(callback),
	cancel: (handle) => cancelAnimationFrame(handle)
};

/** 画面が見えているか。ベルは見えているあいだだけ鳴らすため、テストでは差し替える */
export interface VisibilityDriver {
	visible(): boolean;
	/** 見え方が変わったときに呼ぶ。戻り値で購読を解く */
	subscribe(callback: () => void): () => void;
}

const browserVisibility: VisibilityDriver = {
	visible: () => document.visibilityState === 'visible',
	subscribe: (callback) => {
		document.addEventListener('visibilitychange', callback);
		return () => document.removeEventListener('visibilitychange', callback);
	}
};

/** 音を出せる状態になるのを待つ上限（計測の経過）。これを過ぎたら待たずにベルの判定を始める */
const UNLOCK_WAIT_MS = SECOND;

export interface SessionDeps {
	now: Now;
	ringer: Ringer;
	visibility?: VisibilityDriver;
	/** 利用者が終了を確定したとき（後片付けのあと）に呼ぶ。S01 に戻す処理を渡す */
	onfinish?: () => void;
	frames?: FrameDriver;
}

/** キーイベントのうち、セッションが使う部分。DOM の KeyboardEvent がそのまま渡せる */
export interface KeyInput {
	key: string;
	repeat: boolean;
	ctrlKey: boolean;
	altKey: boolean;
	metaKey: boolean;
	target: EventTarget | null;
	preventDefault(): void;
}

export interface SessionDisplay {
	digits: string; // 残り（切り上げ）または超過「+m:ss」
	state: DisplayState; // 一時停止を優先した、画面に出す状態
	sub: string | null; // 「経過 1:48 ／ 5:00」。通常のときだけ。それ以外は状態ラベルを出すので null
	next: { label: string; in: string } | null; // 「1鈴まで」「0:42」。残りのベルがなければ null
}

const INTERACTIVE_TAGS = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT']);

function isInteractive(target: EventTarget | null): boolean {
	const tag = (target as { tagName?: string } | null)?.tagName;
	return tag !== undefined && INTERACTIVE_TAGS.has(tag);
}

/** 計測セッション。開始で作り、終了で捨てる。画面は値を描画し、操作を渡すだけにする */
export class Session {
	#durationMs: number;
	#bells: Bell[];
	#ringer: Ringer;
	#visibility: VisibilityDriver;
	#unsubscribe: (() => void) | null = null;
	#timer: Timer;
	#frames: FrameDriver;
	#onfinish: (() => void) | undefined;
	#handle: number | null = null;
	#started = false;
	#finished = false;
	// ベルの判定。前回の判定で使った経過を持ち、(前回, 今回] を重ねずに進めて二度鳴らさない。
	// 最初の判定は -1 から行い、開始と同時のベルも拾う
	#prevElapsedMs = -1;
	#armed = false; // 音を出せる状態を待ったあと、判定を始めてよいか
	#resync = false; // 画面が見えなかった。戻ったとき、そのあいだのベルは鳴らさずに追いつく

	snapshot = $state.raw<TimerSnapshot>({
		elapsedMs: 0,
		remainingMs: 0,
		overMs: 0,
		phase: 'ok',
		paused: false,
		progress: 1
	});
	confirming = $state(false);

	readonly display: SessionDisplay = $derived.by(() => {
		const s = this.snapshot;
		const state: DisplayState = s.paused ? 'paused' : s.phase;
		return {
			digits: s.phase === 'over' ? formatOver(s.overMs) : formatRemaining(s.remainingMs),
			state,
			sub:
				state === 'ok'
					? `経過 ${formatClock(s.elapsedMs)} ／ ${formatClock(this.#durationMs)}`
					: null,
			next: this.#nextDisplay(s.elapsedMs)
		};
	});

	constructor(settings: Settings, deps: SessionDeps) {
		this.#durationMs = settings.durationMs;
		this.#bells = settings.bells.map((b) => ({ ...b }));
		this.#ringer = deps.ringer;
		this.#ringer.setVolume(settings.volume);
		this.#visibility = deps.visibility ?? browserVisibility;
		this.#timer = new Timer(
			{
				durationMs: settings.durationMs,
				warnAtElapsedMs: warnAtElapsed(this.#bells, settings.durationMs)
			},
			deps.now
		);
		this.#frames = deps.frames ?? browserFrames;
		this.#onfinish = deps.onfinish;
		this.snapshot = this.#timer.snapshot();
	}

	get durationMs(): number {
		return this.#durationMs;
	}

	/**
	 * 開始ボタンの処理の中で呼ぶ（unlock は利用者の操作の中でないと効かない）。開始済み・終了後は何もしない。
	 * 計測は音の準備を待たずにすぐ始める
	 */
	async start(): Promise<void> {
		if (this.#started || this.#finished) return;
		this.#started = true;
		const unlocking = this.#ringer.unlock();
		this.#unsubscribe = this.#visibility.subscribe(() => {
			if (!this.#visibility.visible()) this.#resync = true;
		});
		this.#timer.start();
		this.#tick();
		try {
			await unlocking;
		} catch {
			// 音を出せない場合の知らせは T4-2
		}
		this.#armed = true;
	}

	togglePause(): void {
		if (!this.#running) return;
		if (this.snapshot.paused) this.#timer.resume();
		else this.#timer.pause();
		this.snapshot = this.#timer.snapshot();
	}

	/** 確認を出す。計測は止めない */
	requestFinish(): void {
		if (this.#running) this.confirming = true;
	}

	cancelFinish(): void {
		this.confirming = false;
	}

	/** 確認で「終了する」を選んだとき。後片付けをして、呼び出し側に知らせる */
	confirmFinish(): void {
		if (!this.#running || !this.confirming) return;
		this.finish();
		this.#onfinish?.();
	}

	/** 後片付け（ループ停止）。ページ側が画面を離れるときにも呼べる */
	finish(): void {
		this.#finished = true;
		this.confirming = false;
		this.#unsubscribe?.();
		this.#unsubscribe = null;
		if (this.#handle !== null) this.#frames.cancel(this.#handle);
		this.#handle = null;
	}

	/** キー操作。Space：一時停止・再開、Esc：確認を出す／閉じる、確認中の Enter：終了する */
	handleKey(e: KeyInput): void {
		if (e.ctrlKey || e.altKey || e.metaKey || !this.#running) return;
		switch (e.key) {
			case ' ':
				// ボタンにフォーカスがあれば、ボタン自身の操作（Space で押す）に任せる。確認中も同じ
				if (this.confirming || e.repeat || isInteractive(e.target)) return;
				e.preventDefault();
				this.togglePause();
				return;
			case 'Escape':
				e.preventDefault();
				if (e.repeat) return;
				if (this.confirming) this.cancelFinish();
				else this.requestFinish();
				return;
			case 'Enter':
				// フォーカス中の「続ける」を Enter で押したことにならないよう、確認中は止める
				if (!this.confirming) return;
				e.preventDefault();
				if (!e.repeat) this.confirmFinish();
				return;
		}
	}

	get #running(): boolean {
		return this.#started && !this.#finished;
	}

	#tick = (): void => {
		const s = this.#timer.snapshot();
		this.snapshot = s;
		this.#ringDue(s.elapsedMs);
		this.#handle = this.#frames.request(this.#tick);
	};

	#ringDue(elapsedMs: number): void {
		if (!this.#armed && elapsedMs >= UNLOCK_WAIT_MS) this.#armed = true;
		if (!this.#armed) return;
		if (this.#resync || !this.#visibility.visible()) {
			// 見えなかったあいだに過ぎたベルは、戻ってきてもあとから鳴らさない
			this.#resync = false;
			this.#prevElapsedMs = elapsedMs;
			return;
		}
		const due = dueStrikes(this.#bells, this.#durationMs, this.#prevElapsedMs, elapsedMs);
		this.#prevElapsedMs = elapsedMs;
		// 1回の判定に複数の時点が入るのは、描画が長く止まったとき。重ねて鳴らさず、最後の1つだけ鳴らす
		const strikes = due.at(-1);
		if (strikes !== undefined) this.#ringer.ring(strikes);
	}

	#nextDisplay(elapsedMs: number): SessionDisplay['next'] {
		const next = nextBell(this.#bells, this.#durationMs, elapsedMs);
		if (next === null) return null;
		// 残り時間と同じ切り上げで出す（大きな数字と秒が切り替わるタイミングをそろえる）
		return { label: nextBellLabel(next.index, this.#bells.length), in: formatRemaining(next.inMs) };
	}
}

