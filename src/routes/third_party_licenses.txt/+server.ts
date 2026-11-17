import { dev } from '$app/env';
import { readOssPackages } from '#lib/oss/packages.ts';

export const prerender = true;

// 配信物に入っているオープンソースソフトウェアのライセンス表記（著作権表示を含む全文）。書き出し時に作る
export function GET() {
	const packages = dev ? [] : readOssPackages();
	const body = packages
		.map((p) => `${p.name} ${p.version}\nLicense: ${p.license}\n\n${p.licenseText || '(ライセンスのファイルは含まれていません)'}`)
		.join(`\n\n${'='.repeat(72)}\n\n`);
	return new Response(`${body}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
