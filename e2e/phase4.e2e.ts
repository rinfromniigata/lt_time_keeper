import { expect, test, type Page } from '@playwright/test';

async function open(page: Page) {
	await page.clock.install();
	await page.goto('http://localhost:4173/');
	await expect(page.locator('#splash')).toHaveCount(0);
}

async function advance(page: Page, ms: number) {
	const tail = Math.min(ms, 100);
	if (ms > tail) await page.clock.fastForward(ms - tail);
	await page.clock.runFor(tail);
}

const digits = (page: Page) => page.getByRole('timer');
const controls = (page: Page) => page.locator('.controls');
const hints = (page: Page) => page.locator('.kbd-hints');
const start = async (page: Page) => {
	await page.getByRole('button', { name: '開始' }).click();
	await expect(digits(page)).toBeVisible();
};

/** --controls-hide-delay をミリ秒で読む */
const hideDelayMs = (page: Page) =>
	page.evaluate(() => {
		const raw = getComputedStyle(document.documentElement).getPropertyValue('--controls-hide-delay').trim();
		return raw.endsWith('ms') ? parseFloat(raw) : parseFloat(raw) * 1000;
	});

test.describe('W4-1 操作ボタンを隠す', () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	test('時間がたつと隠れ（位置は動かない）、カーソルも隠れ、マウス・キー・押下で戻る', async ({ page }) => {
		await open(page);
		await start(page);
		const delay = await hideDelayMs(page);
		expect(delay).toBeGreaterThan(0);
		const before = await digits(page).boundingBox();
		await expect(controls(page)).toHaveCSS('visibility', 'visible');

		await advance(page, delay - 500);
		await expect(controls(page)).toHaveCSS('visibility', 'visible'); // まだ隠れない
		await advance(page, 600);
		await expect(controls(page)).toHaveCSS('visibility', 'hidden');
		await expect(hints(page)).toHaveCSS('visibility', 'hidden');
		await expect(page.locator('.timer')).toHaveCSS('cursor', 'none');
		expect(await digits(page).boundingBox()).toEqual(before);

		await page.mouse.move(300, 300);
		await expect(controls(page)).toHaveCSS('visibility', 'visible');
		await expect(page.locator('.timer')).not.toHaveCSS('cursor', 'none');

		await advance(page, delay + 100);
		await expect(controls(page)).toHaveCSS('visibility', 'hidden');
		await page.keyboard.press('a');
		await expect(controls(page)).toHaveCSS('visibility', 'visible');

		await advance(page, delay + 100);
		await expect(controls(page)).toHaveCSS('visibility', 'hidden');
		await page.mouse.down();
		await page.mouse.up();
		await expect(controls(page)).toHaveCSS('visibility', 'visible');
	});

	test('隠しているあいだだけ、スクリーンリーダー向けの「操作ボタンを表示」ボタンが現れ、押すと戻る', async ({ page }) => {
		await open(page);
		await start(page);
		const delay = await hideDelayMs(page);
		const show = page.getByRole('button', { name: 'タップで操作ボタンを表示' });
		await expect(show).toHaveCount(0);
		await advance(page, delay + 100);
		await expect(controls(page)).toHaveCSS('visibility', 'hidden');
		await expect(show).toHaveCount(1);
		await show.dispatchEvent('click');
		await expect(controls(page)).toHaveCSS('visibility', 'visible');
		await expect(show).toHaveCount(0);
	});

	test('一時停止中と確認中は隠れない', async ({ page }) => {
		await open(page);
		await start(page);
		const delay = await hideDelayMs(page);
		await page.keyboard.press('Space');
		await advance(page, delay * 3);
		await expect(controls(page)).toHaveCSS('visibility', 'visible');
		await page.keyboard.press('Space');
		await page.keyboard.press('Escape');
		await advance(page, delay * 3);
		await expect(controls(page)).toHaveCSS('visibility', 'visible');
		await page.keyboard.press('Escape');
		await advance(page, delay + 100);
		await expect(controls(page)).toHaveCSS('visibility', 'hidden');
	});
});

