import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ビルドで集めた依存パッケージの一覧（scripts/oss_collect.ts が書き、routes/oss.json などが書き出し時に読む）。
// サーバー側（書き出し）だけで使う。クライアントには入らない

export interface OssPackage {
	name: string;
	version: string;
	license: string;
	/** LICENSE*・NOTICE* ファイルの全文（複数あればファイル名つきで並べる）。ファイルがなければ空 */
	licenseText: string;
}

export const OSS_PACKAGES_PATH = join('.svelte-kit', 'oss', 'packages.json');

export function readOssPackages(): OssPackage[] {
	const path = join(process.cwd(), OSS_PACKAGES_PATH);
	if (!existsSync(path)) throw new Error(`${OSS_PACKAGES_PATH} がありません。クライアントのビルドが書き出しより先に終わっていません`);
	return JSON.parse(readFileSync(path, 'utf8')) as OssPackage[];
}
