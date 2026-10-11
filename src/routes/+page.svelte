<script lang="ts">
	import { onMount } from 'svelte';

	type Screen = 'settings' | 'timer';

	// 画面の切り替えは URL を使わず、この状態だけで行う
	let screen = $state<Screen>('settings');

	// 起動画面（S00）は app.html の静的マークアップ。表示できる状態になったら取り除く
	onMount(() => {
		document.getElementById('splash')?.remove();
	});
</script>

<main class="app" data-screen={screen}>
	{#if screen === 'settings'}
		<p>設定画面（T2-5 で実装）</p>
	{:else}
		<p>計測画面（T2-7 で実装）</p>
	{/if}
</main>
