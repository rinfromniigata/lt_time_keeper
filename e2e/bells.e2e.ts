import { expect, test, type Page } from '@playwright/test';

async function open(page: Page) {
	await page.goto('http://localhost:4173/');
	await expect(page.locator('#splash')).toHaveCount(0);
}

const rows = (page: Page) => page.locator('.bell-row');
const sheet = (page: Page) => page.getByRole('dialog');
const minutes = (page: Page) => page.getByRole('dialog').getByLabel('分', { exact: true });
const seconds = (page: Page) => page.getByRole('dialog').getByLabel('秒', { exact: true });
const mainMinutes = (page: Page) => page.locator('#duration-min');
const mainSeconds = (page: Page) => page.locator('#duration-sec');
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('初期のベルは1鈴〜3鈴で、補足文・回数・件数・開始バーの件数が出る', async ({ page }) => {
	await open(page);
	await expect(rows(page)).toHaveCount(3);
	await expect(rows(page).nth(0)).toContainText('1鈴');
	await expect(rows(page).nth(0)).toContainText('残り 1:00');
	await expect(rows(page).nth(0)).toContainText('ここで黄（予鈴）に');
	await expect(rows(page).nth(1)).toContainText('残り 0:00');
	await expect(rows(page).nth(1)).toContainText('ここで赤（超過）に');
	await expect(rows(page).nth(2)).toContainText('超過 +1:00');
	await expect(rows(page).nth(2)).toContainText('—');
	await expect(rows(page).nth(2).getByRole('img', { name: '3回' })).toBeVisible();
	await expect(page.getByText('3件', { exact: true })).toBeVisible();
	await expect(page.getByText('持ち時間 5:00 ／ ベル 3件')).toBeVisible();
});

test('追加：決定で増え、4件以上は数字の番号になり、時刻順に並ぶ。キャンセルでは変わらない', async ({ page }) => {
	await open(page);
	await button(page, 'ベルを追加').click();
	await expect(sheet(page)).toBeVisible();
	await expect(sheet(page).getByRole('heading', { name: 'ベルを追加' })).toBeVisible();
	await expect(sheet(page).getByRole('button', { name: '削除', exact: true })).toHaveCount(0);

	// キャンセル
	await minutes(page).fill('3');
	await button(page, 'キャンセル').click();
	await expect(sheet(page)).toHaveCount(0);
	await expect(rows(page)).toHaveCount(3);

	// 追加：残り 5:00（持ち時間と同じ＝開始と同時に鳴る）・2回
	await button(page, 'ベルを追加').click();
	await minutes(page).fill('5');
	await minutes(page).press('Enter');
	await seconds(page).fill('0');
	await seconds(page).press('Enter');
	await sheet(page).getByRole('radio', { name: '2回' }).click();
	await button(page, '決定').click();
	await expect(rows(page)).toHaveCount(4);
	await expect(rows(page).nth(0)).toContainText('残り 5:00');
	await expect(rows(page).nth(0)).toContainText('ここで黄（予鈴）に');
	await expect(rows(page).nth(0).locator('.badge')).toHaveText('1');
	await expect(rows(page).nth(3).locator('.badge')).toHaveText('4');
	await expect(rows(page).nth(1)).not.toContainText('ここで黄（予鈴）に');
	await expect(page.getByText('4件', { exact: true })).toBeVisible();
	await expect(page.getByText('持ち時間 5:00 ／ ベル 4件')).toBeVisible();
});

test('編集：値を変えて決定すると行が更新され、並びが変わる。取りやめでは変わらない', async ({ page }) => {
	await open(page);
	await rows(page).nth(0).getByRole('button', { name: /1鈴/ }).first().click();
	await expect(sheet(page).getByRole('heading', { name: '1鈴を編集' })).toBeVisible();
	await expect(minutes(page)).toHaveValue('01');
	await expect(sheet(page).getByRole('radio', { name: '残り' })).toHaveAttribute('aria-checked', 'true');

	await page.keyboard.press('Escape');
	await expect(sheet(page)).toHaveCount(0);
	await expect(rows(page).nth(0)).toContainText('残り 1:00');

	await rows(page).nth(0).getByRole('button', { name: /1鈴/ }).first().click();
	await minutes(page).fill('2');
	await minutes(page).press('Enter');
	await sheet(page).getByRole('radio', { name: '3回' }).click();
	await button(page, '決定').click();
	await expect(rows(page).nth(0)).toContainText('残り 2:00');
	await expect(rows(page).nth(0).getByRole('img', { name: '3回' })).toBeVisible();

	// 超過後に変えると、最後に並ぶ
	await rows(page).nth(0).getByRole('button', { name: /残り 2:00/ }).click();
	await sheet(page).getByRole('radio', { name: '超過後' }).click();
	await minutes(page).fill('9');
	await minutes(page).press('Enter');
	await button(page, '決定').click();
	await expect(rows(page).nth(2)).toContainText('超過 +9:00');
	await expect(rows(page).nth(0)).toContainText('残り 0:00');
});

