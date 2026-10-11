<script lang="ts">
	import { MAX_INPUT_MS, SECOND } from '../../core/time.ts';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';
	import NumberField from './NumberField.svelte';

	const MINUTE = 60 * SECOND;
	const TEN_SECONDS = 10 * SECOND;

	// 持ち時間（ミリ秒）を、分と秒の入力欄と増減ボタンで編集する。範囲は 0:00〜99:59
	interface Props {
		value: number;
		error?: boolean;
		idPrefix?: string;
		steppers?: boolean; // 増減ボタンを出すか（ベルの編集では出さない）
	}

	let { value = $bindable(), error = false, idPrefix = 'duration', steppers = true }: Props = $props();

	const minutes = $derived(Math.floor(value / MINUTE));
	const seconds = $derived(Math.floor(value / SECOND) % 60);

	function setMinutes(m: number) {
		value = m * MINUTE + seconds * SECOND;
	}
	function setSeconds(s: number) {
		value = minutes * MINUTE + s * SECOND;
	}
	function add(deltaMs: number) {
		value = Math.min(MAX_INPUT_MS, Math.max(0, value + deltaMs));
	}
</script>

<div class="duration">
	<div class="num-box">
		<NumberField id="{idPrefix}-min" label="分" max={99} {error} bind:value={() => minutes, setMinutes} />
		<span class="unit">分</span>
		{#if steppers}
			<div class="steppers">
				<Button iconOnly aria-label="1分減らす" disabled={value < MINUTE} onclick={() => add(-MINUTE)}>
					<Icon name="minus" />
				</Button>
				<Button
					iconOnly
					aria-label="1分増やす"
					disabled={value + MINUTE > MAX_INPUT_MS}
					onclick={() => add(MINUTE)}
				>
					<Icon name="plus" />
				</Button>
			</div>
		{/if}
	</div>
	<div class="colon" aria-hidden="true">:</div>
	<div class="num-box">
		<NumberField id="{idPrefix}-sec" label="秒" max={59} {error} bind:value={() => seconds, setSeconds} />
		<span class="unit">秒</span>
		{#if steppers}
			<div class="steppers">
				<Button iconOnly aria-label="10秒減らす" disabled={value < TEN_SECONDS} onclick={() => add(-TEN_SECONDS)}>
					<Icon name="minus" />
				</Button>
				<Button
					iconOnly
					aria-label="10秒増やす"
					disabled={value + TEN_SECONDS > MAX_INPUT_MS}
					onclick={() => add(TEN_SECONDS)}
				>
					<Icon name="plus" />
				</Button>
			</div>
		{/if}
	</div>
</div>

<style>
	.duration {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: var(--space-2);
	}
	.num-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}
	.unit {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}
	.steppers {
		display: flex;
		gap: var(--space-1);
	}
	.colon {
		font-family: var(--font-digits);
		font-size: calc(var(--font-size-xl) * 1.4);
		font-weight: var(--font-weight-timer);
		padding-top: var(--space-6);
	}
</style>
