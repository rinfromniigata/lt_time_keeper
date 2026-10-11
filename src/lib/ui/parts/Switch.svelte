<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	// オン・オフのスイッチ。名前は aria-label か aria-labelledby で付ける
	interface Props extends Omit<HTMLButtonAttributes, 'type' | 'role'> {
		checked: boolean;
	}

	let { checked = $bindable(), disabled = false, ...rest }: Props = $props();
</script>

<button
	type="button"
	role="switch"
	class="switch"
	class:on={checked}
	aria-checked={checked}
	{disabled}
	onclick={() => (checked = !checked)}
	{...rest}
>
	<span class="track"></span>
</button>

<style>
	/* ボタンは押しやすい高さにし、見た目の溝はその中央に置く */
	.switch {
		flex: none;
		display: grid;
		align-items: center;
		width: calc(var(--tap-target-min) * 1.15);
		height: var(--tap-target-min);
	}
	.switch:focus-visible {
		outline: none;
	}
	.track {
		position: relative;
		height: calc(var(--tap-target-min) * 0.65);
		border-radius: var(--radius-full);
		background: var(--color-border);
		transition: background var(--duration-fast) var(--easing-standard);
	}
	.track::after {
		content: '';
		position: absolute;
		top: var(--space-1);
		left: var(--space-1);
		width: calc(var(--tap-target-min) * 0.65 - var(--space-2));
		height: calc(var(--tap-target-min) * 0.65 - var(--space-2));
		border-radius: var(--radius-full);
		background: var(--color-surface);
		box-shadow: var(--shadow-sm);
		transition: transform var(--duration-fast) var(--easing-standard);
	}
	.on .track {
		background: var(--color-accent);
	}
	.on .track::after {
		transform: translateX(calc(var(--tap-target-min) * 0.5));
	}
	.switch:hover:not(:disabled) .track {
		filter: brightness(0.94);
	}
	.switch:focus-visible .track {
		outline: var(--focus-ring-width) solid var(--color-focus-ring);
		outline-offset: var(--focus-ring-offset);
	}
	.switch:disabled .track {
		background: var(--color-disabled-bg);
	}
	.switch:disabled .track::after {
		background: var(--color-disabled-text);
	}
</style>
