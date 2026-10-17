# 仕様変更サマリー：全言語の標準書体を Noto Sans 系にし、Google Fonts の Web フォントに統一する

- 状態: **承認待ち**（実施していない）
- きっかけ: ユーザーから「トークンのタイポで、全言語の標準フォントを Noto Sans 系（Noto Sans JP・Noto Sans SC）にし、OS のフォントを使わず Google Fonts API の Web フォントに統一する」との打診
- 現行: `261016234906_{imple,tasks,walk}_lt_time_keeper.md`、プランアセット v3

---

## 1. 変更内容と理由

確定事項（トークンの値、および SPEC の「外部への通信をしない。外部フォントは使わない」）を変えるため、仕様変更として扱う。

- 書体トークンを Noto Sans 系にそろえる
  - `--font-sans-ja`: "Noto Sans JP", sans-serif
  - `--font-sans-en`: "Noto Sans", sans-serif
  - `--font-sans-zh-hans`: "Noto Sans SC", sans-serif
  - OS 書体（Hiragino・Yu Gothic UI・Segoe UI・PingFang SC・system-ui 等）は並べない。最後の `sans-serif` は、読み込み前・失敗時の最低限の保険としてだけ残す
  - 英語は「Noto Sans系」の範囲で Noto Sans とする（ご指定は JP・SC のみのため要確認、下の確認事項 1）
- 読み込みは Google Fonts の CSS API（`fonts.googleapis.com/css2`）を使い、`font-display: swap` を指定する。必要な太さ（400・500・700。タイマー数字の 600 を含む）だけを指定する
- 「外部への通信をしない／外部フォントは使わない」を、「Google Fonts への通信だけを許す（解析ツール・外部音源は引き続き使わない）」に改める
- 影響して決めること
  - **オフライン**：PWA はオフライン動作が要件のため、Service Worker で Google Fonts の CSS と woff2（`fonts.googleapis.com`・`fonts.gstatic.com`）を実行時にキャッシュする。初回起動がオフラインのときは書体が出ず `sans-serif` で表示される（許容するか要確認、確認事項 2）
  - **日本語・中国語の分割配信**：Google Fonts は CJK を unicode-range で細かく分割して配信するため、使う文字だけが読み込まれる。これはそのまま使う

## 2. 確認事項（承認時に決めてほしい点）

1. **英語の書体**：Noto Sans にする（推奨）。
2. **初回オフライン**：初回だけはオンラインが必要、でよいか。よければ上記のランタイムキャッシュで進める（推奨）。ビルド時に自前配信する案は、「Google Fonts API を使う」の指定から外れるため採らない。
3. **等幅数字 `--font-digits`**（タイマー・数値入力・Kbd）：現状は OS の等幅書体。OS 書体を使わない方針に合わせ、次のどちらかにする。
   - A（推奨）: `"Noto Sans"` ＋ `tabular-nums`（`--font-digits-variant` が既にある）。数字は Noto Sans のまま統一され、桁幅も揺れない
   - B: `"Noto Sans Mono"`。完全な等幅だが、字形が本文とやや異なる

## 3. 影響するドキュメントと項目

- プランアセット（全ファイルを v4 に。変更のないものも写す）
  - `tokens`：書体トークンと冒頭コメントの改訂、Google Fonts 読み込みの記述
  - `SPEC`：148 行付近の書体、150 行の通信の規定、技術スタック／オフラインの該当節
  - `brand`：「書体」節（OS の書体だけを使い、外部フォントは読み込まない、を改訂）
  - `mock`：`:root` の写し（モックは参照専用のため、本来は編集しない。トークンの写しの更新が必要なので、claude.ai に差し戻して改訂版を受け取るか、確認事項として扱う）
- 実装（承認後に tasks へ追加）
  - `src/lib/theme/tokens.css`：書体トークンの反映
  - `src/app.html`：`preconnect` と Google Fonts の `<link>`
  - `src/service-worker/index.ts`：Google Fonts のランタイムキャッシュ
  - `CONTRIBUTING.md`・`README.md`・`docs/brand/`：外部通信なしの記述があれば改訂
  - テスト：Service Worker・e2e（オフライン確認）に外部フォントの扱いを追加
- 検証（walk に追加）：3言語での字形確認（ja と zh-Hans で同じ漢字の字形が異なること）、オフライン再訪時の書体、初回オフライン時の崩れ、タイマー数字の桁幅

## 4. 承認後の手順

1. 現行の imple・tasks・walk とプランアセット v3 を `archived/` へ移動する
2. プランアセット全ファイルを v4 で作成し、新タイムスタンプの imple・tasks・walk を `planning_dialog/` に作る（完了済み項目は ID・チェック・実施メモを引き継ぎ、新規項目は未使用の番号を振る）
3. 状態をこのファイルに記録する
4. 着手する項目の ID を明示して実施する
