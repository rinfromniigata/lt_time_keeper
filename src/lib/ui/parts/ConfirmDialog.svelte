<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import Button from './Button.svelte';

	// 確認ダイアログ。最初のフォーカスは initialFocus で選ぶ（既定はキャンセル側）。
	// Enter・Esc などのキー操作は呼び出し側（セッション）が担う。Space は押し間違いで決定しないよう、ボタンを押させない。
	// 配置は最も近い position: relative の祖先（.app）を覆う
	interface Props {
		title: string;
		confirmLabel: string;
		cancelLabel: string;
		onconfirm: () => void;
		oncancel: () => void;
		initialFocus?: 'cancel' | 'confirm'; // 最初にフォーカスするボタン
		children?: Snippet; // 本文
		hints?: Snippet; // キー操作の案内
	}

	let {
		title,
		confirmLabel,
		cancelLabel,
		onconfirm,
		oncancel,
		initialFocus = 'cancel',
		children,
		hints
	}: Props = $props();

	const titleId = $props.id();
	let dialog: HTMLDivElement;

	onMount(() => {
		const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const buttons = dialog.querySelectorAll<HTMLElement>('button'); // 先頭＝キャンセル側、末尾＝確定側
		(initialFocus === 'confirm' ? buttons[buttons.length - 1] : buttons[0])?.focus();
		return () => previous?.focus();
	});

	// Space はボタンの標準操作（keyup で押したことになる）も含めて止める
	function blockSpace(e: KeyboardEvent) {
		if (e.key === ' ') e.preventDefault();
	}

	// フォーカスがダイアログの外へ出ないよう、Tab を2つのボタンの間で回す
	function onkeydown(e: KeyboardEvent) {
		blockSpace(e);
		if (e.key !== 'Tab') return;
		const buttons = dialog.querySelectorAll<HTMLElement>('button');
		const first = buttons[0];
		const last = buttons[buttons.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}
</script>

<div class="scrim"></div>
<div class="layer">
	<!-- Tab を回すためだけにキーを受ける。ダイアログ自体にはフォーカスしない -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div bind:this={dialog} class="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} {onkeydown} onkeyup={blockSpace}>
		<h3 id={titleId}>{title}</h3>
		{#if children}<p class="body">{@render children()}</p>{/if}
		{#if hints}<p class="body hints">{@render hints()}</p>{/if}
		<div class="actions">
			<Button variant="primary" onclick={oncancel}>{cancelLabel}</Button>
			<Button variant="danger-fill" onclick={onconfirm}>{confirmLabel}</Button>
		</div>
	</div>
</div>

<style>
	.scrim {
		position: absolute;
		inset: 0;
		background: var(--color-scrim);
		z-index: 2;
	}
	.layer {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: grid;
		place-items: center;
		padding: var(--space-4);
	}
	.dialog {
		width: 100%;
		max-width: calc(var(--start-button-min) * 1.2);
		background: var(--color-surface);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	h3 {
		font-size: var(--font-size-lg);
	}
	.body {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		font-variant-numeric: var(--font-digits-variant);
	}
	/* キー操作の案内は、広い画面（.screen が渡す値）でだけ出す */
	.hints {
		display: var(--kbd-hints-display, flex);
		gap: var(--space-3);
	}
	.actions {
		display: flex;
		gap: var(--space-3);
		justify-content: flex-end;
		flex-wrap: wrap;
	}
	.actions :global(.btn) {
		flex: 1 1 0;
	}
</style>
