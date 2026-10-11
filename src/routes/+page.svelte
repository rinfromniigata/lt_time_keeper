<script lang="ts">
	import { onMount } from 'svelte';
	import { SettingsStore } from '#lib/settings/store.svelte.ts';
	import { Session } from '#lib/session/session.svelte.ts';
	import { BrowserWakeLock } from '#lib/device/wake_lock.ts';
	import { AudioRinger } from '#lib/output/audio_ringer.ts';
	import { CompositeRinger } from '#lib/output/composite_ringer.ts';
	import { VibrationRinger } from '#lib/output/vibration_ringer.ts';
	import SettingsScreen from '#lib/ui/screens/SettingsScreen.svelte';
	import TimerScreen from '#lib/ui/screens/TimerScreen.svelte';

	type Screen = 'settings' | 'timer';

	// 画面の切り替えは URL を使わず、この状態だけで行う
	let screen = $state<Screen>('settings');

	// 設定はページを開いてから閉じるまで残る（計測から S01 に戻っても値が残る）
	const settings = new SettingsStore();

	// 音は「鳴らしてみる」と計測で1つを使い回す（AudioContext は、最初に鳴らす操作のときに作られる）
	const audioRinger = new AudioRinger();

	// 計測セッションは、開始で作り、終了で捨てる。設定は開始時点の複製を渡す
	let session = $state<Session | null>(null);

	function start() {
		// 開始を続けて押しても、2回目は何もしない
		if (session || !settings.canStart) return;
		const snapshot = settings.snapshot();
		// 振動は、設定がオンで、対応した端末のときだけ音に添える
		const ringer = new CompositeRinger([
			audioRinger,
			...(snapshot.vibrate && VibrationRinger.isSupported() ? [new VibrationRinger()] : [])
		]);
		session = new Session(snapshot, {
			now: () => performance.now(),
			ringer,
			wakeLock: new BrowserWakeLock(),
			onfinish: leave
		});
		screen = 'timer';
		void session.start();
	}

	function leave() {
		session = null;
		screen = 'settings';
	}

	// 起動画面（S00）は app.html の静的マークアップ。表示できる状態になったら取り除く
	onMount(() => {
		document.getElementById('splash')?.remove();
	});
</script>

<main class="app" data-screen={screen}>
	{#if screen === 'settings'}
		<SettingsScreen {settings} previewRinger={audioRinger} onstart={start} />
	{:else if session}
		<TimerScreen {session} title={settings.title} />
	{/if}
</main>
