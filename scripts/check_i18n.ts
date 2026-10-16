// 辞書（src/lib/i18n/locales/*.json）と文言の使い方を検査する（CI でも実行する）
//  1. 3つの辞書のキーが一致する
//  2. 各キーのプレースホルダが ja と合う
//  3. src・scripts で参照されないキーがない
//  4. .svelte のテンプレートの文字と、文言を取る属性の値に、文字の直書きがない
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const localesDir = join(root, 'src', 'lib', 'i18n', 'locales');
const SOURCE = 'ja';
const LOCALES = ['ja', 'en', 'zh-Hans'] as const;

// 直書きを許す文字。キーの名前（キーボードの表記は言語によらない）
const ALLOWED_TEXT = new Set(['Space', 'Esc', 'Enter', 'F']);
// 文言を取る属性。値に文字の直書きがあれば辞書へ移す
const TEXT_ATTRIBUTES = [
	'aria-label',
	'title',
	'placeholder',
	'alt',
	'label',
	'message',
	'detail',
	'hint',
	'confirmLabel',
	'cancelLabel'
];

type Value = string | Record<string, string>;
const problems: string[] = [];
const rel = (p: string) => relative(root, p).replaceAll('\\', '/');

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const p = join(dir, name);
		return statSync(p).isDirectory() ? walk(p) : [p];
	});
}

// 1. キーの一致 ------------------------------------------------------------------------------
const dicts = Object.fromEntries(
	LOCALES.map((l) => [l, JSON.parse(readFileSync(join(localesDir, `${l}.json`), 'utf8')) as Record<string, Value>])
) as Record<(typeof LOCALES)[number], Record<string, Value>>;
const source = dicts[SOURCE];
const sourceKeys = Object.keys(source);

for (const l of LOCALES) {
	if (l === SOURCE) continue;
	const keys = new Set(Object.keys(dicts[l]));
	for (const k of sourceKeys) if (!keys.has(k)) problems.push(`${l}.json に ${k} がありません`);
	for (const k of keys) if (!(k in source)) problems.push(`${l}.json に、${SOURCE}.json にないキー ${k} があります`);
}

// 2. プレースホルダ --------------------------------------------------------------------------
const placeholders = (s: string) => new Set(s.match(/\{\w+\}/g) ?? []);
const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));
const forms = (v: Value): [string, string][] => (typeof v === 'string' ? [['', v]] : Object.entries(v));

for (const l of LOCALES) {
	if (l === SOURCE) continue;
	for (const k of sourceKeys) {
		const target = dicts[l][k];
		if (target === undefined) continue;
		// 原文のプレースホルダ（複数形なら、すべての形に出るものの和）
		const expected = new Set(forms(source[k]).flatMap(([, s]) => [...placeholders(s)]));
		for (const [form, s] of forms(target)) {
			const actual = placeholders(s);
			const label = `${l}.json ${k}${form ? `（${form}）` : ''}`;
			// 複数形は、その形が単数・特定の数を指すとき（「1つ」）に数を文字にしなくてよいので、原文の部分集合を許す。
			// 数のない形（other、複数形でない文字列）は、原文と一致させる
			const exact = form === '' || form === 'other';
			const unknown = [...actual].filter((p) => !expected.has(p));
			const missing = [...expected].filter((p) => !actual.has(p));
			if (unknown.length) problems.push(`${label} に、原文にないプレースホルダ ${unknown.join(' ')} があります`);
			if (exact && missing.length) problems.push(`${label} に、プレースホルダ ${missing.join(' ')} がありません`);
		}
		// 複数形を使うかは言語ごとに違ってよい（ja は文字列、en は one・other）。複数形には other が要る
		if (typeof target === 'object' && !('other' in target)) problems.push(`${l}.json ${k} の複数形に other がありません`);
	}
}

// 3. 未使用キー ------------------------------------------------------------------------------
// 文字列リテラルがキーと一致すれば使用とみなす（t('…')・msg('…')・key: '…'・キーを値に持つ表など）。
// キーを組み立てて参照しない（静的に拾えなくなる）
const sources = [...walk(join(root, 'src')), ...walk(join(root, 'scripts'))].filter(
	(f) =>
		/\.(ts|svelte)$/.test(f) &&
		!/\.(test|spec)\.ts$/.test(f) &&
		!f.endsWith('check_i18n.ts') &&
		!f.includes('/locales/') &&
		!f.includes('\\locales\\')
);
const literals = new Set<string>();
for (const file of sources) {
	for (const m of readFileSync(file, 'utf8').matchAll(/(['"`])([A-Za-z0-9_.]+)\1/g)) literals.add(m[2]);
}
for (const k of sourceKeys) if (!literals.has(k)) problems.push(`未使用のキー: ${k}`);

// 4. 文字の直書き ----------------------------------------------------------------------------
/** 改行を残して、文字を空白に置き換える（行番号を保つ） */
const blank = (m: string) => m.replace(/[^\n]/g, ' ');

/** { … } を、入れ子も含めて空白にする */
function blankBraces(text: string): string {
	let out = '';
	let depth = 0;
	for (const ch of text) {
		if (ch === '{') depth++;
		if (depth > 0) out += ch === '\n' ? '\n' : ' ';
		else out += ch;
		if (ch === '}' && depth > 0) depth--;
	}
	return out;
}

const LETTER = /\p{L}/u;
const attrPattern = new RegExp(`(?<![\\w:-])(${TEXT_ATTRIBUTES.join('|')})\\s*=\\s*"([^"]*)"`, 'g');

for (const file of sources.filter((f) => f.endsWith('.svelte'))) {
	const path = rel(file);
	let text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
	text = text
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/<script[\s\S]*?<\/script>/g, blank)
		.replace(/<style[\s\S]*?<\/style>/g, blank);
	const lineOf = (index: number) => text.slice(0, index).split('\n').length;

	// 属性の値（"…{式}…" の式は除く）
	for (const m of text.matchAll(attrPattern)) {
		const value = blankBraces(m[2]).trim();
		if (LETTER.test(value) && !ALLOWED_TEXT.has(value))
			problems.push(`${path}:${lineOf(m.index)} ${m[1]} に文字の直書き: ${m[2]}`);
	}

	// テンプレートの文字。式とタグを除いた残り
	const template = blankBraces(text).replace(/<[^>]*>/g, blank);
	template.split('\n').forEach((line, i) => {
		const t = line.trim();
		if (LETTER.test(t) && !ALLOWED_TEXT.has(t)) problems.push(`${path}:${i + 1} 文字の直書き: ${t}`);
	});
}

if (problems.length) {
	console.error(problems.join('\n'));
	console.error(`\ncheck:i18n 失敗（${problems.length} 件）`);
	process.exit(1);
}
console.log('check:i18n OK');
