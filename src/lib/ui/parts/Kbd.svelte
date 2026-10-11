<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<kbd>{@render children()}</kbd>

<style>
	kbd {
		font-family: var(--font-digits);
		font-size: inherit;
		border: var(--border-width) solid var(--color-border);
		border-bottom-width: var(--border-width-strong);
		border-radius: var(--radius-sm);
		padding-inline: var(--space-1);
		margin-right: var(--space-1);
		color: var(--color-text);
		background: var(--color-surface);
	}
</style>
