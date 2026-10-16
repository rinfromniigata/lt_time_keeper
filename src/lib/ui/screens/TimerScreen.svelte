<script lang="ts">
	import { formatClock } from '../../core/time.ts';
	import { msg, type MessageKey } from '#lib/i18n/messages.ts';
	import type { FullscreenControl } from '../../device/fullscreen.ts';
	import type { Session, Warning } from '../../session/session.svelte.ts';
	import Banner from '../parts/Banner.svelte';
	import Button from '../parts/Button.svelte';
	import ConfirmDialog from '../parts/ConfirmDialog.svelte';
	import Icon from '../parts/Icon.svelte';
	import Kbd from '../parts/Kbd.svelte';
	import { i18n } from '#lib/i18n/i18n.svelte.ts';
	import Ring from '../parts/Ring.svelte';
	import StatePill from '../parts/StatePill.svelte';

	let {
		session,
		title,
		fullscreen
	}: { session: Session; title: string; fullscreen: FullscreenControl } = $props();

	const display = $derived(session.display);
	const paused = $derived(display.state === 'paused');

	const WARNING_KEYS: Record<Warning, { message: MessageKey; detail: MessageKey }> = {
		audio: { message: 'warning.sound_title', detail: 'warning.sound_note' },
		wakeLock: { message: 'warning.wake_title', detail: 'warning.wake_note' }
	};

	// 「次のベル」は、時刻の部分だけを太く出す。文の語順は言語で変わるため、時刻の位置に目印を入れて辞書の文を組み、
	// 目印の前後で分ける（文字列をつなげて文を作らない）
	const TIME_MARK = '\u0001';
	function nextParts(key: 'timer.next_bell_long' | 'timer.next_bell_short') {
		const next = display.next;
		if (next === null) return null;
		const [before, after = ''] = i18n.tm(msg(key, { label: next.name, time: TIME_MARK })).split(TIME_MARK);
		return { before, after, time: next.in };
	}
	const nextLong = $derived(nextParts('timer.next_bell_long'));
	const nextShort = $derived(nextParts('timer.next_bell_short'));

	function onkeydown(e: KeyboardEvent) {
		session.handleKey(e);
		// F：全画面。確認中と修飾キー付き、押しっぱなしは無視する
		if (
			e.key.toLowerCase() === 'f' &&
			!e.ctrlKey && !e.altKey && !e.metaKey && !e.repeat &&
			!session.confirming && fullscreen.supported
		) {
			e.preventDefault();
			void fullscreen.toggle();
		}
	}
</script>

<svelte:window {onkeydown} onpointermove={() => session.poke()} onpointerdown={() => session.poke()} />

