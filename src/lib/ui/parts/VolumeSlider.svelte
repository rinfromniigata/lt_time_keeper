<script lang="ts">
	// 音量（0〜1）のスライダー。名前は呼び出し側で aria-label を付ける
	interface Props {
		value: number;
		label: string;
		disabled?: boolean;
		id?: string;
	}

	let { value = $bindable(), label, disabled = false, id }: Props = $props();

	const percent = $derived(Math.round(value * 100));

	function oninput(e: Event & { currentTarget: HTMLInputElement }) {
		value = Number(e.currentTarget.value) / 100;
	}
</script>

<input
	{id}
	class="range"
	type="range"
	min="0"
	max="100"
	step="1"
	value={percent}
	aria-label={label}
	aria-valuetext="{percent}%"
	{disabled}
	{oninput}
/>

<style>
	.range {
		width: 100%;
		min-height: var(--tap-target-min);
		margin: 0;
		accent-color: var(--color-accent);
		cursor: pointer;
	}
	.range:disabled {
		cursor: not-allowed;
	}
</style>
