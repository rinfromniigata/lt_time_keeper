<script lang="ts" generics="T extends string">
	// WAI-ARIA の tabs。選ぶとすぐ内容が切り替わる（自動で有効になる方式）。選択中の1つだけが Tab で止まり、
	// ←→・Home・End で移る。内容の要素（role="tabpanel"）は呼び出し側が置き、id と aria-labelledby を
	// tabId(idBase, value)・panelId(idBase, value) で合わせる。並びの幅と余白は、呼び出し側が
	// --tabs-padding-inline・--tabs-tab-flex・--tabs-tab-justify で決める
	interface Props {
		tabs: { value: T; label: string }[];
		selected: T;
		label: string; // tablist の aria-label
		idBase: string;
	}

	let { tabs, selected = $bindable(), label, idBase }: Props = $props();

	let list: HTMLDivElement;

	function onkeydown(e: KeyboardEvent) {
		const index = tabs.findIndex((t) => t.value === selected);
		let next = index;
		if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
		else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = tabs.length - 1;
		else return;
		e.preventDefault();
		selected = tabs[next].value;
		queueMicrotask(() => list.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
	}
</script>

<script lang="ts" module>
	export const tabId = (idBase: string, value: string) => `${idBase}-tab-${value}`;
	export const panelId = (idBase: string, value: string) => `${idBase}-panel-${value}`;
</script>

<!-- 矢印キーは各タブからここへ届く -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div bind:this={list} class="tabs" role="tablist" aria-label={label} {onkeydown}>
	{#each tabs as tab (tab.value)}
		{@const isSelected = tab.value === selected}
		<button
			type="button"
			role="tab"
			class="tab"
			class:selected={isSelected}
			id={tabId(idBase, tab.value)}
			aria-selected={isSelected}
			aria-controls={panelId(idBase, tab.value)}
			tabindex={isSelected ? 0 : -1}
			onclick={() => (selected = tab.value)}
		>
			{tab.label}
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		gap: var(--space-1);
		padding-inline: var(--tabs-padding-inline, var(--space-4));
		border-bottom: var(--border-width) solid var(--color-border);
	}
	.tab {
		flex: var(--tabs-tab-flex, none);
		min-height: var(--tap-target-min);
		display: inline-flex;
		align-items: center;
		justify-content: var(--tabs-tab-justify, flex-start);
		padding-inline: var(--space-3);
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		border-bottom: var(--border-width-strong) solid transparent;
		margin-bottom: calc(var(--border-width) * -1);
		white-space: nowrap;
	}
	.tab:hover {
		color: var(--color-text);
	}
	.tab.selected {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
		font-weight: var(--font-weight-bold);
	}
	.tab:focus-visible {
		outline-offset: calc(var(--focus-ring-width) * -1);
	}
</style>
