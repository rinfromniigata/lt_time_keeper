<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from './Icon.svelte';

	// 一覧が空のときの案内。説明と、次にすることのボタン（action）を出す
	interface Props {
		icon?: IconName;
		children: Snippet; // 説明
		action?: Snippet;
	}

	let { icon = 'bell', children, action }: Props = $props();
</script>

<div class="empty">
	<Icon name={icon} />
	<span>{@render children()}</span>
	{@render action?.()}
</div>

<style>
	.empty {
		border: var(--border-width-strong) dashed var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-5);
		text-align: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		align-items: center;
	}
</style>
