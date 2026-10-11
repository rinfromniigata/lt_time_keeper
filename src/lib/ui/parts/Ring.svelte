<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { DisplayState } from './state.ts';

	// 残りの割合を円で示す。中央には数字などを children で置く。
	// 子孫は --state-color（状態の色）を継承して使える
	interface Props {
		progress: number; // 0..1。超過では 1
		state: DisplayState;
		children?: Snippet;
	}

	let { progress, state, children }: Props = $props();

	// pathLength=100 の円なので、残りの割合がそのまま線の長さになる
	const offset = $derived(100 * (1 - Math.min(1, Math.max(0, progress))));
</script>

<div class="ring {state}">
	<svg viewBox="0 0 100 100" aria-hidden="true">
		<circle class="track" cx="50" cy="50" r="44" />
		<circle
			class="progress"
			cx="50"
			cy="50"
			r="44"
			pathLength="100"
			style:stroke-dasharray="100"
			style:stroke-dashoffset={offset}
		/>
	</svg>
	<div class="center">{@render children?.()}</div>
</div>

<style>
	.ring {
		position: relative;
		width: var(--ring-fit, var(--ring-size));
		height: var(--ring-fit, var(--ring-size));
	}
	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}
	.track {
		fill: none;
		stroke: var(--color-ring-track);
		stroke-width: var(--ring-stroke-width);
	}
	.progress {
		fill: none;
		stroke: var(--state-color);
		stroke-width: var(--ring-stroke-width);
		stroke-linecap: round;
		transition: stroke var(--duration-slow) var(--easing-standard);
	}
	.center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
	}

	.ok {
		--state-color: var(--color-state-ok);
		--state-soft: var(--color-state-ok-soft);
	}
	.warn {
		--state-color: var(--color-state-warn);
		--state-soft: var(--color-state-warn-soft);
	}
	.over {
		--state-color: var(--color-state-over);
		--state-soft: var(--color-state-over-soft);
	}
	.paused {
		--state-color: var(--color-state-paused);
		--state-soft: var(--color-state-paused-soft);
	}

	.over .progress {
		animation: over-blink var(--blink-period-over) var(--easing-standard) infinite alternate;
	}
	@keyframes over-blink {
		to {
			opacity: var(--blink-dim-opacity);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.over .progress {
			animation: none;
		}
	}
</style>
