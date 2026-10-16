<script lang="ts">
	import { bellBadge, bellNote, nextBellName, sortBells, type Bell } from '../../core/bells.ts';
	import { formatClock } from '../../core/time.ts';
	import type { UpdateNotifier } from '../../pwa/update.svelte.ts';
	import type { SettingsStore } from '../../settings/store.svelte.ts';
	import Banner from '../parts/Banner.svelte';
	import BellEditor, { type BellValues } from '../parts/BellEditor.svelte';
	import BellRow from '../parts/BellRow.svelte';
	import Button from '../parts/Button.svelte';
	import DurationInput from '../parts/DurationInput.svelte';
	import EmptyState from '../parts/EmptyState.svelte';
	import FieldError from '../parts/FieldError.svelte';
	import Icon from '../parts/Icon.svelte';
	import Panel from '../parts/Panel.svelte';
	import PresetChips from '../parts/PresetChips.svelte';
	import { i18n } from '#lib/i18n/i18n.svelte.ts';
	import TextField from '../parts/TextField.svelte';

	// onopenprefs: ヘッダーの歯車から環境設定を開く
	let {
		settings,
		update,
		onstart,
		onopenprefs
	}: {
		settings: SettingsStore;
		update: UpdateNotifier;
		onstart: () => void;
		onopenprefs: () => void;
	} = $props();

	const durationZero = $derived(settings.issues.durationZero);

	// 行は設定の並びではなく、時刻順に毎回求める
	const rows = $derived(
		sortBells(settings.bells, settings.durationMs).map((bell, index, all) => ({
			bell,
			badge: i18n.tm(bellBadge(index, all.length)),
			// 3件以下は「1鈴を編集」、4件以上は「4番目のベルを編集」
			editTitle: i18n.t('bell_editor.title_edit', { label: nextBellName(index, all.length) }),
			when: i18n.t(bell.base === 'remaining' ? 'settings.bells.remaining' : 'settings.bells.overtime', {
				time: formatClock(bell.offsetMs)
			}),
			note: bellNote(bell, settings.bells, settings.durationMs)
		}))
	);
	const summary = $derived.by(() => {
		if (durationZero) return i18n.t('settings.start_bar.summary_invalid');
		const time = formatClock(settings.durationMs);
		return settings.bells.length === 0
			? i18n.t('settings.start_bar.summary_no_bells', { time })
			: i18n.t('settings.start_bar.summary', { time, n: settings.bells.length });
	});

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
</script>

<div class="screen">
	<header class="app-header">
		<div class="brand">
			<svg class="brand-icon" aria-hidden="true"><use href="#ic-brand" /></svg>
			<span>{i18n.t('app.name')}</span>
		</div>
		<div class="header-actions">
			<Button variant="ghost" iconOnly aria-label={i18n.t('header.open_prefs')} onclick={onopenprefs}><Icon name="gear" /></Button>
		</div>
	</header>

	<div class="settings">
		<div class="settings-grid">
			{#if update.available && !update.dismissed}
				<div class="update">
					<Banner
						tone="info"
						message={i18n.t('update.title')}
						detail={i18n.t('update.note')}
						onclose={() => update.dismiss()}
					>
						{#snippet actions()}
							<Button variant="primary" onclick={() => update.reload()}>{i18n.t('update.reload')}</Button>
						{/snippet}
					</Banner>
				</div>
			{/if}
			<div class="col">
				<Panel title={i18n.t('settings.duration.title')} order={1}>
					<DurationInput bind:value={() => settings.durationMs, (ms) => settings.setDuration(ms)} error={durationZero} />
					<PresetChips value={settings.durationMs} onselect={(ms) => settings.setDuration(ms)} />
					{#if durationZero}
						<FieldError>{i18n.t('settings.duration.error_zero')}</FieldError>
					{/if}
				</Panel>
				<Panel title={i18n.t('settings.title.title')} hint={i18n.t('settings.title.optional')} order={3}>
					<TextField
						aria-label={i18n.t('settings.title.title')}
						placeholder={i18n.t('settings.title.placeholder')}
						bind:value={() => settings.title, (t) => settings.setTitle(t)}
					/>
					<p class="hint">{i18n.t('settings.title.hint')}</p>
				</Panel>
			</div>
			<div class="col">
				<Panel title={i18n.t('settings.bells.title')} hint={i18n.t('settings.bells.count', { n: settings.bells.length })} order={2}>
					{#if rows.length === 0}
						<EmptyState>
							{i18n.t('settings.bells.empty')}
							{#snippet action()}
								<Button onclick={openAdd}><Icon name="plus" />{i18n.t('settings.bells.add')}</Button>
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
						<Button variant="ghost" onclick={openAdd}><Icon name="plus" />{i18n.t('settings.bells.add')}</Button>
					{/if}
				</Panel>
			</div>
		</div>
	</div>

	<div class="start-bar">
		<span class="summary">
			{summary}
		</span>
		<Button
			variant="primary"
			size="lg"
			disabled={!settings.canStart}
			onclick={onstart}
			style="width: var(--start-width); min-width: var(--start-min-width)"
		>
			<Icon name="play" filled />{i18n.t('settings.start')}
		</Button>
	</div>

	{#if editing}
		<BellEditor
			mode={editing.mode}
			title={editing.mode === 'edit' ? editing.title : i18n.t('bell_editor.title_add')}
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
	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
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
	/* お知らせは、列の数にかかわらず上に1行で出す */
	.update {
		grid-column: 1 / -1;
		min-width: 0;
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
