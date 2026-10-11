import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('http://localhost:4173/');
	await expect(page.locator('#splash')).toHaveCount(0);
});

const minutes = (page: import('@playwright/test').Page) => page.getByLabel('分', { exact: true });
const seconds = (page: import('@playwright/test').Page) => page.getByLabel('秒', { exact: true });

test('初期値は 5:00 で、プリセット・増減・直接入力が持ち時間に反映される', async ({ page }) => {
	await expect(minutes(page)).toHaveValue('05');
	await expect(seconds(page)).toHaveValue('00');
	await expect(page.getByText('持ち時間 5:00')).toBeVisible();

	await page.getByRole('button', { name: '10分' }).click();
	await expect(minutes(page)).toHaveValue('10');
	await page.getByRole('button', { name: '1分増やす' }).click();
	await page.getByRole('button', { name: '10秒増やす' }).click();
	await expect(page.getByText('持ち時間 11:10')).toBeVisible();

	await seconds(page).fill('75');
	await seconds(page).press('Enter');
	await expect(seconds(page)).toHaveValue('59');
});

test('0:00 では開始できず理由が出る。上限は 99:59', async ({ page }) => {
	await minutes(page).fill('0');
	await minutes(page).press('Enter');
	await seconds(page).fill('0');
	await seconds(page).press('Enter');
	await expect(page.getByRole('button', { name: '開始' })).toBeDisabled();
	await expect(page.getByText('持ち時間を1秒以上にしてください。')).toBeVisible();
	await expect(page.getByRole('button', { name: '1分減らす' })).toBeDisabled();

	await minutes(page).fill('99');
	await minutes(page).press('Enter');
	await seconds(page).fill('59');
	await seconds(page).press('Enter');
	await expect(page.getByRole('button', { name: '1分増やす' })).toBeDisabled();
	await expect(page.getByRole('button', { name: '10秒増やす' })).toBeDisabled();
	await expect(page.getByRole('button', { name: '開始' })).toBeEnabled();
});

test('設定画面は横スクロールが出ない', async ({ page }) => {
	for (const width of [390, 1280]) {
		await page.setViewportSize({ width, height: 800 });
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
		expect(overflow).toBe(false);
	}
});