test.describe('W4-2 警告', () => {
	test('スリープ防止に失敗すると警告が出て、閉じられ、計測は止まらない', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'wakeLock', {
				value: { request: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
				configurable: true
			});
		});
		await open(page);
		await start(page);
		const banner = page.getByText('画面のスリープを防げませんでした。');
		await expect(banner).toBeVisible();
		// 警告で縦が狭くなっても、リングが操作ボタンに重ならない
		const ring = (await page.locator(".ring").boundingBox())!;
		const bar = (await controls(page).boundingBox())!;
		expect(ring.y + ring.height).toBeLessThanOrEqual(bar.y);
		await advance(page, 10_000);
		await expect(digits(page)).toHaveText('4:50');
		await page.getByRole('button', { name: '閉じる' }).click();
		await expect(banner).toHaveCount(0);
		await advance(page, 5_000);
		await expect(digits(page)).toHaveText('4:45');
	});

	test('音を出せないと警告が出る。スリープを防げているときは出ない', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'wakeLock', {
				value: { request: async () => ({ released: false, release: async () => {}, addEventListener() {} }) },
				configurable: true
			});
			class Stuck {
				state = 'suspended';
				currentTime = 0;
				destination = {};
				createGain() {
					return { gain: { value: 0, setValueAtTime() {} }, connect() {} };
				}
				async resume() {}
			}
			(window as unknown as Record<string, unknown>).AudioContext = Stuck;
		});
		await open(page);
		await start(page);
		await expect(page.getByText('ベルの音を出せません。')).toBeVisible();
		await expect(page.getByText('画面のスリープを防げませんでした。')).toHaveCount(0);
		await page.getByRole('button', { name: '閉じる' }).click();
		await expect(page.getByText('ベルの音を出せません。')).toHaveCount(0);
		await expect(digits(page)).toBeVisible();
	});
});

test.describe('W4-3 全画面', () => {
	test('1280px ではボタンが出て、390px では出ない。F で切り替わる', async ({ page }) => {
		await open(page);
		await start(page);
		const btn = page.getByRole('button', { name: '全画面' });
		await page.setViewportSize({ width: 1280, height: 720 });
		await expect(btn).toBeVisible();
		await page.setViewportSize({ width: 390, height: 800 });
		await expect(btn).toBeHidden();

		await page.setViewportSize({ width: 1280, height: 720 });
		expect(await page.evaluate(() => document.fullscreenElement !== null)).toBe(false);
		await page.keyboard.press('f');
		await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
		await page.keyboard.press('f');
		await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(false);
	});
});

test.describe('W4-4 テーマ（環境設定の「表示テーマ」）', () => {
	const openPrefs = async (page: Page) => {
		await page.getByRole('button', { name: '環境設定を開く' }).click();
		await expect(page.getByRole('dialog', { name: '環境設定' })).toBeVisible();
	};
	const radio = (page: Page, name: string) => page.getByRole('radio', { name, exact: true });

	test('選ぶと data-theme が付け外しされ、再読み込みしても保存した選択が残る', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await open(page);
		const attr = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
		expect(await attr()).toBeNull();

		await openPrefs(page);
		await expect(radio(page, 'システム')).toHaveAttribute('aria-checked', 'true');

		await radio(page, 'ダーク').click();
		expect(await attr()).toBe('dark');
		const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

		await radio(page, 'ライト').click();
		expect(await attr()).toBe('light');
		await expect
			.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
			.not.toBe(darkBg);

		await radio(page, 'システム').click();
		expect(await attr()).toBeNull();

		await radio(page, 'ダーク').click();
		await page.reload();
		await expect(page.locator('#splash')).toHaveCount(0);
		await expect.poll(attr).toBe('dark');
		await openPrefs(page);
		await expect(radio(page, 'ダーク')).toHaveAttribute('aria-checked', 'true');
	});

	test('キーボード：矢印で選択が移り、Esc で閉じて歯車に戻る', async ({ page }) => {
		await open(page);
		const gear = page.getByRole('button', { name: '環境設定を開く' });
		await gear.focus();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('dialog', { name: '環境設定' })).toBeVisible();

		await radio(page, 'システム').focus();
		await page.keyboard.press('ArrowRight');
		await expect(radio(page, 'ライト')).toBeFocused();
		await expect(radio(page, 'ライト')).toHaveAttribute('aria-checked', 'true');
		expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light');
		await page.keyboard.press('ArrowRight');
		await expect(radio(page, 'ダーク')).toBeFocused();
		await page.keyboard.press('ArrowRight');
		await expect(radio(page, 'システム')).toBeFocused();
		await page.keyboard.press('ArrowLeft');
		await expect(radio(page, 'ダーク')).toBeFocused();

		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(gear).toBeFocused();
		expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
	});
});

