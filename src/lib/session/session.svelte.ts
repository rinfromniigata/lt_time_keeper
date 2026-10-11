import { dueStrikes, nextBell, nextBellLabel, warnAtElapsed, type Bell } from '../core/bells.ts';
import { formatClock, formatOver, formatRemaining, SECOND, type Now } from '../core/time.ts';
import { Timer, type TimerSnapshot } from '../core/timer.ts';
import type { WakeLockControl } from '../device/wake_lock.ts';
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

/** 操作ボタンを隠すまでの待ち時間の計測。テストでは差し替える */
export interface TimeoutDriver {
	set(callback: () => void, ms: number): unknown;
	clear(handle: unknown): void;
}

const browserTimeouts: TimeoutDriver = {
	set: (callback, ms) => setTimeout(callback, ms),
	clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
};

/** CSS の時間（`5s`・`500ms`）をミリ秒にする。読めなければ null */
export function parseCssDuration(text: string): number | null {
	const m = /^\s*(\d+(?:\.\d+)?|\.\d+)(ms|s)\s*$/.exec(text);
	if (!m) return null;
	return Math.round(Number(m[1]) * (m[2] === 's' ? 1000 : 1));
}

/** 隠すまでの時間はトークン `--controls-hide-delay` から読む（値を直書きしない） */
function readControlsHideDelayMs(): number {
	const raw = getComputedStyle(document.documentElement).getPropertyValue('--controls-hide-delay');
	return parseCssDuration(raw) ?? Number.POSITIVE_INFINITY; // 読めなければ隠さない
}

export type Warning = 'audio' | 'wakeLock';

/** 音を出せる状態になるのを待つ上限（計測の経過）。これを過ぎたら待たずにベルの判定を始める */
const UNLOCK_WAIT_MS = SECOND;

export interface SessionDeps {
	now: Now;
	ringer: Ringer;
	wakeLock: WakeLockControl;
	visibility?: VisibilityDriver;
	/** 利用者が終了を確定したとき（後片付けのあと）に呼ぶ。S01 に戻す処理を渡す */
	onfinish?: () => void;
	frames?: FrameDriver;
	timeouts?: TimeoutDriver;
	/** 操作ボタンを隠すまでの時間（ミリ秒）。開始時に1回読む */
	controlsHideDelayMs?: () => number;
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
	#wakeLock: WakeLockControl;
	#timeouts: TimeoutDriver;
	#readHideDelay: () => number;
	#hideDelayMs = Number.POSITIVE_INFINITY;
	#hideHandle: unknown = null;
	#dismissed = new Set<Warning>(); // 閉じた警告は、同じ計測のあいだ出し直さない
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
	warnings = $state<Warning[]>([]);
	/** 操作ボタン（とカーソル）を隠している状態 */
	controlsHidden = $state(false);

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
		this.#wakeLock = deps.wakeLock;
		this.#timeouts = deps.timeouts ?? browserTimeouts;
		this.#readHideDelay = deps.controlsHideDelayMs ?? readControlsHideDelayMs;
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
			else void this.#acquireWakeLock(); // 見えなくなると解除されるので、戻ったら取り直す
		});
		this.#hideDelayMs = this.#readHideDelay();
		this.#timer.start();
		this.#tick();
		this.#scheduleHide();
		const acquiring = this.#acquireWakeLock();
		try {
			await unlocking;
		} catch {
			// 失敗は blocked として警告にする
		}
		this.#armed = true;
		this.#syncAudioWarning();
		await acquiring;
	}

	togglePause(): void {
		if (!this.#running) return;
		if (this.snapshot.paused) this.#timer.resume();
		else this.#timer.pause();
		this.snapshot = this.#timer.snapshot();
		this.#scheduleHide();
	}

	/** 確認を出す。計測は止めない */
	requestFinish(): void {
		if (!this.#running) return;
		this.confirming = true;
		this.#scheduleHide();
	}

	cancelFinish(): void {
		this.confirming = false;
		this.#scheduleHide();
	}

	/** 警告を閉じる。同じ計測のあいだは出し直さない */
	dismissWarning(w: Warning): void {
		this.#dismissed.add(w);
		this.warnings = this.warnings.filter((x) => x !== w);
	}

	/** マウス移動・キー・タップ。操作ボタンを出し、隠すまでの時間を数え直す */
	poke(): void {
		if (this.#running) this.#scheduleHide();
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
		this.#clearHide();
		this.controlsHidden = false;
		void this.#wakeLock.release();
	}

	/** キー操作。Space：一時停止・再開、Esc：確認を出す／閉じる、確認中の Enter：終了する */
	handleKey(e: KeyInput): void {
		if (e.ctrlKey || e.altKey || e.metaKey || !this.#running) return;
		this.#scheduleHide(); // どのキーでも操作ボタンを出す
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

	#syncAudioWarning(): void {
		if (this.#ringer.blocked) {
			if (!this.#dismissed.has('audio') && !this.warnings.includes('audio')) {
				this.warnings = [...this.warnings, 'audio'];
			}
		} else {
			this.warnings = this.warnings.filter((x) => x !== 'audio');
		}
	}

	async #acquireWakeLock(): Promise<void> {
		if (!this.#running) return;
		const ok = await this.#wakeLock.acquire();
		if (this.#finished) {
			// 取れたときには終了していた。取ったままにしない
			void this.#wakeLock.release();
			return;
		}
		if (ok) {
			this.warnings = this.warnings.filter((x) => x !== 'wakeLock');
		} else if (!this.#dismissed.has('wakeLock') && !this.warnings.includes('wakeLock')) {
			this.warnings = [...this.warnings, 'wakeLock'];
		}
	}

	#clearHide(): void {
		if (this.#hideHandle !== null) this.#timeouts.clear(this.#hideHandle);
		this.#hideHandle = null;
	}

	/** 操作ボタンを出し、隠すまでを数え直す。一時停止中と確認中は隠さない */
	#scheduleHide(): void {
		this.#clearHide();
		this.controlsHidden = false;
		if (this.snapshot.paused || this.confirming || !Number.isFinite(this.#hideDelayMs)) return;
		this.#hideHandle = this.#timeouts.set(() => {
			this.#hideHandle = null;
			if (this.#running && !this.snapshot.paused && !this.confirming) this.controlsHidden = true;
		}, this.#hideDelayMs);
	}

	#ringDue(elapsedMs: number): void {
		if (!this.#armed && elapsedMs >= UNLOCK_WAIT_MS) {
			this.#armed = true;
			this.#syncAudioWarning(); // 1秒たっても準備が終わらない場合に、出せない状態を知らせる
		}
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

