import { expect, test, type Page } from '@playwright/test';

async function open(page: Page) {
	await page.clock.install();
	await page.goto('http://localhost:4173/');
	await expect(page.locator('#splash')).toHaveCount(0);
}

// 長い時間は runFor だと全フレームを再生して遅いので、飛ばしてから少しだけ進めて描画させる
async function advance(page: Page, ms: number) {
	const tail = Math.min(ms, 100);
	if (ms > tail) await page.clock.fastForward(ms - tail);
	await page.clock.runFor(tail);
}

const digits = (page: Page) => page.getByRole('timer');

test('開始すると数字・リング・経過が進み、5:00 経過で +0:00 の超過になる', async ({ page }) => {
	await open(page);
	await page.getByRole('button', { name: '開始' }).click();
	await expect(digits(page)).toHaveText('5:00');
	await expect(page.getByText('経過 0:00 ／ 5:00')).toBeVisible();

	await advance(page, 108_000);
	await expect(digits(page)).toHaveText('3:12');
	await expect(page.getByText('経過 1:48 ／ 5:00')).toBeVisible();

	await advance(page, 191_000); // 経過 4:59 → 残り 0:01
	await expect(digits(page)).toHaveText('0:01');
	await advance(page, 1_000);
	await expect(digits(page)).toHaveText('+0:00');
	await expect(page.getByText('超過', { exact: true })).toBeVisible();
	await advance(page, 42_000);
	await expect(digits(page)).toHaveText('+0:42');
});

test('「視差効果を減らす」では超過で明滅しない', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await open(page);
	await page.getByRole('button', { name: '開始' }).click();
	await advance(page, 301_000);
	await expect(digits(page)).toHaveText('+0:01');
	expect(await digits(page).evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

test('超過では明滅する', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await open(page);
	await page.getByRole('button', { name: '開始' }).click();
	await advance(page, 301_000);
	expect(await digits(page).evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none');
});

test('Space で一時停止・再開でき、一時停止中は「再開」が主ボタンになる', async ({ page }) => {
	await open(page);
	await page.getByRole('button', { name: '開始' }).click();
	await advance(page, 10_000);
	await page.keyboard.press('Space');
	await expect(page.getByText('一時停止中', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '再開' })).toBeVisible();
	await advance(page, 60_000);
	await expect(digits(page)).toHaveText('4:50');
	await page.keyboard.press('Space');
	await expect(page.getByRole('button', { name: '一時停止' })).toBeVisible();
	await advance(page, 5_000);
	await expect(digits(page)).toHaveText('4:45');
});

test('Esc で確認が出て「続ける」にフォーカスがあり、確認中も進む。Esc で閉じ、Enter で S01 に戻り値が残る', async ({
	page
}) => {
	await open(page);
	await page.getByRole('button', { name: '10分' }).click();
	await page.getByLabel('表示名').fill('LT');
	await page.getByRole('button', { name: '開始' }).click();
	await expect(page.getByText('LT', { exact: true })).toBeVisible();

	await advance(page, 10_000);
	await page.keyboard.press('Escape');
	const dialog = page.getByRole('alertdialog');
	await expect(dialog).toBeVisible();
	await expect(page.getByRole('button', { name: '続ける' })).toBeFocused();
	await advance(page, 5_000);
	await expect(digits(page)).toHaveText('9:45');

	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);

	await page.keyboard.press('Escape');
	await expect(dialog).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name: '開始' })).toBeVisible();
	await expect(page.getByLabel('分', { exact: true })).toHaveValue('10');
	await expect(page.getByLabel('表示名')).toHaveValue('LT');
});

test('確認で「続ける」を Enter しても終了せず、「終了」ボタンからも確認が出る', async ({ page }) => {
	await open(page);
	await page.getByRole('button', { name: '開始' }).click();
	await page.getByRole('button', { name: '終了' }).click();
	await expect(page.getByRole('alertdialog')).toBeVisible();
	await page.getByRole('button', { name: '続ける' }).click();
	await expect(page.getByRole('alertdialog')).toHaveCount(0);
	await expect(digits(page)).toBeVisible();
});

test('390px と 1280px で横スクロールが出ず、広い画面でだけキー操作の案内が出る', async ({ page }) => {
	await open(page);
	await page.getByRole('button', { name: '開始' }).click();
	for (const [width, hints] of [
		[390, false],
		[1280, true]
	] as const) {
		await page.setViewportSize({ width, height: 800 });
		expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
		const hint = page.getByText('一時停止・再開');
		if (hints) await expect(hint).toBeVisible();
		else await expect(hint).toBeHidden();
	}
});
