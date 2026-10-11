<script lang="ts">
	import { tick } from 'svelte';
	import { theme, type ThemeChoice } from '../../theme/theme.svelte.ts';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';

	// ヘッダーの月のボタンで開く、テーマのメニュー。選んだテーマは保存しない。
	// メニューは最も近い position: relative の祖先（.app）を基準に、ヘッダーの下へ置く
	const OPTIONS: { value: ThemeChoice; label: string }[] = [
		{ value: 'system', label: 'OSに合わせる' },
		{ value: 'light', label: 'ライト' },
		{ value: 'dark', label: 'ダーク' }
	];

	let open = $state(false);
	let root: HTMLDivElement;
	const menuId = $props.id();

	function items(): HTMLButtonElement[] {
		return [...root.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')];
	}

	async function show() {
		open = true;
		await tick();
		// 最初のフォーカスは選択中の項目に置く
		(items().find((b) => b.getAttribute('aria-checked') === 'true') ?? items()[0])?.focus();
	}

	function close(restoreFocus: boolean) {
		open = false;
		if (restoreFocus) root.querySelector<HTMLButtonElement>('.trigger button')?.focus();
	}

	function choose(value: ThemeChoice) {
		theme.set(value);
		close(true);
	}

	function onmenukeydown(e: KeyboardEvent) {
		const list = items();
		const i = list.indexOf(document.activeElement as HTMLButtonElement);
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				list[(i + 1) % list.length]?.focus();
				break;
			case 'ArrowUp':
				e.preventDefault();
				list[(i - 1 + list.length) % list.length]?.focus();
				break;
			case 'Home':
				e.preventDefault();
				list[0]?.focus();
				break;
			case 'End':
				e.preventDefault();
				list.at(-1)?.focus();
				break;
			case 'Escape':
				e.preventDefault();
				close(true);
				break;
			case 'Tab':
				close(false);
				break;
		}
	}

	function onwindowpointerdown(e: PointerEvent) {
		if (open && !root.contains(e.target as Node)) close(false);
	}
</script>

<svelte:window onpointerdown={onwindowpointerdown} />

<div class="theme-menu" bind:this={root}>
	<span class="trigger">
		<Button
			variant="ghost"
			iconOnly
			aria-label="テーマを切り替える"
			aria-haspopup="menu"
			aria-expanded={open}
			aria-controls={open ? menuId : undefined}
			onclick={() => (open ? close(false) : show())}
		>
			<Icon name="moon" />
		</Button>
	</span>

	{#if open}
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div id={menuId} class="menu" role="menu" aria-label="テーマ" onkeydown={onmenukeydown}>
			{#each OPTIONS as o (o.value)}
				<button
					type="button"
					class="menu-item"
					class:selected={theme.choice === o.value}
					role="menuitemradio"
					aria-checked={theme.choice === o.value}
					onclick={() => choose(o.value)}
				>
					{o.label}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.menu {
		position: absolute;
		top: calc(var(--tap-target-min) + var(--space-4));
		right: var(--space-3);
		z-index: 3;
		min-width: calc(var(--start-button-min) * 0.6);
		background: var(--color-surface);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		padding: var(--space-1);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.menu-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--tap-target-min);
		padding-inline: var(--space-3);
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		font: inherit;
		font-size: var(--font-size-sm);
		color: var(--color-text);
		text-align: left;
		cursor: pointer;
	}
	.menu-item:hover {
		background: var(--color-surface-raised);
	}
	.menu-item.selected {
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font-weight: var(--font-weight-bold);
	}
</style>