<div class="screen timer {display.state}" class:hidden-controls={session.controlsHidden}>
	{#if session.controlsHidden}
		<!-- スクリーンリーダー向け。操作ボタンを隠しているあいだだけ現れ、押すと表示を戻す（見える人は画面のどこを触れても戻るので、
		     ポインターの操作は受けない） -->
		<button type="button" class="show-controls" aria-label={i18n.t('timer.show_controls')} onclick={() => session.poke()}></button>
	{/if}
	{#each session.warnings as w (w)}
		<Banner
			message={i18n.t(WARNING_KEYS[w].message)}
			detail={i18n.t(WARNING_KEYS[w].detail)}
			onclose={() => session.dismissWarning(w)}
		/>
	{/each}

	<div class="top">
		<p class="talk-title">{title}</p>
		{#if nextLong && nextShort}
			<span class="next-bell">
				<span class="long">{nextLong.before}<strong>{nextLong.time}</strong>{nextLong.after}</span>
				<span class="short">{nextShort.before}<strong>{nextShort.time}</strong>{nextShort.after}</span>
			</span>
		{/if}
	</div>

	<div class="main">
		<Ring progress={session.snapshot.progress} state={display.state}>
			<span class="digits" role="timer">{display.digits}</span>
			{#if display.sub !== null}
				<span class="sub-time">{i18n.tm(display.sub)}</span>
			{:else if display.state !== 'ok'}
				<StatePill state={display.state} />
			{/if}
		</Ring>
	</div>

	<div class="controls">
		<!-- フォーカスを保つため、一時停止と再開は同じボタンの表示を切り替える -->
		<Button
			size="lg"
			variant={paused ? 'primary' : 'normal'}
			onclick={() => session.togglePause()}
			style="flex: var(--controls-flex); padding-inline: var(--controls-padding)"
		>
			<Icon name={paused ? 'play' : 'pause'} filled />{i18n.t(paused ? 'timer.resume' : 'timer.pause')}
		</Button>
		<Button
			size="lg"
			onclick={() => session.requestFinish()}
			style="flex: var(--controls-flex); padding-inline: var(--controls-padding)"
		>
			<Icon name="stop" filled />{i18n.t('timer.end')}
		</Button>
		{#if fullscreen.supported}
			<span class="fullscreen">
				<Button size="lg" variant="ghost" iconOnly aria-label={i18n.t('timer.fullscreen')} onclick={() => fullscreen.toggle()}>
					<Icon name="full" />
				</Button>
			</span>
		{/if}
	</div>

	<div class="kbd-hints">
		<span><Kbd>Space</Kbd>{i18n.t('timer.kbd.pause')}</span>
		{#if fullscreen.supported}<span><Kbd>F</Kbd>{i18n.t('timer.kbd.fullscreen')}</span>{/if}
		<span><Kbd>Esc</Kbd>{i18n.t('timer.kbd.end')}</span>
	</div>

	{#if session.confirming}
		<ConfirmDialog
			title={i18n.t('end_confirm.title')}
			confirmLabel={i18n.t('end_confirm.end')}
			cancelLabel={i18n.t('end_confirm.continue')}
			onconfirm={() => session.confirmFinish()}
			oncancel={() => session.cancelFinish()}
			initialFocus="confirm"
		>
			{i18n.t('end_confirm.body', {
				elapsed: formatClock(session.snapshot.elapsedMs),
				total: formatClock(session.durationMs)
			})}
			{#snippet hints()}
				<span><Kbd>Enter</Kbd>{i18n.t('end_confirm.key_end')}</span>
				<span><Kbd>Esc</Kbd>{i18n.t('end_confirm.key_continue')}</span>
			{/snippet}
		</ConfirmDialog>
	{/if}
</div>

<style>
	.timer {
		position: relative;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--timer-padding);
	}

	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		min-width: 0;
	}
	.talk-title {
		font-size: var(--talk-title-size);
		font-weight: var(--font-weight-medium);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
		min-height: var(--line-height-normal);
	}

	/* 広い画面では文字を大きくし、「次のベル」の見出しを付ける（値は .screen が渡す） */
	.next-bell {
		flex: none;
		font-size: var(--next-bell-size);
		color: var(--color-text-muted);
		font-variant-numeric: var(--font-digits-variant);
	}
	.next-bell strong {
		color: var(--color-text);
		font-family: var(--font-digits);
	}
	.long {
		display: var(--next-bell-long-display);
	}
	.short {
		display: var(--next-bell-short-display);
	}

	.main {
		flex: 1;
		min-height: 0;
		/* 警告バナーなどで高さが足りないときも、リングが操作ボタンに重ならないよう、この領域に収める */
		container-type: size;
		--ring-fit: min(var(--ring-size), 100cqmin);
		display: grid;
		place-items: center;
	}

	.digits {
		font-family: var(--font-digits);
		font-variant-numeric: var(--font-digits-variant);
		font-weight: var(--font-weight-timer);
		letter-spacing: var(--letter-spacing-timer);
		line-height: var(--line-height-tight);
		font-size: calc(var(--ring-fit) * var(--ring-digit-ratio));
		color: var(--color-text);
	}
	.sub-time {
		font-size: calc(var(--ring-fit) * var(--ring-digit-ratio) * 0.22);
		color: var(--color-text-muted);
		font-variant-numeric: var(--font-digits-variant);
	}
	.over .digits {
		color: var(--color-state-over-text);
		animation: over-blink var(--blink-period-over) var(--easing-standard) infinite alternate;
	}
	.paused .digits {
		color: var(--color-text-muted);
	}
	@keyframes over-blink {
		to {
			opacity: var(--blink-dim-opacity);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.over .digits {
			animation: none;
		}
	}

	.controls {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: nowrap;
	}

	/* 全画面ボタンは広い画面でだけ出す（値は .screen が渡す） */
	.fullscreen {
		display: var(--fullscreen-display);
	}

	/* 操作ボタンを隠した状態。位置は変えず、フェードして消す。カーソルも隠す */
	.controls,
	.kbd-hints {
		transition: opacity var(--duration-slow) var(--easing-exit);
	}
	.hidden-controls {
		cursor: none;
	}
	.show-controls {
		position: absolute;
		inset: 0;
		z-index: 1;
		border: 0;
		background: transparent;
		pointer-events: none;
		cursor: none;
	}
	.hidden-controls .controls,
	.hidden-controls .kbd-hints {
		visibility: hidden;
		opacity: 0;
	}

	.kbd-hints {
		display: var(--kbd-hints-display);
		justify-content: center;
		gap: var(--space-5);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}
</style>
