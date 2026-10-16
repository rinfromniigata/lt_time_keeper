import type { Handle } from '@sveltejs/kit/hooks';
import { fillShell } from '#lib/i18n/shell.ts';

// 書き出し時に、app.html の S00 の文言・題名・説明・OGP を辞書から差し込む（文言を app.html に直書きしない）
export const handle: Handle = ({ event, resolve }) =>
	resolve(event, { transformPageChunk: ({ html }) => fillShell(html) });
