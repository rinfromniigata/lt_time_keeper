export type ThemeChoice = 'system' | 'light' | 'dark';

/** テーマの選択。<html data-theme> を付け外しして反映する（「OSに合わせる」では属性を外す）。保存はしない */
class Theme {
	choice = $state<ThemeChoice>('system');

	set(choice: ThemeChoice): void {
		this.choice = choice;
		const root = document.documentElement;
		if (choice === 'system') root.removeAttribute('data-theme');
		else root.setAttribute('data-theme', choice);
	}
}

export const theme = new Theme();
