<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';

	// 警告・お知らせのバナー。見出しの一文と、補足の一文を持ち、×で閉じられる
	interface Props {
		tone?: 'warn' | 'info';
		message: string;
		detail?: string;
		onclose: () => void;
		actions?: Snippet; // 閉じるボタンの前に置く操作
	}

	let { tone = 'warn', message, detail, onclose, actions }: Props = $props();
</script>

<div class="banner {tone}" role="status">
	<Icon name="alert" />
	<div class="grow">
		<p>{message}</p>
		{#if detail}<p class="detail">{detail}</p>{/if}
	</div>
	{@render actions?.()}
	<Button variant="ghost" iconOnly aria-label="閉じる" onclick={onclose}><Icon name="x" /></Button>
</div>

<style>
	.banner {
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
		padding: var(--space-3);
		border-radius: var(--radius-md);
		background: var(--color-state-warn-soft);
		border: var(--border-width) solid var(--color-state-warn);
		font-size: var(--font-size-sm);
	}
	.banner > :global(.icon:first-child) {
		color: var(--color-state-warn);
		margin-top: var(--space-1);
	}
	.info {
		background: var(--color-accent-soft);
		border-color: var(--color-accent);
	}
	.info > :global(.icon:first-child) {
		color: var(--color-accent);
	}
	.grow {
		flex: 1;
		min-width: 0;
	}
	p {
		margin: 0;
	}
	.detail {
		color: var(--color-text-muted);
	}
	.banner > :global(.btn) {
		flex: none;
	}
</style>
