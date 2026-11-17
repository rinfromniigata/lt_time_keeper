<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { i18n } from '#lib/i18n/i18n.svelte.ts';
	import Icon from '../parts/Icon.svelte';

	// 環境設定の「アプリ情報」タブ（S05b）。プライバシーポリシー（S05c）へは onprivacy で切り替える
	let { onprivacy }: { onprivacy: () => void } = $props();

	const SOURCE_URL = 'https://github.com/rinfromniigata/lt_time_keeper';
	// 言語によらない固有の表記（辞書に入れない）
	const SOURCE_LABEL = 'github.com/rinfromniigata/lt_time_keeper';
	const LICENSE_NAME = 'Apache License 2.0';

	// 使用しているオープンソースソフトウェア。ビルド時に作った oss.json（同じオリジン。オフラインでは SW のキャッシュから返る）を読む。
	// 読めなかった（開発サーバー・初回オフラインなど）ときは、その行を出さない
	interface OssEntry {
		name: string;
		version: string;
		license: string;
	}
	let oss = $state<OssEntry[]>([]);
	onMount(async () => {
		try {
			const response = await fetch(resolve('/oss.json'));
			if (response.ok) oss = (await response.json()) as OssEntry[];
		} catch {
			// 一覧がなくても、ほかの情報は出す
		}
	});
</script>

<div class="about">
	<svg class="about-icon" aria-hidden="true"><use href="#ic-brand" /></svg>
	<div class="about-head">
		<h4>{i18n.t('prefs.about.heading')}</h4>
		<p class="hint">{i18n.t('prefs.about.tagline')}</p>
	</div>
	<dl class="about-list">
		<div><dt>{i18n.t('prefs.about.version', { version: __APP_VERSION__ })}</dt></div>
		<div>
			<dt>{i18n.t('prefs.about.source')}</dt>
			<dd><a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">{SOURCE_LABEL}</a></dd>
		</div>
		<div>
			<dt>{i18n.t('prefs.about.license')}</dt>
			<dd lang="en">{LICENSE_NAME}</dd>
		</div>
		{#if oss.length > 0}
			<div>
				<dt>{i18n.t('prefs.about.third_party')}</dt>
				<dd lang="en">
					<ul class="oss">
						{#each oss as entry (entry.name + entry.version)}
							<li>{entry.name} — {entry.license}</li>
						{/each}
					</ul>
				</dd>
			</div>
		{/if}
	</dl>
	<button type="button" class="about-link" data-privacy-entry onclick={onprivacy}>
		<span class="grow">
			<span class="label">{i18n.t('prefs.about.privacy_link')}</span>
			<span class="hint">{i18n.t('prefs.about.privacy_summary')}</span>
		</span>
		<Icon name="chevron" />
	</button>
</div>

<style>
	.about {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		align-items: flex-start;
	}
	.about-icon {
		width: calc(var(--tap-target-lg) * 1.3);
		height: calc(var(--tap-target-lg) * 1.3);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
	.about-head {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	h4 {
		font-size: var(--font-size-lg);
	}
	.hint {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}
	.about-list {
		width: 100%;
		display: flex;
		flex-direction: column;
	}
	.about-list > div {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding-block: var(--space-3);
		border-top: var(--border-width) solid var(--color-border);
	}
	dl,
	dd {
		margin: 0;
	}
	dt {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
	}
	dd {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}
	dd a {
		color: var(--color-accent);
	}
	.oss {
		list-style: none;
		padding: 0;
	}
	.about-link {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-3);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg);
		color: var(--color-text);
		text-align: left;
		cursor: pointer;
	}
	.about-link:hover {
		border-color: var(--color-text-muted);
	}
	.about-link:focus-visible {
		outline: var(--focus-ring-width) solid var(--color-focus-ring);
		outline-offset: var(--focus-ring-offset);
	}
	.grow {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}
</style>
