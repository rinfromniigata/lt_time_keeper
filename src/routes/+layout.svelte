<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import '#lib/theme/tokens.css';
	import '#lib/theme/base.css';
	import '#lib/theme/splash.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
