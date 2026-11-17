// 配信物（クライアントのバンドル）に入った依存パッケージを集めて、.svelte-kit/oss/packages.json に書く Vite プラグイン。
// routes/oss.json と routes/third_party_licenses.txt が、書き出し（prerender）のときにこれを読む（imple §3.11）
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { OSS_PACKAGES_PATH, type OssPackage } from '../src/lib/oss/packages.ts';



const NODE_MODULES = /[\\/]node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)[\\/]/g;
const LICENSE_FILE = /^(licen[sc]e|notice)([.\-_].*)?$/i;

/** モジュールの ID（絶対パス）から、node_modules の中のパッケージのルートを取り出す（入れ子は一番内側） */
export function packageRootOf(id: string): string | undefined {
	const clean = id.split('?')[0];
	let last: { root: string } | undefined;
	for (const m of clean.matchAll(NODE_MODULES)) {
		last = { root: clean.slice(0, m.index + m[0].length - 1) };
	}
	return last?.root;
}

function licenseName(pkg: { license?: unknown; licenses?: unknown }): string {
	const one = (l: unknown): string | undefined =>
		typeof l === 'string' ? l : typeof (l as { type?: unknown })?.type === 'string' ? (l as { type: string }).type : undefined;
	const single = one(pkg.license);
	if (single) return single;
	if (Array.isArray(pkg.licenses)) {
		const names = pkg.licenses.map(one).filter((s): s is string => !!s);
		if (names.length) return names.join(' OR ');
	}
	return '';
}

export function readPackage(root: string, warn: (message: string) => void): OssPackage | undefined {
	const manifestPath = join(root, 'package.json');
	if (!existsSync(manifestPath)) return undefined;
	const pkg = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
		name?: string;
		version?: string;
		license?: unknown;
		licenses?: unknown;
	};
	if (!pkg.name) return undefined;
	const files = readdirSync(root, { withFileTypes: true })
		.filter((e) => e.isFile() && LICENSE_FILE.test(e.name))
		.map((e) => e.name)
		.sort();
	const texts = files.map((f) => {
		const body = readFileSync(join(root, f), 'utf8').replace(/\r\n/g, '\n').trim();
		return files.length > 1 ? `[${f}]\n${body}` : body;
	});
	const license = licenseName(pkg) || 'UNKNOWN';
	if (texts.length === 0) warn(`${pkg.name}@${pkg.version ?? '?'}: ライセンスのファイルがありません（${license}）`);
	return { name: pkg.name, version: pkg.version ?? '', license, licenseText: texts.join('\n\n') };
}

export function ossCollect(): Plugin {
	return {
		name: 'lt-time-keeper:oss-collect',
		apply: 'build',
		generateBundle(_options, bundle) {
			// クライアントのビルドだけが対象（サーバー側と Service Worker は配信物の依存ではない）
			if (this.environment?.name !== 'client') return;
			const roots = new Set<string>();
			for (const item of Object.values(bundle)) {
				if (item.type !== 'chunk') continue;
				for (const id of Object.keys(item.modules)) {
					if (id.startsWith('\0')) continue;
					const root = packageRootOf(id);
					if (root) roots.add(root);
				}
			}
			const byKey = new Map<string, OssPackage>();
			for (const root of roots) {
				const pkg = readPackage(root, (m) => this.warn(m));
				if (pkg) byKey.set(`${pkg.name}@${pkg.version}`, pkg);
			}
			const packages = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
			const out = resolve(OSS_PACKAGES_PATH);
			mkdirSync(dirname(out), { recursive: true });
			writeFileSync(out, JSON.stringify(packages, null, '\t'));
		}
	};
}
