import { json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { readOssPackages } from '#lib/oss/packages.ts';

export const prerender = true;

// 使用しているオープンソースソフトウェアの一覧（名前の順）。書き出し時に、ビルドで集めた packages.json から作る。
// 開発サーバーではビルドがないので、空の一覧を返す
export function GET() {
	const packages = dev ? [] : readOssPackages();
	return json(packages.map(({ name, version, license }) => ({ name, version, license })));
}
