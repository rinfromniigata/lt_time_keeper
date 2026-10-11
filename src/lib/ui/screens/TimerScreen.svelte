<script lang="ts">
	import { formatClock } from '../../core/time.ts';
	import type { Session } from '../../session/session.svelte.ts';
	import Button from '../parts/Button.svelte';
	import ConfirmDialog from '../parts/ConfirmDialog.svelte';
	import Icon from '../parts/Icon.svelte';
	import Kbd from '../parts/Kbd.svelte';
	import Ring from '../parts/Ring.svelte';
	import StatePill from '../parts/StatePill.svelte';

	let { session, title }: { session: Session; title: string } = $props();

	const display = $derived(session.display);
	const paused = $derived(display.state === 'paused');
</script>

<svelte:window onkeydown={(e) => session.handleKey(e)} />

<div class="screen timer {display.state}">
	<div class="top">
		<p class="talk-title">{title}</p>
		{#if display.next}
			<span class="next-bell">
				<span class="prefix">次のベル　</span>{display.next.label} <strong>{display.next.in}</strong>
			</span>
		{/if}
	</div>

	<div class="main">
		<Ring progress={session.snapshot.progress} state={display.state}>
			<span class="digits" role="timer">{display.digits}</span>
			{#if display.sub !== null}
				<span class="sub-time">{display.sub}</span>
			{:else}
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
			<Icon name={paused ? 'play' : 'pause'} filled />{paused ? '再開' : '一時停止'}
		</Button>
		<Button
			size="lg"
			onclick={() => session.requestFinish()}
			style="flex: var(--controls-flex); padding-inline: var(--controls-padding)"
		>
			<Icon name="stop" filled />終了
		</Button>
	</div>

	<div class="kbd-hints">
		<span><Kbd>Space</Kbd>一時停止・再開</span>
		<span><Kbd>Esc</Kbd>終了</span>
	</div>

	{#if session.confirming}
		<ConfirmDialog
			title="計測を終了しますか？"
			confirmLabel="終了する"
			cancelLabel="続ける"
			onconfirm={() => session.confirmFinish()}
			oncancel={() => session.cancelFinish()}
		>
			経過 {formatClock(session.snapshot.elapsedMs)} ／ {formatClock(session.durationMs)}。終了すると設定画面に戻ります。計測はこのあいだも続いています。
			{#snippet hints()}
				<span><Kbd>Enter</Kbd>終了する</span>
				<span><Kbd>Esc</Kbd>続ける</span>
			{/snippet}
		</ConfirmDialog>
	{/if}
</div>

<style>
	.timer {
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
	.prefix {
		display: var(--next-bell-prefix-display);
	}

	.main {
		flex: 1;
		min-height: 0;
		display: grid;
		place-items: center;
	}

	.digits {
		font-family: var(--font-digits);
		font-variant-numeric: var(--font-digits-variant);
		font-weight: var(--font-weight-timer);
		letter-spacing: var(--letter-spacing-timer);
		line-height: var(--line-height-tight);
		font-size: calc(var(--ring-size) * var(--ring-digit-ratio));
		color: var(--color-text);
	}
	.sub-time {
		font-size: calc(var(--ring-size) * var(--ring-digit-ratio) * 0.22);
		color: var(--color-text-muted);
		font-variant-numeric: var(--font-digits-variant);
	}
	.over .digits {
		color: var(--color-state-over);
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

	.kbd-hints {
		display: var(--kbd-hints-display);
		justify-content: center;
		gap: var(--space-5);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}
</style>
