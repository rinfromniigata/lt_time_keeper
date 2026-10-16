import { expect, test, type Page } from '@playwright/test';

// v3 のトークン（文字は -text、入力部品の境界は --color-border-input）が、ライト・ダークとも実際に適用されている

async function open(page: Page) {
	// 振動のスイッチは対応端末にだけ出る
	await page.addInitScript(() => {
		(navigator as unknown as { vibrate: () => boolean }).vibrate = () => true;
	});
	await page.clock.install();
	await page.goto('http://localhost:4173/');
	await expect(page.locator('#splash')).toHaveCount(0);
}

async function advance(page: Page, ms: number) {
	const tail = Math.min(ms, 100);
	if (ms > tail) await page.clock.fastForward(ms - tail);
	await page.clock.runFor(tail);
}

// トークンを、計算後の色（color の形式）に解決する
const token = (page: Page, name: string) =>
	page.evaluate((n) => {
		const probe = document.createElement('i');
		probe.style.color = `var(${n})`;
		document.body.append(probe);
		const c = getComputedStyle(probe).color;
		probe.remove();
		return c;
	}, name);

const css = (loc: ReturnType<Page['locator']>, prop: string) =>
	loc.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

for (const scheme of ['light', 'dark'] as const) {
	test.describe(scheme, () => {
		test.beforeEach(async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference' });
		});

		test('S01: ベルの行の補足文は -text、入力欄・プリセット・スイッチ・セグメントの枠は --color-border-input', async ({
			page
		}) => {
			await open(page);
			const border = await token(page, '--color-border-input');

			await expect.poll(async () => css(page.locator('.note.warn'), 'color')).toBe(
				await token(page, '--color-state-warn-text')
			);
			expect(await css(page.locator('.note.over'), 'color')).toBe(await token(page, '--color-state-over-text'));

			expect(await css(page.getByLabel('分', { exact: true }), 'border-top-color')).toBe(border);
			expect(await css(page.getByLabel('表示名'), 'border-top-color')).toBe(border);
			expect(await css(page.getByRole('button', { name: '10分' }), 'border-top-color')).toBe(border);
			await page.getByRole('switch').click(); // オフにすると溝が境界色になる（オンはアクセント色）
			await expect.poll(() => css(page.locator('.switch .track').first(), 'background-color')).toBe(border);

			// パネルの区切りは --color-border のまま
			expect(await css(page.locator('.bell-row').first(), 'border-top-color')).toBe(
				await token(page, '--color-border')
			);

			await page.locator('.bell-row .open').first().click();
			const seg = page.locator('.segmented').first();
			await expect(seg).toBeVisible();
			expect(await css(seg, 'border-top-color')).toBe(border);
			expect(await css(page.locator('.segment').nth(1), 'border-left-color')).toBe(border);
		});

		test('S01a・S03: 持ち時間 0 の枠の色は危険色のまま（境界色に上書きされない）', async ({ page }) => {
			await open(page);
			await page.getByLabel('分', { exact: true }).fill('0');
			await page.getByLabel('秒', { exact: true }).fill('0');
			await page.getByLabel('秒', { exact: true }).press('Enter');
			expect(await css(page.getByLabel('分', { exact: true }), 'border-top-color')).toBe(
				await token(page, '--color-danger')
			);
		});

		test('S03a〜S03c: 状態ラベルと超過の数字は -text、リングは無印、明滅の暗い側は 0.75', async ({ page }) => {
			await open(page);
			await page.getByRole('button', { name: '開始' }).click();
			const pill = page.locator('.state-pill');
			const ring = page.locator('circle.progress');


			// 予鈴（最初のベルの時点）まで進める
			await advance(page, 4 * 60_000);
			await expect(pill).toHaveText('予鈴');
			expect(await css(pill, 'color')).toBe(await token(page, '--color-state-warn-text'));
			await expect.poll(() => css(ring, 'stroke')).toBe(await token(page, '--color-state-warn'));

			// 一時停止中
			await page.keyboard.press('Space');
			await expect(pill).toHaveText('一時停止中');
			expect(await css(pill, 'color')).toBe(await token(page, '--color-state-paused-text'));
			await expect.poll(() => css(ring, 'stroke')).toBe(await token(page, '--color-state-paused'));
			await page.keyboard.press('Space');

			// 超過
			await advance(page, 60_000);
			await expect(pill).toHaveText('超過');
			expect(await css(pill, 'color')).toBe(await token(page, '--color-state-over-text'));
			const digits = page.getByRole('timer');
			expect(await css(digits, 'color')).toBe(await token(page, '--color-state-over-text'));
			await expect.poll(() => css(ring, 'stroke')).toBe(await token(page, '--color-state-over'));

			expect(Number(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--blink-dim-opacity')))).toBe(0.75);
			const dim = await digits.evaluate((el) => {
				const frames = el.getAnimations().flatMap((a) => (a as CSSAnimation).effect!.getKeyframes());
				return String(frames[frames.length - 1].opacity);
			});
			expect(Number(dim)).toBe(0.75);
		});
	});
}
