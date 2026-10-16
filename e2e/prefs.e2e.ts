import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// 環境設定の保存と、環境設定の画面（S05・S05a）、終了の確認（S03f）の e2e。
// 保存の e2e は、page.addInitScript で localStorage を用意して開く

const load = (locale: string): Record<string, string> =>
	JSON.parse(readFileSync(`src/lib/i18n/locales/${locale}.json`, 'utf-8'));
const ja = load('ja');
const en = load('en');
const zhHans = load('zh-Hans');

const KEY = 'lt_time_keeper.prefs';
const URL = 'http://localhost:4173/';
const stored = (page: Page) => page.evaluate((k) => localStorage.getItem(k), KEY);
const storedJson = async (page: Page) => JSON.parse((await stored(page)) ?? 'null');
const fill = (template: string, args: Record<string, string>) =>
	Object.entries(args).reduce((s, [k, v]) => s.replace(`{${k}}`, v), template);

/** 音の代役（ベル1打ち＝発振器3本、音量は setValueAtTime で渡る）と、振動に対応した端末 */
async function installFakes(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as Record<string, unknown>;
		const log = { oscillators: 0, gains: [] as number[] };
		w.__audio = log;
		class FakeContext {
			state = 'suspended';
			currentTime = 0;
			destination = {};
			createGain() {
				return {
					gain: {
						value: 0,
						setValueAtTime(v: number) {
							log.gains.push(v);
						},
						linearRampToValueAtTime() {},
						exponentialRampToValueAtTime() {}
					},
					connect: () => ({ connect() {} })
				};
			}
			createOscillator() {
				log.oscillators++;
				return { type: '', frequency: { value: 0 }, connect: () => ({ connect() {} }), start() {}, stop() {} };
			}
			async resume() {
				this.state = 'running';
			}
		}
		w.AudioContext = FakeContext;
		Object.defineProperty(Navigator.prototype, 'vibrate', { value: () => true, configurable: true, writable: true });
	});
}
const audio = (page: Page) =>
	page.evaluate(() => (window as unknown as { __audio: { oscillators: number; gains: number[] } }).__audio);

