<script lang="ts">
	import { onMount } from 'svelte';
	import { i18n, LOCALE_NAMES } from '#lib/i18n/i18n.svelte.ts';
	import { LOCALES, type Locale } from '#lib/i18n/messages.ts';
	import type { Ringer } from '../../output/ringer.ts';
	import { VibrationRinger } from '../../output/vibration_ringer.ts';
	import type { PrefsStore } from '../../prefs/store.svelte.ts';
	import Button from '../parts/Button.svelte';
	import Icon from '../parts/Icon.svelte';
	import Segmented from '../parts/Segmented.svelte';
	import Switch from '../parts/Switch.svelte';
	import Tabs, { panelId, tabId } from '../parts/Tabs.svelte';
	import VolumeSlider from '../parts/VolumeSlider.svelte';

	// 環境設定（S05・S05a）。広い画面では S01 に重ねたダイアログ、狭い画面では全画面（配置は .screen が渡す値）。
	// ×・Esc・ダイアログの外側（広い画面）で閉じ、閉じたら開く前にフォーカスのあった要素（歯車）へ戻す。
	// 開くたびに「一般」から始める（この部品を作り直すので、タブの状態は残らない）
	// previewRinger: 「鳴らしてみる」で使う（計測のセッションとは別）
	let { prefs, previewRinger, onclose }: { prefs: PrefsStore; previewRinger: Ringer; onclose: () => void } = $props();

	type TabValue = 'general' | 'sound';
	let tab = $state<TabValue>('general');

	const idBase = $props.id();
	const titleId = `${idBase}-title`;
	let dialog: HTMLDivElement;

	onMount(() => {
		const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		dialog.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
		return () => previous?.isConnected && previous.focus();
	});

	// 疑似ロケール（開発用）のときは選択なしにならないよう原文の言語を選んでおく
	const locale = $derived<Locale>(i18n.locale === 'pseudo' ? 'ja' : i18n.locale);
	const localeOptions = LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l], lang: l }));

	function setLocale(l: Locale) {
		prefs.setLocale(l);
		i18n.setLocale(l);
	}

	async function tryRing() {
		await previewRinger.unlock();
		previewRinger.setVolume(prefs.volume);
		previewRinger.ring(1);
	}

	// 振動のスイッチは、対応端末でだけ出す（ビルド時には判定できないので、表示後に決める）
	let vibrationSupported = $state(false);
	onMount(() => {
		vibrationSupported = VibrationRinger.isSupported();
	});

	function tabbables(): HTMLElement[] {
		return [
			...dialog.querySelectorAll<HTMLElement>(
				'button:not(:disabled):not([tabindex="-1"]), input:not(:disabled), [role="radio"][tabindex="0"]'
			)
		];
	}

	// フォーカスがダイアログの外へ出ないよう Tab を回す。Esc は閉じる
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
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

<div class="screen layer">
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="scrim" onclick={onclose}></div>
	<!-- Tab を回すためだけにキーを受ける。ダイアログ自体にはフォーカスしない -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div bind:this={dialog} class="prefs" role="dialog" aria-modal="true" aria-labelledby={titleId} {onkeydown}>
		<div class="head">
			<h3 id={titleId}>{i18n.t('prefs.title')}</h3>
			<Button variant="ghost" iconOnly aria-label={i18n.t('common.close')} onclick={onclose}><Icon name="x" /></Button>
		</div>
		<Tabs
			tabs={[
				{ value: 'general', label: i18n.t('prefs.tab.general') },
				{ value: 'sound', label: i18n.t('prefs.tab.sound') }
			]}
			bind:selected={tab}
			label={i18n.t('prefs.title')}
			{idBase}
		/>
		<div class="body" role="tabpanel" id={panelId(idBase, tab)} aria-labelledby={tabId(idBase, tab)}>
			{#if tab === 'general'}
				<section class="section">
					<h4>{i18n.t('prefs.language.title')}</h4>
					<Segmented
						label={i18n.t('prefs.language.title')}
						options={localeOptions}
						bind:value={() => locale, setLocale}
					/>
					<p class="hint">{i18n.t('prefs.language.hint')}</p>
				</section>
				<section class="section">
					<h4>{i18n.t('prefs.theme.title')}</h4>
					<Segmented
						label={i18n.t('prefs.theme.title')}
						options={[
							{ value: 'system', label: i18n.t('prefs.theme.system') },
							{ value: 'light', label: i18n.t('prefs.theme.light') },
							{ value: 'dark', label: i18n.t('prefs.theme.dark') }
						]}
						bind:value={() => prefs.theme, (t) => prefs.setTheme(t)}
					/>
				</section>
				<section class="section">
					<h4>{i18n.t('prefs.end_confirm.title')}</h4>
					<div class="row">
						<div class="grow">
							<span class="label" id="{idBase}-end-confirm">{i18n.t('prefs.end_confirm.label')}</span>
							<p class="hint">{i18n.t('prefs.end_confirm.hint')}</p>
						</div>
						<Switch
							aria-labelledby="{idBase}-end-confirm"
							bind:checked={() => prefs.confirmEnd, (v) => prefs.setConfirmEnd(v)}
						/>
					</div>
				</section>
			{:else}
				<section class="section">
					<h4>{i18n.t('prefs.sound.volume')}</h4>
					<div class="volume">
						<div class="grow">
							<VolumeSlider
								label={i18n.t('prefs.sound.volume')}
								bind:value={() => prefs.volume, (v) => prefs.setVolume(v)}
							/>
						</div>
						<span class="range-value">{Math.round(prefs.volume * 100)}%</span>
					</div>
					<Button onclick={tryRing}><Icon name="bell" />{i18n.t('prefs.sound.test')}</Button>
				</section>
				{#if vibrationSupported}
					<section class="section">
						<div class="row">
							<div class="grow">
								<span class="label" id="{idBase}-vibrate">{i18n.t('prefs.sound.vibrate')}</span>
								<p class="hint">{i18n.t('prefs.sound.vibrate_hint')}</p>
							</div>
							<Switch aria-labelledby="{idBase}-vibrate" bind:checked={() => prefs.vibrate, (v) => prefs.setVibrate(v)} />
						</div>
					</section>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.layer {
		position: absolute;
		inset: 0;
		z-index: 3;
	}
	.scrim {
		position: absolute;
		inset: 0;
		display: var(--prefs-scrim-display);
		background: var(--color-scrim);
	}
	.prefs {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: var(--prefs-width);
		height: var(--prefs-height);
		max-height: var(--prefs-max-height);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--color-surface);
		border: var(--prefs-border-width) solid var(--color-border);
		border-radius: var(--prefs-radius);
		box-shadow: var(--prefs-shadow);
	}
	.head {
		flex: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		padding: var(--prefs-head-padding);
		border-bottom: var(--border-width) solid var(--color-border);
	}
	h3 {
		font-size: var(--font-size-lg);
	}
	.body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: var(--prefs-body-padding);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}
	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.section + .section {
		border-top: var(--border-width) solid var(--color-border);
		padding-top: var(--space-5);
	}
	.section > :global(.btn) {
		align-self: flex-start;
	}
	h4 {
		font-size: var(--font-size-md);
	}
	.row {
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
	}
	.row :global(.switch) {
		margin-top: var(--space-1);
	}
	.grow {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.volume {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}
	.hint {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}
	.range-value {
		font-family: var(--font-digits);
		font-variant-numeric: var(--font-digits-variant);
		font-size: var(--font-size-sm);
		min-width: 4ch;
		text-align: right;
	}
</style>
