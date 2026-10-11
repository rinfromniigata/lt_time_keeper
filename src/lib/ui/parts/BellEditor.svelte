<script lang="ts" module>
	import type { BellBase, Strikes } from '../../core/bells.ts';

	export interface BellValues {
		base: BellBase;
		offsetMs: number;
		strikes: Strikes;
	}
</script>

<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Button from './Button.svelte';
	import DurationInput from './DurationInput.svelte';
	import Segmented from './Segmented.svelte';

	// ベルの編集。狭い画面では下から出るシート、広い画面では中央のダイアログ（配置は .screen が渡す値）。
	// 「編集」は 削除／決定、「追加」は キャンセル／決定。Esc と暗い背景のクリックは、どちらも取りやめ（oncancel）

	interface Props {
		mode: 'add' | 'edit';
		title: string; // 「1鈴を編集」「ベルを追加」
		initial: BellValues;
		onsubmit: (values: BellValues) => void;
		ondelete?: () => void; // edit のときだけ使う
		oncancel: () => void;
	}

	let { mode, title, initial, onsubmit, ondelete, oncancel }: Props = $props();

	// 編集中の値は、決定するまで設定に反映しない（initial は開いた時点の値として一度だけ読む）
	const opened = untrack(() => initial);
	let base = $state<BellBase>(opened.base);
	let offsetMs = $state(opened.offsetMs);
	let strikes = $state<Strikes>(opened.strikes);

	const titleId = $props.id();
	let dialog: HTMLDivElement;

	onMount(() => {
		const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		tabbables()[0]?.focus();
		return () => previous?.isConnected && previous.focus();
	});

	function tabbables(): HTMLElement[] {
		return [
			...dialog.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), input:not(:disabled)')
		];
	}

	// フォーカスがシートの外へ出ないよう Tab を回す。Esc は取りやめ
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			oncancel();
			return;
		}
		if (e.key !== 'Tab') return;
		const items = tabbables();
		const first = items[0];
		const last = items[items.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="scrim" onclick={oncancel}></div>
<div class="layer">
	<!-- Tab を回すためだけにキーを受ける。シート自体にはフォーカスしない -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div bind:this={dialog} class="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} {onkeydown}>
		<div class="grabber"></div>
		<h3 id={titleId}>{title}</h3>
		<div class="group">
			<span class="label">鳴らす時点</span>
			<Segmented
				label="鳴らす時点の基準"
				options={[
					{ value: 'remaining', label: '残り' },
					{ value: 'over', label: '超過後' }
				]}
				bind:value={base}
			/>
			<DurationInput idPrefix="bell" steppers={false} bind:value={offsetMs} />
		</div>
		<div class="group">
			<span class="label">鳴らす回数</span>
			<Segmented
				label="鳴らす回数"
				options={[
					{ value: 1, label: '1回' },
					{ value: 2, label: '2回' },
					{ value: 3, label: '3回' }
				]}
				bind:value={strikes}
			/>
		</div>
		<div class="actions">
			{#if mode === 'edit'}
				<Button variant="danger" onclick={() => ondelete?.()}>削除</Button>
			{:else}
				<Button onclick={oncancel}>キャンセル</Button>
			{/if}
			<Button variant="primary" onclick={() => onsubmit({ base, offsetMs, strikes })}>決定</Button>
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
		justify-items: center;
		align-items: var(--sheet-align, end);
		padding: var(--sheet-layer-padding, 0);
		pointer-events: none; /* 背景のクリックはスクリムで受ける */
	}
	.sheet {
		pointer-events: auto;
		width: 100%;
		max-width: var(--sheet-max-width, none);
		max-height: 100%;
		overflow-y: auto;
		background: var(--color-surface);
		border-radius: var(--sheet-radius, var(--radius-lg) var(--radius-lg) 0 0);
		box-shadow: var(--shadow-lg);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.grabber {
		display: var(--sheet-grabber-display, block);
		width: var(--space-7);
		height: var(--space-1);
		border-radius: var(--radius-full);
		background: var(--color-border);
		align-self: center;
	}
	h3 {
		font-size: var(--font-size-lg);
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}
	.actions {
		display: flex;
		gap: var(--space-3);
	}
	.actions :global(.btn) {
		flex: 1;
	}
</style>