test.describe('操作の流れ（ブラウザの言語が zh-TW の利用者）', () => {
	test.use({ locale: 'zh-TW' });

	test('手順1〜14：保存するもの・しないもの、言語を変えても設定が残る、確認を出さない設定、データを消すと初期状態', async ({
		page
	}) => {
		await installFakes(page);

		// 1. 初めて開く：言語は zh-TW から簡体字中国語、何も保存しない
		await page.goto(URL);
		await expect(page.locator('#splash')).toHaveCount(0);
		await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
		await expect(page).toHaveTitle(zhHans['app.name']);
		expect(await stored(page)).toBeNull();

		// 2. 持ち時間を10分、表示名を「LT」にする：localStorage は変わらない
		await page.getByRole('button', { name: fill(zhHans['settings.duration.preset'], { n: '10' }) }).click();
		await page.getByLabel(zhHans['settings.title.title'], { exact: true }).fill('LT');
		await expect(page.locator('#duration-min')).toHaveValue('10');
		expect(await stored(page)).toBeNull();

		// 3. 歯車で環境設定を開く：何も変わらない。タブは「一般」
		await page.getByRole('button', { name: zhHans['header.open_prefs'] }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('tab', { name: zhHans['prefs.tab.general'] })).toHaveAttribute('aria-selected', 'true');
		expect(await stored(page)).toBeNull();

		// 4. 言語で「日本語」を選ぶ：保存し、その場で日本語になる。10分と「LT」は残る
		await dialog.getByRole('radio', { name: '日本語' }).click();
		await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
		await expect(page).toHaveTitle(ja['app.name']);
		await expect(dialog.getByRole('heading', { name: ja['prefs.title'] })).toBeVisible();
		expect(await storedJson(page)).toEqual({
			v: 1,
			locale: 'ja',
			theme: 'system',
			volume: 0.7,
			vibrate: true,
			confirmEnd: true
		});

		// 5. テーマで「ダーク」：保存し、data-theme が付く
		await dialog.getByRole('radio', { name: ja['prefs.theme.dark'], exact: true }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		expect((await storedJson(page)).theme).toBe('dark');

		// 6. 「音」タブで音量を 50%：動かすたびに保存し、最後は 0.5
		await dialog.getByRole('tab', { name: ja['prefs.tab.sound'], exact: true }).click();
		const slider = dialog.getByRole('slider', { name: ja['prefs.sound.volume'] });
		await slider.focus();
		await page.keyboard.press('ArrowLeft'); // 70 → 69：1操作ごとに保存される
		expect((await storedJson(page)).volume).toBeCloseTo(0.69, 5);
		await slider.fill('50');
		expect((await storedJson(page)).volume).toBe(0.5);

		// 7. 「鳴らしてみる」：0.5 の音量で1回鳴る。何も保存しない
		const before = await stored(page);
		await dialog.getByRole('button', { name: ja['prefs.sound.test'] }).click();
		await expect.poll(async () => (await audio(page)).oscillators).toBe(3);
		expect((await audio(page)).gains).toContain(0.5);
		expect(await stored(page)).toBe(before);

		// 8. 閉じて「開始」：settings・prefs は変わらない
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		await page.getByRole('button', { name: ja['settings.start'], exact: true }).click();
		await expect(page.getByRole('timer')).toBeVisible();
		expect(await stored(page)).toBe(before);

		// 9. Esc で確認。チェックを入れて「続ける」：保存しない（confirmEnd は true のまま）
		await page.keyboard.press('Escape');
		const confirm = page.getByRole('alertdialog');
		const dontAsk = confirm.getByRole('checkbox', { name: new RegExp(ja['end_confirm.dont_ask']) });
		await dontAsk.check();
		await confirm.getByRole('button', { name: ja['end_confirm.continue'] }).click();
		await expect(confirm).toHaveCount(0);
		expect(await stored(page)).toBe(before);
		expect((await storedJson(page)).confirmEnd).toBe(true);

		// 10. もう一度 Esc：チェックはオフから。チェックを入れて Enter：保存して S01 へ。10分・「LT」は残る
		await page.keyboard.press('Escape');
		await expect(dontAsk).not.toBeChecked();
		await dontAsk.check();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('button', { name: ja['settings.start'], exact: true })).toBeVisible();
		expect((await storedJson(page)).confirmEnd).toBe(false);
		await expect(page.locator('#duration-min')).toHaveValue('10');
		await expect(page.getByLabel(ja['settings.title.title'], { exact: true })).toHaveValue('LT');

		// 11. もう一度開始して Esc：確認を出さず、すぐ S01 に戻る
		await page.getByRole('button', { name: ja['settings.start'], exact: true }).click();
		await expect(page.getByRole('timer')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('button', { name: ja['settings.start'], exact: true })).toBeVisible();
		await expect(page.getByRole('alertdialog')).toHaveCount(0);

		// 12. 開き直す：保存値が反映され、settings は初期値に戻る
		await page.reload();
		await expect(page.locator('#splash')).toHaveCount(0);
		await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(page.locator('#duration-min')).toHaveValue('05');
		await expect(page.getByLabel(ja['settings.title.title'], { exact: true })).toHaveValue('');
		await expect(page.getByText(fill(ja['settings.start_bar.summary'], { time: '5:00', n: '3' }))).toBeVisible();
		await page.getByRole('button', { name: ja['header.open_prefs'] }).click();
		const reopened = page.getByRole('dialog');
		await expect(reopened.getByRole('radio', { name: ja['prefs.theme.dark'], exact: true })).toHaveAttribute('aria-checked', 'true');
		const endConfirm = reopened.getByRole('switch', { name: ja['prefs.end_confirm.label'] });
		await expect(endConfirm).toHaveAttribute('aria-checked', 'false');
		await reopened.getByRole('tab', { name: ja['prefs.tab.sound'], exact: true }).click();
		await expect(reopened.locator('.range-value')).toHaveText('50%');
		await expect(reopened.getByRole('switch', { name: ja['prefs.sound.vibrate'] })).toHaveAttribute('aria-checked', 'true');

		// 13. 「確認する」をオンに戻す：保存する
		await reopened.getByRole('tab', { name: ja['prefs.tab.general'], exact: true }).click();
		await endConfirm.click();
		expect((await storedJson(page)).confirmEnd).toBe(true);

		// 14. サイトのデータを消して開く：手順1と同じ状態（言語は再びブラウザの言語）
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		await expect(page.locator('#splash')).toHaveCount(0);
		await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
		await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
		expect(await stored(page)).toBeNull();
	});
});

