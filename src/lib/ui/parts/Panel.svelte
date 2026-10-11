<script lang="ts">
	import type { Snippet } from 'svelte';

	// order: 狭い画面（列が1つ）での並び順。広い画面では列の中での並び順になる
	let {
		title,
		hint,
		order,
		children
	}: { title: string; hint?: string; order?: number; children: Snippet } = $props();
</script>

<section class="panel" style:order>
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
