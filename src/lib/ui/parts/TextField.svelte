<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		error?: boolean;
	}

	let { value = $bindable(''), error = false, ...rest }: Props = $props();
</script>

<input type="text" class="text-field" class:error aria-invalid={error || undefined} bind:value {...rest} />

<style>
	.text-field {
		width: 100%;
		min-height: var(--tap-target-min);
		padding-inline: var(--space-3);
		border: var(--border-width-strong) solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg);
		color: var(--color-text);
	}
	.text-field::placeholder {
		color: var(--color-text-muted);
	}
	.text-field:focus {
		outline: var(--focus-ring-width) solid var(--color-focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--color-accent);
	}
	.error {
		border-color: var(--color-danger);
	}
	.text-field:disabled {
		background: var(--color-disabled-bg);
		color: var(--color-disabled-text);
		border-color: var(--color-disabled-bg);
		cursor: not-allowed;
	}
</style>