test.describe('壊れた保存値と、localStorage が使えない環境', () => {
	test('壊れた保存値でも正常に開き、項目ごとに初期値になり、次の変更で正しい形に書き直す', async ({ page }) => {
		// 開き直しでは上書きしない（変更後の保存値を壊さない）
		await page.addInitScript(
			([k, v]) => {
				if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
			},
			[KEY, '{"v":1,"theme":"blue","volume":"x"}']
		);
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await page.goto(URL);
		await expect(page.locator('#splash')).toHaveCount(0);
		await expect(page.locator('html')).toHaveAttribute('lang', 'ja'); // locale は欠けている → ブラウザの言語（ja-JP）
		await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/); // theme は初期値（system）

		await page.getByRole('button', { name: ja['header.open_prefs'] }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('radio', { name: ja['prefs.theme.system'], exact: true })).toHaveAttribute('aria-checked', 'true');
		await dialog.getByRole('tab', { name: ja['prefs.tab.sound'], exact: true }).click();
		await expect(dialog.locator('.range-value')).toHaveText('70%'); // volume は初期値
		await dialog.getByRole('tab', { name: ja['prefs.tab.general'], exact: true }).click();

		await dialog.getByRole('radio', { name: ja['prefs.theme.light'], exact: true }).click();
		expect(await storedJson(page)).toEqual({
			v: 1,
			locale: null,
			theme: 'light',
			volume: 0.7,
			vibrate: true,
			confirmEnd: true
		});
		expect(errors).toEqual([]);
	});

	test('版の違う値・JSON でない値も、初期値で開く', async ({ page }) => {
		for (const bad of ['{"v":2,"locale":"en","theme":"dark"}', '{broken', '[]']) {
			const p = await page.context().newPage();
			await p.addInitScript(
				([k, v]) => {
					if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
				},
				[KEY, bad]
			);
			await p.goto(URL);
			await expect(p.locator('#splash')).toHaveCount(0);
			await expect(p.locator('html')).toHaveAttribute('lang', 'ja');
			await expect(p.locator('html')).not.toHaveAttribute('data-theme', /.*/);
			await expect(p.getByRole('button', { name: ja['settings.start'], exact: true })).toBeVisible();
			await p.close();
		}
	});

	test('localStorage が使えないブラウザでも、初期値で動き、変更は画面に反映される（エラーは出ない）', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(window, 'localStorage', {
				get() {
					throw new DOMException('denied', 'SecurityError');
				},
				configurable: true
			});
		});
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await page.goto(URL);
		await expect(page.locator('#splash')).toHaveCount(0);
		await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

		await page.getByRole('button', { name: ja['header.open_prefs'] }).click();
		const dialog = page.getByRole('dialog');
		await dialog.getByRole('radio', { name: ja['prefs.theme.dark'], exact: true }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await dialog.getByRole('radio', { name: 'English' }).click();
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		await dialog.getByRole('tab', { name: en['prefs.tab.sound'], exact: true }).click();
		await dialog.getByRole('slider', { name: en['prefs.sound.volume'] }).fill('30');
		await expect(dialog.locator('.range-value')).toHaveText('30%');
		await page.keyboard.press('Escape');

		// 計測も、終了の確認も動く
		await page.getByRole('button', { name: en['settings.start'], exact: true }).click();
		await expect(page.getByRole('timer')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('alertdialog')).toBeVisible();
		expect(errors).toEqual([]);
	});
});