test('削除：シートの削除と行の × で消え、番号が1鈴〜に戻る。0件で空の状態になり、開始できる', async ({ page }) => {
	await open(page);
	await button(page, 'ベルを追加').click();
	await button(page, '決定').click();
	await expect(rows(page)).toHaveCount(4);

	// シートの削除
	await rows(page).nth(0).getByRole('button', { name: /残り 1:00/ }).click();
	await sheet(page).getByRole('button', { name: '削除', exact: true }).click();
	await expect(rows(page)).toHaveCount(3);
	await expect(rows(page).nth(0).locator('.badge')).toHaveText('1鈴');

	// 行の ×
	await rows(page).nth(0).getByRole('button', { name: /を削除/ }).click();
	await rows(page).nth(0).getByRole('button', { name: /を削除/ }).click();
	await rows(page).nth(0).getByRole('button', { name: /を削除/ }).click();
	await expect(rows(page)).toHaveCount(0);
	await expect(page.getByText('ベルがありません。音は鳴らさず、時間と色だけで知らせます。')).toBeVisible();
	await expect(page.getByText('0件', { exact: true })).toBeVisible();
	await expect(page.getByText('持ち時間 5:00 ／ ベルなし')).toBeVisible();
	await expect(button(page, '開始')).toBeEnabled();

	// 空の状態からも追加できる
	await button(page, 'ベルを追加').click();
	await button(page, '決定').click();
	await expect(rows(page)).toHaveCount(1);
});

test('鳴らないベルは行に警告が出るだけで、開始は止まらない', async ({ page }) => {
	await open(page);
	await mainMinutes(page).fill('0');
	await mainMinutes(page).press('Enter');
	await mainSeconds(page).fill('30');
	await mainSeconds(page).press('Enter');
	// 残り 1:00 は持ち時間 0:30 より長い
	await expect(rows(page).nth(0)).toContainText('残り 1:00');
	await expect(rows(page).nth(0)).toContainText('持ち時間より長いため鳴りません');
	await expect(rows(page).nth(1)).toContainText('残り 0:00');
	await expect(rows(page).nth(1)).toContainText('ここで赤（超過）に');
	await expect(rows(page).nth(1)).not.toContainText('ここで黄（予鈴）に');
	await expect(button(page, '開始')).toBeEnabled();
	const border = await rows(page).nth(0).evaluate((el) => getComputedStyle(el).borderTopColor);
	const normal = await rows(page).nth(2).evaluate((el) => getComputedStyle(el).borderTopColor);
	expect(border).not.toBe(normal);
});

test('追加の初期値は、持ち時間より長い「残り」にならない', async ({ page }) => {
	await open(page);
	await mainMinutes(page).fill('0');
	await mainMinutes(page).press('Enter');
	await mainSeconds(page).fill('20');
	await mainSeconds(page).press('Enter');
	await button(page, 'ベルを追加').click();
	await expect(mainMinutes(page)).toHaveValue('00');
	await expect(seconds(page)).toHaveValue('20');
});

