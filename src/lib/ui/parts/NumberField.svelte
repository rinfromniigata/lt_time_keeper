<script lang="ts">
	// 2桁表示の数値入力。入力中は文字のまま持ち、確定（Enter・フォーカスが外れる）で範囲に収める
	interface Props {
		value: number;
		min?: number;
		max: number;
		label: string; // aria-label
		error?: boolean;
		disabled?: boolean;
		id?: string;
	}

	let { value = $bindable(), min = 0, max, label, error = false, disabled = false, id }: Props = $props();

	const pad = (n: number) => String(n).padStart(2, '0');
	const maxLength = $derived(String(max).length);

	let editing = $state(false);
	let text = $state('');
	const display = $derived(editing ? text : pad(value));

	function clamp(n: number): number {
		return Math.min(max, Math.max(min, n));
	}

	function commit() {
		const n = Number.parseInt(text, 10);
		if (editing && !Number.isNaN(n)) value = clamp(n);
		editing = false;
	}

	function onfocus(e: FocusEvent & { currentTarget: HTMLInputElement }) {
		editing = true;
		text = pad(value); // 表示と同じ文字にして、全選択が外れないようにする
		e.currentTarget.select();
	}

	function oninput(e: Event & { currentTarget: HTMLInputElement }) {
		text = e.currentTarget.value.replace(/\D/g, '').slice(0, maxLength);
		e.currentTarget.value = text;
	}

	function onkeydown(e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		if (e.key === 'Enter') {
			commit();
			editing = true;
			text = pad(value);
			e.currentTarget.select();
		} else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
			e.preventDefault();
			value = clamp(value + (e.key === 'ArrowUp' ? 1 : -1));
			text = pad(value);
			editing = true;
		}
	}
</script>

<input
	{id}
	class="num-field"
	class:error
	type="text"
	inputmode="numeric"
	autocomplete="off"
	aria-label={label}
	aria-invalid={error || undefined}
	{disabled}
	value={display}
	{onfocus}
	{oninput}
	{onkeydown}
	onblur={commit}
/>

<style>
	.num-field {
		width: calc(var(--field-num-width) + var(--space-4) * 2);
		text-align: center;
		font-family: var(--font-digits);
		font-variant-numeric: var(--font-digits-variant);
		font-size: calc(var(--font-size-xl) * 1.4);
		font-weight: var(--font-weight-timer);
		padding-block: var(--space-2);
		border: var(--border-width-strong) solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg);
		color: var(--color-text);
	}
	.num-field:focus {
		outline: var(--focus-ring-width) solid var(--color-focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--color-accent);
	}
	.error {
		border-color: var(--color-danger);
	}
	.num-field:disabled {
		background: var(--color-disabled-bg);
		color: var(--color-disabled-text);
		border-color: var(--color-disabled-bg);
		cursor: not-allowed;
	}
</style>
