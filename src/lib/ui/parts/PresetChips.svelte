<script lang="ts">
	import { SECOND } from '../../core/time.ts';

	// 持ち時間のプリセット（分）。選択中は value（ミリ秒）と一致するもの
	interface Props {
		value: number;
		minutes?: number[];
		onselect: (ms: number) => void;
	}

	let { value, minutes = [3, 5, 10, 15, 20], onselect }: Props = $props();
</script>

<div class="chips">
	{#each minutes as m (m)}
		{@const ms = m * 60 * SECOND}
		<button type="button" class="chip" class:selected={value === ms} aria-pressed={value === ms} onclick={() => onselect(ms)}>
			{m}分
		</button>
	{/each}
</div>

<style>
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.chip {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target-min);
		padding-inline: var(--space-4);
		border-radius: var(--radius-full);
		border: var(--border-width) solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: var(--font-size-sm);
		font-variant-numeric: var(--font-digits-variant);
	}
	.chip:hover {
		border-color: var(--color-text-muted);
	}
	.selected {
		border-color: var(--color-accent);
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font-weight: var(--font-weight-bold);
	}
</style>