test.describe('保存した言語・テーマは最初の描画から', () => {
	test('日本語以外・ダークを保存して開くと、body が作られる時点ですでに lang と data-theme が保存値', async ({ page }) => {
		await page.addInitScript(
			([k, v]) => {
				localStorage.setItem(k, v);
				// body が最初に作られた時点（最初の描画より前）の値を控える
				const w = window as unknown as { __first?: { lang: string; theme: string | null } };
				new MutationObserver((_, obs) => {
					if (!document.body) return;
					w.__first = {
						lang: document.documentElement.lang,
						theme: document.documentElement.getAttribute('data-theme')
					};
					obs.disconnect();
				}).observe(document, { childList: true, subtree: true });
			},
			[KEY, '{"v":1,"locale":"en","theme":"dark","volume":0.7,"vibrate":true,"confirmEnd":true}']
		);
		await page.goto(URL);
		await expect(page.locator('#splash')).toHaveCount(0);
		const first = await page.evaluate(
			() => (window as unknown as { __first: { lang: string; theme: string | null } }).__first
		);
		expect(first).toEqual({ lang: 'en', theme: 'dark' });
		await expect(page).toHaveTitle(en['app.name']);
	});
});

test.describe('環境設定の画面（S05・S05a）', () => {
	for (const [name, size] of [
		['広い画面（ダイアログ）', { width: 1280, height: 800 }],
		['狭い画面（全画面）', { width: 390, height: 780 }]
	] as const) {
		test(`${name}：開く・タブ・閉じる・フォーカス・横スクロールなし`, async ({ page }) => {
			await page.setViewportSize(size);
			await installFakes(page);
			await page.goto(URL);
			await expect(page.locator('#splash')).toHaveCount(0);
			const gear = page.getByRole('button', { name: ja['header.open_prefs'] });
			await gear.click();
			const dialog = page.getByRole('dialog', { name: ja['prefs.title'] });
			await expect(dialog).toBeVisible();

			// 全画面か、ダイアログか
			const box = (await dialog.boundingBox())!;
			if (size.width < 720) {
				expect(Math.round(box.width)).toBe(size.width);
				expect(Math.round(box.height)).toBe(size.height);
			} else {
				expect(box.width).toBeLessThan(size.width);
				expect(box.height).toBeLessThan(size.height);
			}

			// タブ：左右キー、「音」から「一般」へ戻ると一般の内容
			const general = dialog.getByRole('tab', { name: ja['prefs.tab.general'], exact: true });
			const sound = dialog.getByRole('tab', { name: ja['prefs.tab.sound'], exact: true });
			await expect(general).toBeFocused();
			await page.keyboard.press('ArrowRight');
			await expect(sound).toBeFocused();
			await expect(sound).toHaveAttribute('aria-selected', 'true');
			await expect(dialog.getByRole('slider', { name: ja['prefs.sound.volume'] })).toBeVisible();
			await expect(dialog.getByRole('switch', { name: ja['prefs.sound.vibrate'] })).toBeVisible();
			await page.keyboard.press('ArrowLeft');
			await expect(dialog.getByRole('radiogroup', { name: ja['prefs.language.title'] })).toBeVisible();

			// Tab はダイアログの外へ出ない
			for (let i = 0; i < 12; i++) {
				await page.keyboard.press('Tab');
				expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
			}

			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

			// ×で閉じて歯車へ、開き直すと「一般」から
			await dialog.getByRole('button', { name: ja['common.close'] }).click();
			await expect(page.getByRole('dialog')).toHaveCount(0);
			await expect(gear).toBeFocused();
			await gear.click();
			await expect(page.getByRole('tab', { name: ja['prefs.tab.general'], exact: true })).toHaveAttribute('aria-selected', 'true');
			await page.keyboard.press('Escape');
			await expect(gear).toBeFocused();

			// 広い画面は、暗い背景のクリックでも閉じる
			if (size.width >= 720) {
				await gear.click();
				await page.mouse.click(5, 5);
				await expect(page.getByRole('dialog')).toHaveCount(0);
			}
		});
	}

	test('言語の選択肢は自身の言語で並び、公開版には疑似ロケールが出ない', async ({ page }) => {
		await page.goto(URL);
		await expect(page.locator('#splash')).toHaveCount(0);
		await page.getByRole('button', { name: ja['header.open_prefs'] }).click();
		const group = page.getByRole('radiogroup', { name: ja['prefs.language.title'] });
		await expect(group.getByRole('radio')).toHaveText(['日本語', 'English', '简体中文']);
		await expect(group.getByRole('radio').nth(1)).toHaveAttribute('lang', 'en');
		await expect(group.getByRole('radio').nth(2)).toHaveAttribute('lang', 'zh-Hans');
		// ?pseudo を付けても、公開版（このビルド）では何も変わらない
		await page.goto(URL + '?pseudo');
		await expect(page.locator('#splash')).toHaveCount(0);
		await expect(page.getByRole('button', { name: ja['settings.start'], exact: true })).toBeVisible();
		await expect(page.locator('body')).not.toContainText('［');
	});

	test('歯車は計測中には出ず、環境設定を開いている間は開始できない', async ({ page }) => {
		await page.goto(URL);
		await expect(page.locator('#splash')).toHaveCount(0);
		await page.getByRole('button', { name: ja['header.open_prefs'] }).click();
		await page.keyboard.press('Enter'); // フォーカス中のタブでは何も起きない
		await expect(page.getByRole('timer')).toHaveCount(0);
		await page.keyboard.press('Escape');
		await page.getByRole('button', { name: ja['settings.start'], exact: true }).click();
		await expect(page.getByRole('timer')).toBeVisible();
		await expect(page.getByRole('button', { name: ja['header.open_prefs'] })).toHaveCount(0);
	});
});