test.describe('W4-5 キーボードだけの操作とフォーカス', () => {
	/** フォーカス中の要素に、見える輪郭があるか */
	const focusRing = (page: Page) =>
		page.evaluate(() => {
			const el = document.activeElement as HTMLElement | null;
			if (!el || el === document.body) return null;
			// 要素自身か、その内側（スイッチはつまみの軌道）に輪郭があればよい
			const drawn = (e: Element) => {
				const s = getComputedStyle(e);
				return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
			};
			const outline = [el, ...el.querySelectorAll("*")].some(drawn);
			const shadow = false;
			return {
				name: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 20) || `${el.tagName}.${el.className}[${el.getAttribute('type') ?? ''}]`,
				visible: outline || shadow
			};
		});

	test('設定画面を Tab でひと巡りし、すべてフォーカスが見える。そのまま計測・終了できる', async ({ page }) => {
		await open(page);
		const startBtn = page.getByRole('button', { name: '開始' });
		let reached = false;
		const seen: string[] = [];
		for (let i = 0; i < 80 && !reached; i++) {
			await page.keyboard.press('Tab');
			const ring = await focusRing(page);
			expect(ring, `Tab ${i + 1} でフォーカスが失われた`).not.toBeNull();
			expect(ring!.visible, `フォーカスが見えない: ${ring!.name}`).toBe(true);
			seen.push(ring!.name);
			reached = await startBtn.evaluate((el) => el === document.activeElement);
		}
		expect(reached, `開始に届かなかった: ${seen.join(' > ')}`).toBe(true);
		await page.keyboard.press('Enter');
		await expect(digits(page)).toBeVisible();

		// 計測画面：Tab で操作ボタンを巡る
		const timerSeen: string[] = [];
		for (let i = 0; i < 4; i++) {
			await page.keyboard.press('Tab');
			const ring = await focusRing(page);
			if (ring) {
				expect(ring.visible, `フォーカスが見えない: ${ring.name}`).toBe(true);
				timerSeen.push(ring.name);
			}
		}
		expect(timerSeen.join()).toContain('一時停止');
		expect(timerSeen.join()).toContain('終了');

		await page.keyboard.press('Escape');
		await expect(page.getByRole('alertdialog')).toBeVisible();
		for (let i = 0; i < 3; i++) {
			const ring = await focusRing(page);
			expect(ring!.visible, `確認ダイアログでフォーカスが見えない: ${ring!.name}`).toBe(true);
			await page.keyboard.press('Tab');
		}
		await page.keyboard.press('Enter');
		await expect(page.getByRole('button', { name: '開始' })).toBeVisible();
	});

	test('環境設定（歯車・タブ・選択肢・スイッチ・スライダー）のフォーカスも見える', async ({ page }) => {
		await open(page);
		const gear = page.getByRole('button', { name: '環境設定を開く' });
		await gear.focus();
		expect((await focusRing(page))!.visible).toBe(true);
		await page.keyboard.press('Enter');
		// 一般タブ：タブ → 言語 → テーマ → スイッチ → 閉じる
		for (let i = 0; i < 5; i++) {
			const ring = await focusRing(page);
			expect(ring!.visible, `一般タブでフォーカスが見えない: ${ring!.name}`).toBe(true);
			await page.keyboard.press('Tab');
		}
		// 音タブ：キーボードで切り替え（マウスのあとの focus() は :focus-visible にならないため）→ 音量 → 鳴らしてみる
		await page.getByRole('tab', { name: '一般', exact: true }).focus();
		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('Tab');
		for (let i = 0; i < 3; i++) {
			const ring = await focusRing(page);
			expect(ring!.visible, `音タブでフォーカスが見えない: ${ring!.name}`).toBe(true);
			await page.keyboard.press('Tab');
		}
	});
});
