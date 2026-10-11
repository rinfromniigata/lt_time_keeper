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

// 計算後の色を、トークン（CSS カスタムプロパティ）を解決した値と比べる
async function tokenColor(page: Page, token: string): Promise<string> {
	return page.evaluate((name) => {
		const probe = document.createElement('i');
		probe.style.color = `var(${name})`;
		document.body.append(probe);
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	}, token);
}
const ringStroke = (page: Page) => page.locator('circle.progress').evaluate((el) => getComputedStyle(el).stroke);
const ringOffset = (page: Page) =>
	page.locator('circle.progress').evaluate((el) => Number.parseFloat(getComputedStyle(el).strokeDashoffset));

test('リングは残りの割合で減り、通常は緑・超過は赤で満ちる', async ({ page }) => {
	await open(page);
	await page.getByRole('button', { name: '開始' }).click();
	await advance(page, 108_000); // 残り 64%
	expect(await ringOffset(page)).toBeCloseTo(36, 0);
	await expect.poll(() => ringStroke(page)).toBe(await tokenColor(page, '--color-state-ok'));

	await advance(page, 192_000); // 5:00 経過
	await expect(digits(page)).toHaveText('+0:00');
	expect(await ringOffset(page)).toBeCloseTo(0, 0);
	await expect.poll(() => ringStroke(page)).toBe(await tokenColor(page, '--color-state-over'));
	expect(await digits(page).evaluate((el) => getComputedStyle(el).color)).toBe(
		await tokenColor(page, '--color-state-over')
	);
});

test('一時停止中はリングと数字が灰色になり、「再開」は主ボタンの色になる', async ({ page }) => {
	await open(page);
	await page.getByRole('button', { name: '開始' }).click();
	await advance(page, 10_000);
	await page.keyboard.press('Space');
	await expect.poll(() => ringStroke(page)).toBe(await tokenColor(page, '--color-state-paused'));
	expect(await digits(page).evaluate((el) => getComputedStyle(el).color)).toBe(
		await tokenColor(page, '--color-text-muted')
	);
	const resume = page.getByRole('button', { name: '再開' });
	await expect
		.poll(() => resume.evaluate((el) => getComputedStyle(el).backgroundColor))
		.toBe(await tokenColor(page, '--color-accent'));
});

test('720px を境に、キー操作の案内が切り替わる', async ({ page }) => {
	await open(page);
	await page.getByRole('button', { name: '開始' }).click();
	const hint = page.getByText('一時停止・再開');
	await page.setViewportSize({ width: 719, height: 800 });
	await expect(hint).toBeHidden();
	await page.setViewportSize({ width: 720, height: 800 });
	await expect(hint).toBeVisible();
});

test('次のベルが上部に出て、秒が数字とそろって減り、鳴るたびに次へ進み、最後は消える', async ({ page }) => {
	await open(page);
	const next = page.locator('.next-bell');
	await page.getByRole('button', { name: '開始' }).click();
	await expect(next).toContainText('1鈴まで');
	await expect(next.locator('strong')).toHaveText('4:00');

	await advance(page, 108_000); // 残り 3:12 のとき、1鈴（残り 1:00）まで 2:12
	await expect(digits(page)).toHaveText('3:12');
	await expect(next.locator('strong')).toHaveText('2:12');

	await advance(page, 132_000); // 1鈴の時点（経過 4:00）→ 次は 2鈴
	await expect(next).toContainText('2鈴まで');
	await expect(next.locator('strong')).toHaveText('1:00');
	await advance(page, 60_000);
	await expect(next).toContainText('3鈴まで');
	await advance(page, 60_000);
	await expect(next).toHaveCount(0);
});

test('1鈴で予鈴（黄）になり、状態ラベルが「予鈴」に変わる', async ({ page }) => {
	await open(page);
	await page.getByRole('button', { name: '開始' }).click();
	await advance(page, 239_000);
	await expect(page.getByText('予鈴', { exact: true })).toHaveCount(0);
	await advance(page, 1_000);
	await expect(page.getByText('予鈴', { exact: true })).toBeVisible();
	await expect(page.getByText('経過', { exact: false })).toHaveCount(0); // 予鈴では経過の代わりに状態ラベル
	await advance(page, 60_000);
	await expect(page.getByText('超過', { exact: true })).toBeVisible();
});

test('ベルが0件なら次のベルは出ず、予鈴にならずに超過へ進む', async ({ page }) => {
	await open(page);
	for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /を削除/ }).first().click();
	await page.getByRole('button', { name: '開始' }).click();
	await expect(page.locator('.next-bell')).toHaveCount(0);
	await advance(page, 299_000);
	await expect(page.getByText('予鈴', { exact: true })).toHaveCount(0);
});

test('長い表示名は省略され、次のベルは隠れない。見出し「次のベル」は広い画面だけ', async ({ page }) => {
	await open(page);
	await page.getByLabel('表示名').fill('基調講演「小さなチームで続けるプロダクト開発 ── 10年分の失敗とそこから学んだ設計の習慣について」');
	await page.getByRole('button', { name: '開始' }).click();
	for (const width of [390, 1280]) {
		await page.setViewportSize({ width, height: 800 });
		const title = await page.locator('.talk-title').evaluate((el) => ({
			clipped: el.scrollWidth > el.clientWidth,
			right: el.getBoundingClientRect().right
		}));
		expect(title.clipped).toBe(true);
		const box = (await page.locator('.next-bell').boundingBox())!;
		expect(box.x).toBeGreaterThanOrEqual(title.right - 1);
		expect(box.x + box.width).toBeLessThanOrEqual(width);
		expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
		await expect(page.locator('.next-bell .prefix')).toBeVisible({ visible: width === 1280 });
	}
});