test.describe('終了の確認（S03f）のチェックボックス', () => {
	test('Tab はチェックボックス・続ける・終了するの間で回り、Space はチェックだけを切り替える', async ({ page }) => {
		await page.goto(URL);
		await expect(page.locator('#splash')).toHaveCount(0);
		await page.getByRole('button', { name: ja['settings.start'], exact: true }).click();
		await page.keyboard.press('Escape');
		const dialog = page.getByRole('alertdialog');
		const dontAsk = dialog.getByRole('checkbox');
		const cont = dialog.getByRole('button', { name: ja['end_confirm.continue'] });
		const end = dialog.getByRole('button', { name: ja['end_confirm.end'] });
		await expect(end).toBeFocused();
		await dontAsk.focus();
		await page.keyboard.press('Space');
		await expect(dontAsk).toBeChecked();
		await expect(dialog).toBeVisible();
		await page.keyboard.press('Tab');
		await expect(cont).toBeFocused();
		await page.keyboard.press('Space');
		await expect(dialog).toBeVisible(); // ボタンは Space で押されない
		await page.keyboard.press('Tab');
		await expect(end).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(dontAsk).toBeFocused();
		// 何も保存されていない（「続ける」でも「終了する」でもないため）
		expect(await stored(page)).toBeNull();
	});

	test('確認を出さない設定では、「終了」ボタンでもすぐ戻る', async ({ page }) => {
		await page.addInitScript(
			([k, v]) => localStorage.setItem(k, v),
			[KEY, '{"v":1,"locale":null,"theme":"system","volume":0.7,"vibrate":true,"confirmEnd":false}']
		);
		await page.goto(URL);
		await expect(page.locator('#splash')).toHaveCount(0);
		await page.getByRole('button', { name: ja['settings.start'], exact: true }).click();
		await page.getByRole('button', { name: ja['timer.end'], exact: true }).click();
		await expect(page.getByRole('button', { name: ja['settings.start'], exact: true })).toBeVisible();
		await expect(page.getByRole('alertdialog')).toHaveCount(0);
	});
});
