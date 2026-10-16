<script lang="ts">
	import { STATE_LABELS, type DisplayState } from './state.ts';

	let { state }: { state: DisplayState } = $props();
</script>

<span class="state-pill {state}">{STATE_LABELS[state]}</span>

<style>
	.state-pill {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding-inline: var(--space-3);
		padding-block: var(--space-1);
		border-radius: var(--radius-full);
		background: var(--state-soft);
		color: var(--state-text);
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-sm);
	}
	/* 色だけに頼らないよう、状態ごとに印の形を変える（一時停止は「||」） */
	.state-pill::before {
		content: '';
		width: var(--space-2);
		height: var(--space-2);
		border-radius: var(--radius-full);
		background: currentColor;
	}
	.paused::before {
		border-radius: 0;
		width: var(--space-1);
		box-shadow: calc(var(--space-1) * 1.5) 0 0 currentColor;
		margin-right: var(--space-1);
	}

	.ok {
		--state-color: var(--color-state-ok);
		--state-soft: var(--color-state-ok-soft);
		--state-text: var(--color-state-ok-text);
	}
	.warn {
		--state-color: var(--color-state-warn);
		--state-soft: var(--color-state-warn-soft);
		--state-text: var(--color-state-warn-text);
	}
	.over {
		--state-color: var(--color-state-over);
		--state-soft: var(--color-state-over-soft);
		--state-text: var(--color-state-over-text);
	}
	.paused {
		--state-color: var(--color-state-paused);
		--state-soft: var(--color-state-paused-soft);
		--state-text: var(--color-state-paused-text);
	}
</style>
