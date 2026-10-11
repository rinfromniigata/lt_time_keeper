<script lang="ts">
	import type { Strikes } from '../../core/bells.ts';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';

	// ベルの行。行全体が「編集を開く」ボタンで、右端の × が削除。
	// 補足文の種類は bellNote の結果（null は「—」）
	interface Props {
		badge: string; // 「1鈴」「4」など
		when: string; // 「残り 1:00」「超過 +1:00」
		strikes: Strikes;
		note: 'warn' | 'over' | 'silent' | null;
		onopen: () => void;
		ondelete: () => void;
	}

	let { badge, when, strikes, note, onopen, ondelete }: Props = $props();

	const NOTE_TEXT = {
		warn: 'ここで黄（予鈴）に',
		over: 'ここで赤（超過）に',
		silent: '持ち時間より長いため鳴りません'
	} as const;
</script>

<div class="bell-row" class:error={note === 'silent'}>
	<button type="button" class="open" onclick={onopen}>
		<span class="badge">{badge}</span>
		<span class="when">
			<strong>{when}</strong>
			<span class="note" class:warn={note === 'warn'} class:over={note === 'over'}>
				{note ? NOTE_TEXT[note] : '—'}
			</span>
		</span>
		<span class="strikes" role="img" aria-label="{strikes}回">
			{#each { length: strikes } as _, i (i)}<i></i>{/each}
		</span>
	</button>
	<Button variant="ghost" iconOnly aria-label="{badge}を削除" onclick={ondelete}>
		<Icon name="x" />
	</Button>
</div>

<style>
	.bell-row {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		padding-inline-start: var(--space-3);
		padding-block: var(--space-2);
		padding-inline-end: var(--space-1);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg);
	}
	.bell-row:hover {
		border-color: var(--color-text-muted);
	}
	.error,
	.error:hover {
		border-color: var(--color-danger);
	}
	.open {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
		text-align: start;
	}
	.badge {
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-sm);
		font-variant-numeric: var(--font-digits-variant);
		border-radius: var(--radius-sm);
		padding-inline: var(--space-2);
		padding-block: var(--space-1);
		background: var(--color-surface-raised);
		border: var(--border-width) solid var(--color-border);
	}
	.when {
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.when strong {
		font-family: var(--font-digits);
		font-variant-numeric: var(--font-digits-variant);
		font-size: var(--font-size-md);
	}
	.note {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.warn {
		color: var(--color-state-warn);
		font-weight: var(--font-weight-bold);
	}
	.over {
		color: var(--color-state-over);
		font-weight: var(--font-weight-bold);
	}
	.strikes {
		display: inline-flex;
		gap: var(--space-1);
		align-items: center;
	}
	.strikes i {
		width: var(--space-2);
		height: var(--space-2);
		border-radius: var(--radius-full);
		background: var(--color-text);
		display: block;
	}
</style>
