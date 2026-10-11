<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, hint, children }: { title: string; hint?: string; children: Snippet } = $props();
</script>

<section class="panel">
	<div class="panel-head">
		<h3>{title}</h3>
		{#if hint}<span class="hint">{hint}</span>{/if}
	</div>
	{@render children()}
</section>

<style>
	.panel {
		background: var(--color-surface);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.panel-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-3);
	}
	h3 {
		font-size: var(--font-size-md);
	}
	.hint {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}
</style>
