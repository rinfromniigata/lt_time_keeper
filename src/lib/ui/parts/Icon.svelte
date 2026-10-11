<script lang="ts" module>
	export type IconName =
		| 'pause'
		| 'play'
		| 'stop'
		| 'full'
		| 'plus'
		| 'minus'
		| 'x'
		| 'bell'
		| 'alert'
		| 'back'
		| 'moon'
		| 'github';
</script>

<script lang="ts">
	// 塗りのアイコン（再生・一時停止・停止）は filled を付ける
	let { name, filled = false }: { name: IconName; filled?: boolean } = $props();
</script>

<svg class="icon" class:filled aria-hidden="true" focusable="false"><use href="#i-{name}" /></svg>

<style>
	.icon {
		width: var(--icon-size);
		height: var(--icon-size);
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.filled {
		fill: currentColor;
		stroke: none;
	}
</style>
