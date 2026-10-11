<script lang="ts">
	import { onMount } from 'svelte';
	import { SettingsStore } from '#lib/settings/store.svelte.ts';
	import SettingsScreen from '#lib/ui/screens/SettingsScreen.svelte';

	type Screen = 'settings' | 'timer';

	// 画面の切り替えは URL を使わず、この状態だけで行う
	let screen = $state<Screen>('settings');

	// 設定はページを開いてから閉じるまで残る（計測から S01 に戻っても値が残る）
	const settings = new SettingsStore();

	function start() {
		// 開始を続けて押しても、2回目は何もしない
		if (screen !== 'settings' || !settings.canStart) return;
		screen = 'timer';
	}

	function finish() {
		screen = 'settings';
	}

	// 起動画面（S00）は app.html の静的マークアップ。表示できる状態になったら取り除く
	onMount(() => {
		document.getElementById('splash')?.remove();
	});
</script>

<main class="app" data-screen={screen}>
	{#if screen === 'settings'}
		<SettingsScreen {settings} onstart={start} />
	{:else}
		<!-- 計測画面は T2-7 で実装する。それまでは S01 に戻れるだけの仮置き -->
		<p>計測画面（T2-7 で実装）</p>
		<button type="button" onclick={finish}>終了</button>
	{/if}
</main>
