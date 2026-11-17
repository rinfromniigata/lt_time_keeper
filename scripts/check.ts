// checkコマンド（`bun run check`）。型検査 → lint → check:tokens → check:i18n → 単体テスト → build → e2e の順に実行し、
// 最初に失敗した段で止める（imple §5.1）。ローカルも CI（release.yml）も、このコマンドを使う。
// 各段の出力は控えておき、通った段は1行だけ、失敗した段は失敗の部分だけを出す。
import { spawnSync } from 'node:child_process';

interface Stage {
	name: string;
	/** package.json の scripts の名前（と、その引数） */
	script: string[];
	env?: Record<string, string>;
	/** 失敗の出力のうち、ここから後ろを出す行（なければ末尾だけ出す） */
	failureStart?: RegExp;
}

// e2e は、直前の段（build）が作った build/ をそのまま使う。単独の `bun run test:e2e` は、今までどおり build してから開く
// （切り替えは playwright.config.ts の webServer が、この環境変数を見て行う）
export const SKIP_BUILD_ENV = 'LT_E2E_SKIP_BUILD';

const STAGES: Stage[] = [
	{ name: '型検査', script: ['check:types'], failureStart: /\bERROR\b|error TS\d+/ },
	{ name: 'lint', script: ['lint'] },
	{ name: 'check:tokens', script: ['check:tokens'] },
	{ name: 'check:i18n', script: ['check:i18n'] },
	{ name: '単体テスト', script: ['test:unit', '--run'], failureStart: /\bFAIL\b|Failed Tests/ },
	{ name: 'build', script: ['build'], failureStart: /error during build|\[plugin|\bError:|failed/i },
	{ name: 'e2e', script: ['test:e2e'], env: { [SKIP_BUILD_ENV]: '1' }, failureStart: /^\s+1\) / }
];

const TAIL_LINES = 40;
const MAX_FAILURE_LINES = 120;
const MAX_LINE_LENGTH = 300; // 型の誤りは、1行が非常に長くなることがある

// eslint-disable-next-line no-control-regex
const stripAnsi = (text: string) => text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');

/** 失敗した段の出力から、失敗の部分（最初の失敗の行から後ろ。見つからなければ末尾）だけを取り出す */
export function failureExcerpt(output: string, failureStart?: RegExp): string {
	// bun が足す行（実行したコマンドの `$ …` と、終了コードの `error: script …`）は、失敗の内容ではないので外す
	const lines = stripAnsi(output)
		.replace(/\r\n/g, '\n')
		.trimEnd()
		.split('\n')
		.filter((line) => !/^\$ /.test(line) && !/^error: script /.test(line))
		.map((line) => (line.length > MAX_LINE_LENGTH ? `${line.slice(0, MAX_LINE_LENGTH)}…` : line));
	const start = failureStart ? lines.findIndex((line) => failureStart.test(line)) : -1;
	const excerpt = start >= 0 ? lines.slice(start) : lines.slice(-TAIL_LINES);
	if (excerpt.length <= MAX_FAILURE_LINES) return excerpt.join('\n');
	// 長いときは、はじめと終わり（失敗の件数の行）を残す
	return [...excerpt.slice(0, MAX_FAILURE_LINES - TAIL_LINES), `…（${excerpt.length - MAX_FAILURE_LINES + TAIL_LINES} 行を省略）`, ...excerpt.slice(-TAIL_LINES)].join('\n');
}

function run(stage: Stage): { ok: boolean; output: string; seconds: number } {
	const started = Date.now();
	const result = spawnSync(process.execPath, ['run', ...stage.script], {
		encoding: 'utf8',
		env: { ...process.env, ...stage.env },
		maxBuffer: 256 * 1024 * 1024
	});
	const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `\n${result.error.message}` : ''}`;
	return { ok: result.status === 0 && !result.error, output, seconds: (Date.now() - started) / 1000 };
}

if (import.meta.main) {
	for (const [index, stage] of STAGES.entries()) {
		const label = `[${index + 1}/${STAGES.length}] ${stage.name}`;
		const { ok, output, seconds } = run(stage);
		if (ok) {
			console.log(`${label} 通過（${seconds.toFixed(1)}秒）`);
			continue;
		}
		console.error(`${label} 失敗（bun run ${stage.script.join(' ')}）\n`);
		console.error(failureExcerpt(output, stage.failureStart));
		console.error(`\ncheck 失敗：${stage.name}（以降の段は実行していません）`);
		process.exit(1);
	}
	console.log('\ncheck OK');
}
