import type { Dictionary, MessageKey, MessageValue } from './messages.ts';

// 疑似ロケール。ja の各値を、前後を ［…］ で囲み、長さを約1.4倍に伸ばした文字列に変える。
// 直書きの取りこぼし（変わらない文字）と、長さによる崩れを画面で見つけるための、開発時だけの言語

const OPEN = '［';
const CLOSE = '］';
const FILLER = '〜';
const GROWTH = 0.4;
const PLACEHOLDER = /\{\w+\}/g;

/** プレースホルダはそのまま残し、それ以外の文字数の約0.4倍の埋め草を足して、前後を囲む */
export function pseudolocalize(text: string): string {
	const visible = text.replace(PLACEHOLDER, '').length;
	return OPEN + text + FILLER.repeat(Math.ceil(visible * GROWTH)) + CLOSE;
}

function pseudoValue(value: MessageValue): MessageValue {
	if (typeof value === 'string') return pseudolocalize(value);
	return Object.fromEntries(Object.entries(value).map(([form, s]) => [form, pseudolocalize(s)])) as MessageValue;
}

/** 原文（ja）の辞書から、疑似ロケールの辞書を作る */
export function pseudoDictionary(source: Dictionary): Dictionary {
	return Object.fromEntries(
		(Object.entries(source) as [MessageKey, MessageValue][]).map(([key, value]) => [key, pseudoValue(value)])
	) as Dictionary;
}
