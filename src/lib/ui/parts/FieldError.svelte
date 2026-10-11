<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let { id, children }: { id?: string; children: Snippet } = $props();
</script>

<p class="field-error" {id} role="alert">
	<Icon name="alert" />
	<span>{@render children()}</span>
</p>

<style>
	.field-error {
		color: var(--color-danger);
		font-size: var(--font-size-sm);
		display: flex;
		gap: var(--space-2);
		align-items: flex-start;
	}
	.field-error :global(.icon) {
		width: var(--font-size-md);
		height: var(--font-size-md);
		margin-top: var(--space-1);
	}
</style>
