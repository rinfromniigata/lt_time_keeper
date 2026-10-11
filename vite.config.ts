import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };
// Service Worker のキャッシュ名に使う。SemVer を含めつつ、同じ版の再デプロイでも更新を検知できるようビルド時刻を足す
const appVersion = `${pkg.version}+${Date.now().toString(36)}`;

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ pages: 'build', assets: 'build' }),
			version: { name: appVersion }
		})
	],
	test: {
		expect: { requireAssertions: true },
		passWithNoTests: true,
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
