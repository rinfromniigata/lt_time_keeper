// トークンの一致と、色・寸法の直書きを検査する（CI でも実行する）
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const specsDir = join(root, 'roadmap', 'specs');
const tokensPath = join(root, 'src', 'lib', 'theme', 'tokens.css');
const srcDir = join(root, 'src');

// 直書きを許す箇所。トークンにない値のブレークポイント定数だけ（base.css の1か所）
const ALLOWED: { file: string; text: string }[] = [{ file: 'src/lib/theme/base.css', text: '720px' }];

const problems: string[] = [];
const normalize = (s: string) => s.replace(/\r\n/g, '\n').trimEnd();

// 1. tokens.css が specs の最新版と一致すること
function latestSpecTokens(): string | null {
	const found = readdirSync(specsDir)
		.map((name) => ({ name, m: /_tokens_v(\d+)\.css$/.exec(name) }))
		.filter((x) => x.m)
		.sort((a, b) => Number(b.m![1]) - Number(a.m![1]));
	return found.length ? join(specsDir, found[0].name) : null;
}
const specTokens = latestSpecTokens();
if (!specTokens) {
	problems.push('roadmap/specs/ に *_tokens_v{n}.css がありません');
} else if (normalize(readFileSync(specTokens, 'utf8')) !== normalize(readFileSync(tokensPath, 'utf8'))) {
	const specRel = relative(root, specTokens).replaceAll('\\', '/');
	problems.push(`src/lib/theme/tokens.css が ${specRel} と一致しません`);
}

// 2. .svelte・.css に色と寸法の直書きがないこと
const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
const DIMENSION = /(?<![\w.-])\d*\.?\d+(?:px|rem|ms)\b/;

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const p = join(dir, name);
		return statSync(p).isDirectory() ? walk(p) : [p];
	});
}

function stripComments(text: string): string {
	// 行数を保つため、コメントは改行だけ残して消す
	const blank = (m: string) => m.replace(/[^\n]/g, '');
	return text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/<!--[\s\S]*?-->/g, blank);
}

for (const file of walk(srcDir)) {
	if (!/\.(svelte|css)$/.test(file) || file === tokensPath) continue;
	const rel = relative(root, file).replaceAll('\\', '/');
	stripComments(readFileSync(file, 'utf8'))
		.split('\n')
		.forEach((line, i) => {
			let rest = line;
			for (const a of ALLOWED) if (a.file === rel) rest = rest.replaceAll(a.text, '');
			if (COLOR.test(rest)) problems.push(`${rel}:${i + 1} 色の直書き: ${line.trim()}`);
			if (DIMENSION.test(rest)) problems.push(`${rel}:${i + 1} 寸法の直書き: ${line.trim()}`);
		});
}

if (problems.length) {
	console.error(problems.join('\n'));
	console.error(`\ncheck:tokens 失敗（${problems.length} 件）`);
	process.exit(1);
}
console.log('check:tokens OK');
