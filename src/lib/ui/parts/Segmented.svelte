<script lang="ts" generics="T extends string | number">
	// 2〜3択の切り替え。選択中の1つだけが Tab で止まり、矢印キーで選択を移す
	interface Props {
		options: { value: T; label: string }[];
		value: T;
		label: string; // グループの aria-label
		disabled?: boolean;
	}

	let { options, value = $bindable(), label, disabled = false }: Props = $props();

	let group: HTMLDivElement;

	function onkeydown(e: KeyboardEvent) {
		const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
		if (step === 0) return;
		e.preventDefault();
		const index = options.findIndex((o) => o.value === value);
		const next = options[(index + step + options.length) % options.length];
		value = next.value;
		// 選択を移したボタンへフォーカスも移す（tabindex の更新後に）
		queueMicrotask(() => group.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
	}
</script>

<!-- 矢印キーは各ボタンからここへ届く -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div bind:this={group} class="segmented" role="radiogroup" aria-label={label} {onkeydown}>
	{#each options as option (option.value)}
		{@const selected = option.value === value}
		<button
			type="button"
			role="radio"
			class="segment"
			class:selected
			aria-checked={selected}
			tabindex={selected ? 0 : -1}
			{disabled}
			onclick={() => (value = option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>

<style>
	.segmented {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}
	.segment {
		min-height: var(--tap-target-min);
		display: grid;
		place-items: center;
		font-size: var(--font-size-sm);
		border-left: var(--border-width) solid var(--color-border);
		background: var(--color-bg);
		transition: background var(--duration-fast) var(--easing-standard);
	}
	.segment:first-child {
		border-left: 0;
	}
	.segment:hover:not(:disabled):not(.selected) {
		background: var(--color-surface-raised);
	}
	.selected {
		background: var(--color-accent);
		color: var(--color-text-inverse);
		font-weight: var(--font-weight-bold);
	}
	/* 枠に隠れないよう、フォーカスリングは内側に出す */
	.segment:focus-visible {
		outline-offset: calc(var(--focus-ring-width) * -1);
	}
	.segment:disabled {
		background: var(--color-disabled-bg);
		color: var(--color-disabled-text);
	}
</style>
