<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	// チェックボックス。本物の input を全面に重ねて、キーボード・読み上げ・クリックはブラウザに任せる。
	// 文言は children、補足は hint（任意）で渡す
	let {
		checked = $bindable(),
		disabled = false,
		hint,
		children
	}: { checked: boolean; disabled?: boolean; hint?: string; children: Snippet } = $props();
</script>

<label class="check" class:disabled>
	<input type="checkbox" bind:checked {disabled} />
	<span class="box"><Icon name="check" /></span>
	<span class="text">
		<span>{@render children()}</span>
		{#if hint}<span class="hint">{hint}</span>{/if}
	</span>
</label>

<style>
	.check {
		position: relative;
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
		cursor: pointer;
	}
	/* 見えない input が全面を覆う（クリックはこの input が受ける） */
	input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: inherit;
	}
	.box {
		width: calc(var(--icon-size) + var(--space-1));
		height: calc(var(--icon-size) + var(--space-1));
		flex: none;
		margin-top: var(--space-1);
		border: var(--border-width-strong) solid var(--color-border-input);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		display: grid;
		place-items: center;
		color: var(--color-text-inverse);
		transition: background var(--duration-fast) var(--easing-standard);
	}
	.box :global(.icon) {
		stroke-width: 3;
		visibility: hidden;
	}
	input:checked + .box {
		background: var(--color-accent);
		border-color: var(--color-accent);
	}
	input:checked + .box :global(.icon) {
		visibility: visible;
	}
	input:hover:not(:disabled) + .box {
		filter: brightness(0.94);
	}
	input:focus-visible + .box {
		outline: var(--focus-ring-width) solid var(--color-focus-ring);
		outline-offset: var(--focus-ring-offset);
	}
	input:disabled + .box {
		background: var(--color-disabled-bg);
		border-color: var(--color-disabled-bg);
	}
	.disabled {
		color: var(--color-disabled-text);
		cursor: not-allowed;
	}
	.text {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
		font-size: var(--font-size-sm);
	}
	.hint {
		color: var(--color-text-muted);
	}
	.disabled .hint {
		color: inherit;
	}
</style>
