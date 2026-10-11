import { formatClock, formatOver, formatRemaining, type Now } from '../core/time.ts';
import { Timer, type TimerSnapshot } from '../core/timer.ts';
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

export interface SessionDeps {
	now: Now;
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
}

const INTERACTIVE_TAGS = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT']);

function isInteractive(target: EventTarget | null): boolean {
	const tag = (target as { tagName?: string } | null)?.tagName;
	return tag !== undefined && INTERACTIVE_TAGS.has(tag);
}

/** 計測セッション。開始で作り、終了で捨てる。画面は値を描画し、操作を渡すだけにする */
export class Session {
	#durationMs: number;
	#timer: Timer;
	#frames: FrameDriver;
	#onfinish: (() => void) | undefined;
	#handle: number | null = null;
	#started = false;
	#finished = false;

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
					: null
		};
	});

	constructor(settings: Settings, deps: SessionDeps) {
		this.#durationMs = settings.durationMs;
		// 予鈴の段階は、ベルの判定（T3-1）ができてから渡す
		this.#timer = new Timer({ durationMs: settings.durationMs, warnAtElapsedMs: null }, deps.now);
		this.#frames = deps.frames ?? browserFrames;
		this.#onfinish = deps.onfinish;
		this.snapshot = this.#timer.snapshot();
	}

	/** 開始ボタンの処理の中で呼ぶ。開始済み・終了後は何もしない */
	async start(): Promise<void> {
		if (this.#started || this.#finished) return;
		this.#started = true;
		this.#timer.start();
		this.#tick();
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
		this.snapshot = this.#timer.snapshot();
		this.#handle = this.#frames.request(this.#tick);
	};
}

