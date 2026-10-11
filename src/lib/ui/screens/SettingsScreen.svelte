<script lang="ts">
	import { onMount } from 'svelte';
	import { bellBadge, bellNote, sortBells, type Bell } from '../../core/bells.ts';
	import { formatClock } from '../../core/time.ts';
	import { VibrationRinger } from '../../output/vibration_ringer.ts';
	import type { Ringer } from '../../output/ringer.ts';
	import type { SettingsStore } from '../../settings/store.svelte.ts';
	import BellEditor, { type BellValues } from '../parts/BellEditor.svelte';
	import BellRow from '../parts/BellRow.svelte';
	import ThemeMenu from '../parts/ThemeMenu.svelte';
	import Button from '../parts/Button.svelte';
	import DurationInput from '../parts/DurationInput.svelte';
	import EmptyState from '../parts/EmptyState.svelte';
	import FieldError from '../parts/FieldError.svelte';
	import Icon from '../parts/Icon.svelte';
	import Panel from '../parts/Panel.svelte';
	import PresetChips from '../parts/PresetChips.svelte';
	import Switch from '../parts/Switch.svelte';
	import TextField from '../parts/TextField.svelte';
	import VolumeSlider from '../parts/VolumeSlider.svelte';

	// previewRinger: 「鳴らしてみる」で使う（計測のセッションとは別）
	let {
		settings,
		previewRinger,
		onstart
	}: { settings: SettingsStore; previewRinger: Ringer; onstart: () => void } = $props();

	const durationZero = $derived(settings.issues.durationZero);

	// 行は設定の並びではなく、時刻順に毎回求める
	const rows = $derived(
		sortBells(settings.bells, settings.durationMs).map((bell, index, all) => ({
			bell,
			badge: bellBadge(index, all.length),
			// 4件以上では、編集シートの見出しを「4番目のベルを編集」にする
			editTitle: all.length <= 3 ? `${bellBadge(index, all.length)}を編集` : `${index + 1}番目のベルを編集`,
			when: bell.base === 'remaining' ? `残り ${formatClock(bell.offsetMs)}` : `超過 +${formatClock(bell.offsetMs)}`,
			note: bellNote(bell, settings.bells, settings.durationMs)
		}))
	);
	const bellSummary = $derived(settings.bells.length === 0 ? 'ベルなし' : `ベル ${settings.bells.length}件`);

	// ベルの編集シート。edit は開いた行の id を持つ
	type Editing = { mode: 'add' } | { mode: 'edit'; id: string; title: string; initial: BellValues };
	let editing = $state<Editing | null>(null);

	function openAdd() {
		editing = { mode: 'add' };
	}
	function openEdit(bell: Bell, title: string) {
		editing = {
			mode: 'edit',
			id: bell.id,
			title,
			initial: { base: bell.base, offsetMs: bell.offsetMs, strikes: bell.strikes }
		};
	}
	function submit(values: BellValues) {
		if (editing?.mode === 'edit') settings.updateBell(editing.id, values);
		else if (editing?.mode === 'add') settings.addBell(values);
		editing = null;
	}
	function removeEditing() {
		if (editing?.mode === 'edit') settings.removeBell(editing.id);
		editing = null;
	}

	// 追加の初期値。持ち時間より長い「残り」は鳴らないので、持ち時間までに収める
	const addInitial = $derived<BellValues>({
		base: 'remaining',
		offsetMs: Math.min(60000, settings.durationMs),
		strikes: 1
	});

	async function tryRing() {
		await previewRinger.unlock();
		previewRinger.setVolume(settings.volume);
		previewRinger.ring(1);
	}

	// 振動のスイッチは、対応端末でだけ出す（ビルド時には判定できないので、表示後に決める）
	let vibrationSupported = $state(false);
	onMount(() => {
		vibrationSupported = VibrationRinger.isSupported();
	});
</script>

<div class="screen">
	<header class="app-header">
		<div class="brand">
			<svg class="brand-icon" aria-hidden="true"><use href="#ic-brand" /></svg>
			<span>LTタイムキーパー</span>
		</div>
		<ThemeMenu />
	</header>

	<div class="settings">
		<div class="settings-grid">
			<div class="col">
				<Panel title="持ち時間" order={1}>
					<DurationInput bind:value={() => settings.durationMs, (ms) => settings.setDuration(ms)} error={durationZero} />
					<PresetChips value={settings.durationMs} onselect={(ms) => settings.setDuration(ms)} />
					{#if durationZero}
						<FieldError>持ち時間を1秒以上にしてください。</FieldError>
					{/if}
				</Panel>
				<Panel title="表示名" hint="任意" order={4}>
					<TextField
						aria-label="表示名"
						placeholder="例：LT「型安全なCSS設計」"
						bind:value={() => settings.title, (t) => settings.setTitle(t)}
					/>
					<p class="hint">計測中の画面の上部に表示します。</p>
				</Panel>
			</div>
			<div class="col">
				<Panel title="ベル" hint="{settings.bells.length}件" order={2}>
					{#if rows.length === 0}
						<EmptyState>
							ベルがありません。音は鳴らさず、時間と色だけで知らせます。
							{#snippet action()}
								<Button onclick={openAdd}><Icon name="plus" />ベルを追加</Button>
							{/snippet}
						</EmptyState>
					{:else}
						<ul class="bell-list">
							{#each rows as row (row.bell.id)}
								<li>
									<BellRow
										badge={row.badge}
										when={row.when}
										strikes={row.bell.strikes}
										note={row.note}
										onopen={() => openEdit(row.bell, row.editTitle)}
										ondelete={() => settings.removeBell(row.bell.id)}
									/>
								</li>
							{/each}
						</ul>
						<Button variant="ghost" onclick={openAdd}><Icon name="plus" />ベルを追加</Button>
					{/if}
				</Panel>
				<Panel title="音" order={3}>
					<div class="row">
						<span class="label" id="volume-label">音量</span>
						<div class="grow">
							<VolumeSlider label="音量" bind:value={() => settings.volume, (v) => settings.setVolume(v)} />
						</div>
						<Button onclick={tryRing} style="flex: var(--sound-test-flex)"><Icon name="bell" />鳴らしてみる</Button>
					</div>
					{#if vibrationSupported}
						<div class="row">
							<span class="label grow" id="vibrate-label">ベルと同時に振動する</span>
							<Switch aria-labelledby="vibrate-label" bind:checked={() => settings.vibrate, (v) => settings.setVibrate(v)} />
						</div>
					{/if}
				</Panel>
			</div>
		</div>
	</div>

	<div class="start-bar">
		<span class="summary">
			{durationZero ? '持ち時間を入力すると開始できます' : `持ち時間 ${formatClock(settings.durationMs)} ／ ${bellSummary}`}
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

	{#if editing}
		<BellEditor
			mode={editing.mode}
			title={editing.mode === 'edit' ? editing.title : 'ベルを追加'}
			initial={editing.mode === 'edit' ? editing.initial : addInitial}
			onsubmit={submit}
			ondelete={removeEditing}
			oncancel={() => (editing = null)}
		/>
	{/if}
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
	/* 狭い画面では列を解いて、パネルを order の順に1列で並べる */
	.col {
		display: var(--settings-col-display);
		flex-direction: column;
		gap: var(--settings-gap);
		min-width: 0;
	}
	.bell-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: wrap;
	}
	.grow {
		flex: 1;
		min-width: 0;
	}
	.label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
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
