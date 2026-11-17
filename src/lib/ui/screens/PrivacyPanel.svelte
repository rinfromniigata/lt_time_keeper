<script lang="ts">
	import { i18n } from '#lib/i18n/i18n.svelte.ts';
	import Icon from '../parts/Icon.svelte';

	// プライバシーポリシー（S05c）。環境設定の「アプリ情報」タブの中で、S05b から切り替えて出す下位の表示。
	// onback: 「アプリ情報」（左上）で S05b に戻る
	let { onback }: { onback: () => void } = $props();

</script>

<div class="policy">
	<button type="button" class="policy-back" data-initial-focus onclick={onback}>
		<Icon name="back" />{i18n.t('prefs.tab.about')}
	</button>
	<h4>{i18n.t('privacy.title')}</h4>
	<p class="hint">{i18n.t('privacy.lead')}</p>
	<section>
		<h5>{i18n.t('privacy.collect.title')}</h5>
		<p>{i18n.t('privacy.collect.body')}</p>
	</section>
	<section>
		<h5>{i18n.t('privacy.store.title')}</h5>
		<p>{i18n.t('privacy.store.body')}</p>
		<p>{i18n.t('privacy.store.cache')}</p>
	</section>
	<section>
		<h5>{i18n.t('privacy.send.title')}</h5>
		<p>{i18n.t('privacy.send.body')}</p>
	</section>
	<section>
		<h5>{i18n.t('privacy.perm.title')}</h5>
		<p>{i18n.t('privacy.perm.lead')}</p>
		<div class="perm-group">
			<h6>{i18n.t('privacy.perm.used')}</h6>
			<ul class="perm-list">
				<li>{i18n.t('privacy.perm.wake_lock')}</li>
				<li>{i18n.t('privacy.perm.audio')}</li>
				<li>{i18n.t('privacy.perm.vibration')}</li>
				<li>{i18n.t('privacy.perm.fullscreen')}</li>
			</ul>
		</div>
		<div class="perm-group">
			<h6>{i18n.t('privacy.perm.unused')}</h6>
			<p>{i18n.t('privacy.perm.unused_list')}</p>
		</div>
	</section>
	<section>
		<h5>{i18n.t('privacy.change.title')}</h5>
		<p>{i18n.t('privacy.change.body', { version: __APP_VERSION__ })}</p>
	</section>
</div>

<style>
	.policy {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.policy-back {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		align-self: flex-start;
		min-height: var(--tap-target-min);
		margin-left: calc(var(--space-2) * -1);
		padding-inline: var(--space-2);
		border: 0;
		border-radius: var(--radius-md);
		background: none;
		color: var(--color-accent);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
	}
	.policy-back:focus-visible {
		outline: var(--focus-ring-width) solid var(--color-focus-ring);
	}
	h4 {
		font-size: var(--font-size-lg);
	}
	section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		border-top: var(--border-width) solid var(--color-border);
		padding-top: var(--space-4);
	}
	h5,
	h6 {
		margin: 0;
	}
	h5 {
		font-size: var(--font-size-md);
	}
	h6 {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-bold);
	}
	p {
		font-size: var(--font-size-sm);
		line-height: var(--line-height-normal);
	}
	.hint {
		color: var(--color-text-muted);
	}
	.perm-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.perm-list {
		list-style: disc;
		padding-left: var(--space-5);
		font-size: var(--font-size-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
</style>
