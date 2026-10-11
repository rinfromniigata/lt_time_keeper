<script lang="ts">
	import '#lib/theme/tokens.css';
	import '#lib/theme/base.css';
	import '#lib/theme/splash.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

{@render children()}
