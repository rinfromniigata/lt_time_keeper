<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'normal' | 'primary' | 'ghost' | 'danger' | 'danger-fill';
		size?: 'md' | 'lg';
		iconOnly?: boolean; // アイコンだけのボタン（aria-label を必ず付ける）
		block?: boolean;
		children?: Snippet;
	}

	let {
		variant = 'normal',
		size = 'md',
		iconOnly = false,
		block = false,
		type = 'button',
		children,
		...rest
	}: Props = $props();
</script>

<button {type} class="btn {variant} {size}" class:icon-only={iconOnly} class:block {...rest}>
	{@render children?.()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: var(--tap-target-min);
		padding-inline: var(--space-5);
		border-radius: var(--radius-md);
		border: var(--border-width) solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		font-weight: var(--font-weight-medium);
		white-space: nowrap;
		transition:
			background var(--duration-fast) var(--easing-standard),
			border-color var(--duration-fast) var(--easing-standard);
	}
	.btn:hover:not(:disabled) {
		background: var(--color-surface-raised);
		border-color: var(--color-text-muted);
	}

	.primary {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: var(--color-text-inverse);
	}
	.primary:hover:not(:disabled) {
		background: var(--color-accent-hover);
		border-color: var(--color-accent-hover);
	}

	.ghost {
		background: transparent;
		border-color: transparent;
	}
	.ghost:hover:not(:disabled) {
		background: var(--color-surface);
		border-color: var(--color-border);
	}

	.danger {
		color: var(--color-danger);
	}

	.danger-fill {
		background: var(--color-danger);
		border-color: var(--color-danger);
		color: var(--color-text-inverse);
	}
	.danger-fill:hover:not(:disabled) {
		background: var(--color-danger);
		border-color: var(--color-danger);
		filter: brightness(0.92);
	}

	.lg {
		min-height: var(--tap-target-lg);
		padding-inline: var(--space-7);
		font-size: var(--font-size-lg);
		border-radius: var(--radius-lg);
	}
	.icon-only {
		padding-inline: 0;
		width: var(--tap-target-min);
	}
	.lg.icon-only {
		width: var(--tap-target-lg);
	}
	.block {
		width: 100%;
	}

	.btn:disabled {
		background: var(--color-disabled-bg);
		border-color: var(--color-disabled-bg);
		color: var(--color-disabled-text);
	}
</style>
