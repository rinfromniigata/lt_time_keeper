import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(root + path);

function latestMaster(): string {
	const found = readdirSync(root + 'roadmap/specs')
		.map((name) => ({ name, m: /_icon_master_v(\d+)\.svg$/.exec(name) }))
		.filter((x) => x.m)
		.sort((a, b) => Number(b.m![1]) - Number(a.m![1]));
	return `roadmap/specs/${found[0].name}`;
}

const masterText = read(latestMaster()).toString('utf8');
const render = (svg: string, width: number) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render();

/** PNG のヘッダー（IHDR）から幅と高さを読む */
function pngSize(file: Buffer): [number, number] {
	expect(file.subarray(1, 4).toString('latin1')).toBe('PNG');
	return [file.readUInt32BE(16), file.readUInt32BE(20)];
}

describe('生成したアイコン（static/icons）', () => {
	it.each([
		['favicon-32.png', 32, 32],
		['apple-touch-icon.png', 180, 180],
		['icon-192.png', 192, 192],
		['icon-512.png', 512, 512],
		['icon-maskable-512.png', 512, 512],
		['og.png', 1200, 630]
	])('%s の寸法は %i×%i', (name, width, height) => {
		expect(pngSize(read(`static/icons/${name}`))).toEqual([width, height]);
	});

	it('favicon.svg は specs の最新のマスターSVGと一致する', () => {
		expect(read('static/icons/favicon.svg').toString('utf8')).toBe(masterText);
	});

	it('maskable は、マスターを拡大・移動せず描いたもの（通常版と同じ）', () => {
		const maskable = read('static/icons/icon-maskable-512.png');
		expect(maskable.equals(read('static/icons/icon-512.png'))).toBe(true);
		expect(maskable.equals(Buffer.from(render(masterText, 512).asPng()))).toBe(true);
	});

	it('モチーフは maskable の安全領域（中央の直径80%の円）に収まる', () => {
		// 背景の rect を取り除いて、モチーフだけを描く
		const motifOnly = masterText.replace(/<rect[^>]*\/>/, '');
		expect(motifOnly).not.toBe(masterText);
		const size = 512;
		const image = render(motifOnly, size);
		const pixels = image.pixels;
		const safeRadius = (size * 0.8) / 2;
		const center = size / 2;

		let drawn = 0;
		let farthest = 0;
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				if (pixels[(y * size + x) * 4 + 3] === 0) continue;
				drawn++;
				// ピクセルの外側の角までの距離で測る
				const dx = Math.abs(x + 0.5 - center) + 0.5;
				const dy = Math.abs(y + 0.5 - center) + 0.5;
				farthest = Math.max(farthest, Math.hypot(dx, dy));
			}
		}
		expect(drawn).toBeGreaterThan(0);
		expect(farthest).toBeLessThanOrEqual(safeRadius);
	});
});

describe('manifest.webmanifest', () => {
	const manifest = JSON.parse(read('static/manifest.webmanifest').toString('utf8')) as {
		id: string;
		icons: { src: string; purpose: string }[];
	};

	it('id は com.rinontech.lt-time-keeper', () => {
		expect(manifest.id).toBe('com.rinontech.lt-time-keeper');
	});

	it('参照するアイコンがすべて存在する', () => {
		for (const icon of manifest.icons) {
			expect(() => read(`static${icon.src}`)).not.toThrow();
		}
	});
});
