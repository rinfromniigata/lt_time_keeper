<script lang="ts">
	import { formatClock } from '../../core/time.ts';
	import type { SettingsStore } from '../../settings/store.svelte.ts';
	import Button from '../parts/Button.svelte';
	import DurationInput from '../parts/DurationInput.svelte';
	import FieldError from '../parts/FieldError.svelte';
	import Icon from '../parts/Icon.svelte';
	import Panel from '../parts/Panel.svelte';
	import PresetChips from '../parts/PresetChips.svelte';
	import TextField from '../parts/TextField.svelte';

	let { settings, onstart }: { settings: SettingsStore; onstart: () => void } = $props();

	const durationZero = $derived(settings.issues.durationZero);
</script>

<div class="screen">
	<header class="app-header">
		<div class="brand">
			<svg class="brand-icon" aria-hidden="true"><use href="#ic-brand" /></svg>
			<span>LTタイムキーパー</span>
		</div>
	</header>

	<div class="settings">
		<div class="settings-grid">
			<div class="col">
				<Panel title="持ち時間">
					<DurationInput bind:value={() => settings.durationMs, (ms) => settings.setDuration(ms)} error={durationZero} />
					<PresetChips value={settings.durationMs} onselect={(ms) => settings.setDuration(ms)} />
					{#if durationZero}
						<FieldError>持ち時間を1秒以上にしてください。</FieldError>
					{/if}
				</Panel>
				<Panel title="表示名" hint="任意">
					<TextField
						aria-label="表示名"
						placeholder="例：LT「型安全なCSS設計」"
						bind:value={() => settings.title, (t) => settings.setTitle(t)}
					/>
					<p class="hint">計測中の画面の上部に表示します。</p>
				</Panel>
			</div>
		</div>
	</div>

	<div class="start-bar">
		<span class="summary">
			{durationZero ? '持ち時間を入力すると開始できます' : `持ち時間 ${formatClock(settings.durationMs)}`}
		</span>
		<Button
			variant="primary"
			size="lg"
			disabled={!settings.canStart}
			onclick={onstart}
			style="width: var(--start-width); min-width: var(--start-min-width)"
		>
			<Icon name="play" filled />開始
		</Button>
	</div>
</div>

<style>
	.screen {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.app-header {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding-inline: var(--space-4);
		padding-block: var(--space-2);
		min-height: calc(var(--tap-target-min) + var(--space-4));
		border-bottom: var(--border-width) solid var(--color-border);
		background: var(--color-surface);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: var(--font-weight-bold);
	}
	.brand-icon {
		width: calc(var(--icon-size) * 1.2);
		height: calc(var(--icon-size) * 1.2);
		border-radius: var(--radius-sm);
		overflow: hidden;
		flex: none;
	}

	.settings {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: var(--settings-padding);
	}
	.settings-grid {
		display: grid;
		grid-template-columns: var(--settings-columns);
		gap: var(--settings-gap);
		max-width: var(--layout-settings-max);
		margin-inline: auto;
		align-items: start;
	}
	.col {
		display: flex;
		flex-direction: column;
		gap: var(--settings-gap);
		min-width: 0;
	}
	.hint {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.start-bar {
		flex: none;
		padding-inline: var(--space-4);
		padding-block: var(--space-3);
		border-top: var(--border-width) solid var(--color-border);
		background: var(--color-surface);
		display: flex;
		flex-direction: var(--start-bar-direction);
		gap: var(--start-bar-gap);
		align-items: center;
		justify-content: center;
	}
	.summary {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		text-align: center;
		font-variant-numeric: var(--font-digits-variant);
	}
</style>