test('「鳴らしてみる」で、音量をかけたベル音が1回鳴る', async ({ page }) => {
	await page.addInitScript(() => {
		const w = window as unknown as Record<string, unknown>;
		const log = { oscillators: 0, resumed: 0, gains: [] as number[] };
		w.__audio = log;
		class FakeContext {
			state = 'suspended';
			currentTime = 0;
			destination = {};
			createGain() {
				const gain = {
					value: 0,
					setValueAtTime(v: number) {
						log.gains.push(v);
					},
					linearRampToValueAtTime() {},
					exponentialRampToValueAtTime() {}
				};
				return { gain, connect: () => ({ connect() {} }) };
			}
			createOscillator() {
				log.oscillators++;
				return { type: '', frequency: { value: 0 }, connect: () => ({ connect() {} }), start() {}, stop() {} };
			}
			async resume() {
				log.resumed++;
				this.state = 'running';
			}
		}
		w.AudioContext = FakeContext;
	});
	await open(page);
	const slider = page.getByRole('slider', { name: '音量' });
	await slider.focus();
	await page.keyboard.press('Home');
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('ArrowRight');
	await button(page, '鳴らしてみる').click();
	await expect.poll(() => page.evaluate(() => (window as unknown as { __audio: { oscillators: number } }).__audio.oscillators)).toBe(3);
	const gains = await page.evaluate(() => (window as unknown as { __audio: { gains: number[] } }).__audio.gains);
	expect(gains.some((g) => Math.abs(g - 0.02) < 1e-9)).toBe(true);
	await button(page, '鳴らしてみる').click();
	await expect.poll(() => page.evaluate(() => (window as unknown as { __audio: { oscillators: number } }).__audio.oscillators)).toBe(6);
});

test('振動のスイッチは、振動に対応した端末でだけ出る', async ({ browser }) => {
	const supported = await browser.newPage();
	await supported.addInitScript(() => {
		Object.defineProperty(Navigator.prototype, 'vibrate', { value: () => true, configurable: true, writable: true });
	});
	await open(supported);
	const sw = supported.getByRole('switch', { name: 'ベルと同時に振動する' });
	await expect(sw).toBeVisible();
	await expect(sw).toHaveAttribute('aria-checked', 'true');
	await sw.click();
	await expect(sw).toHaveAttribute('aria-checked', 'false');
	await supported.close();

	const unsupported = await browser.newPage();
	await unsupported.addInitScript(() => {
		delete (Navigator.prototype as unknown as Record<string, unknown>).vibrate;
	});
	await open(unsupported);
	await expect(unsupported.getByText('ベルと同時に振動する')).toHaveCount(0);
	await unsupported.close();
});

test('パネルの並びは、狭い画面で 持ち時間・ベル・音・表示名、広い画面で左 持ち時間・表示名／右 ベル・音', async ({ page }) => {
	await open(page);
	const pos = async (name: string) => {
		const box = await page.getByRole('heading', { name, exact: true }).boundingBox();
		return box!;
	};
	await page.setViewportSize({ width: 390, height: 800 });
	const n = { time: await pos('持ち時間'), bell: await pos('ベル'), sound: await pos('音'), title: await pos('表示名') };
	expect(n.time.y).toBeLessThan(n.bell.y);
	expect(n.bell.y).toBeLessThan(n.sound.y);
	expect(n.sound.y).toBeLessThan(n.title.y);

	await page.setViewportSize({ width: 1280, height: 800 });
	const w = { time: await pos('持ち時間'), bell: await pos('ベル'), sound: await pos('音'), title: await pos('表示名') };
	expect(w.time.x).toBeLessThan(w.bell.x);
	expect(w.title.x).toBe(w.time.x);
	expect(w.title.y).toBeGreaterThan(w.time.y);
	expect(w.sound.x).toBe(w.bell.x);
	expect(w.sound.y).toBeGreaterThan(w.bell.y);
});

test('ベルが多くても長い表示名でも、横スクロールは出ない。シートは狭い画面で下端、広い画面で中央', async ({ page }) => {
	await open(page);
	for (let i = 0; i < 5; i++) {
		await button(page, 'ベルを追加').click();
		await button(page, '決定').click();
	}
	await expect(rows(page)).toHaveCount(8);
	await page.getByLabel('表示名').fill('基調講演「小さなチームで続けるプロダクト開発 ── 10年分の失敗とそこから学んだ設計の習慣について」');
	for (const width of [390, 1280]) {
		await page.setViewportSize({ width, height: 720 });
		expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
	}

	await page.setViewportSize({ width: 390, height: 720 });
	await rows(page).nth(0).getByRole('button', { name: /残り/ }).first().click();
	let box = (await sheet(page).boundingBox())!;
	expect(Math.abs(box.y + box.height - 720)).toBeLessThan(2);
	await page.keyboard.press('Escape');

	await page.setViewportSize({ width: 1280, height: 720 });
	await rows(page).nth(0).getByRole('button', { name: /残り/ }).first().click();
	box = (await sheet(page).boundingBox())!;
	expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThan(2);
	expect(Math.abs(box.y + box.height / 2 - 360)).toBeLessThan(2);
});
