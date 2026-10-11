// マスターSVGからアイコン一式・OGP画像・manifest.webmanifest を生成する（生成物はリポジトリに含める。CI では実行しない）
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = fileURLToPath(new URL('..', import.meta.url));
const specsDir = join(root, 'roadmap', 'specs');
const outDir = join(root, 'static', 'icons');

function latest(suffix: RegExp): string {
	const found = readdirSync(specsDir)
		.map((name) => ({ name, m: suffix.exec(name) }))
		.filter((x) => x.m)
		.sort((a, b) => Number(b.m![1]) - Number(a.m![1]));
	if (!found.length) throw new Error(`roadmap/specs/ に ${suffix} に合うファイルがありません`);
	return join(specsDir, found[0].name);
}

const masterPath = latest(/_icon_master_v(\d+)\.svg$/);
const tokensPath = latest(/_tokens_v(\d+)\.css$/);
const master = readFileSync(masterPath, 'utf8');

/** 全面を塗る背景の色（マスターSVGの最初の rect の fill） */
const masterBg = /<rect[^>]*\sfill="([^"]+)"/.exec(master)?.[1];
if (!masterBg) throw new Error('マスターSVGから背景色を読み取れませんでした');

/** ダーク側（`:root[data-theme="dark"]`）の変数を読む。manifest の色はテーマで切り替えられないため、アイコンと同じ墨色側にそろえる */
function darkToken(name: string): string {
	const css = readFileSync(tokensPath, 'utf8');
	const block = /:root\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(css)?.[1];
	const value = block && new RegExp(String.raw`${name}:\s*([^;\s]+)`).exec(block)?.[1];
	if (!value) throw new Error(`トークン ${name} をダーク側から読み取れませんでした`);
	return value;
}

const png = (svg: string, width: number) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();

mkdirSync(outDir, { recursive: true });
const write = (name: string, data: Uint8Array) => writeFileSync(join(outDir, name), data);

copyFileSync(masterPath, join(outDir, 'favicon.svg'));
write('favicon-32.png', png(master, 32));
write('apple-touch-icon.png', png(master, 180));
write('icon-192.png', png(master, 192));
write('icon-512.png', png(master, 512));
// マスターは全面塗りで、モチーフが安全領域の内側にある。拡大・移動せずそのまま使う
write('icon-maskable-512.png', png(master, 512));

// OGP 画像（1200×630）。地はマスターの背景色、アイコンは中央に置く
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const masterUri = `data:image/svg+xml;base64,${Buffer.from(master).toString('base64')}`;
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${masterBg}"/>
  <image href="${masterUri}" x="${(OG_WIDTH - OG_HEIGHT) / 2}" y="0" width="${OG_HEIGHT}" height="${OG_HEIGHT}"/>
</svg>`;
write('og.png', png(og, OG_WIDTH));

const manifest = {
	name: 'LTタイムキーパー',
	short_name: 'LTタイマー',
	description: 'LTやプレゼンテーションの持ち時間を計り、ベルで知らせるタイムキーパー',
	lang: 'ja',
	start_url: '/',
	scope: '/',
	display: 'standalone',
	background_color: darkToken('--color-bg'),
	theme_color: darkToken('--color-bg'),
	icons: [
		{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
		{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
		{ src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
		{ src: '/icons/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
	]
};
writeFileSync(join(root, 'static', 'manifest.webmanifest'), JSON.stringify(manifest, null, '\t') + '\n');

console.log(`gen:icons OK (${masterPath.slice(root.length)})`);
