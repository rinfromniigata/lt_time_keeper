import type { ThemeChoice } from '../prefs/prefs.ts';

/** `prefs.theme` を <html data-theme> に反映する（「システム」では属性を外し、OS の設定に任せる） */
export function applyTheme(choice: ThemeChoice, root: HTMLElement = document.documentElement): void {
	if (choice === 'system') root.removeAttribute('data-theme');
	else root.setAttribute('data-theme', choice);
}
