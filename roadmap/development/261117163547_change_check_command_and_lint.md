# 仕様変更サマリー：checkコマンドを1つにまとめ、ESLint を導入する

- 状態: **承認済み・実施済み**（261117165928）。現行の imple・tasks・walk とプランアセット v4 を `archived/` へ移し、`261117165719_{imple,tasks,walk}_lt_time_keeper.md` とプランアセット v5 を作成した。`timeline.md` に v5 の行を追記した
  - 補足：mock_v5 は参照専用のため、中のコメントにある `_v4` のファイル名は直していない（SPEC v5 の「改訂について」に、同じ中身の v5 を指すものとして読むと書いた）
- きっかけ: Agentic Coding の共通規則の改訂。「型検査・lint・テスト・i18n の自動検査を checkコマンド1つにまとめる」「walk の【エージェント】は checkコマンドが通ることを先頭の1項目にし、Phase ごとにモックとの照合（構造）を1回置く」「リリース準備で `timeline.md` に行を追記する」に、未着手の Phase 10・11 を合わせる
- 現行: `261018043249_{imple,tasks,walk}_lt_time_keeper.md`、プランアセット v4
- 関連: `261117163201_fix_recommendations_and_timeline.md`（推奨の付与と `timeline.md` の作成。軽微な修正として実施済み）
- ユーザーの決定（261117）: ESLint を導入する。checkコマンドには e2e と build も含める

---

## 1. 変更内容と理由

### 1.1 ESLint を導入する

- 開発時の依存として ESLint を足す（TypeScript と `.svelte` を対象にする。`typescript-eslint`・`eslint-plugin-svelte` を想定）。版と設定ファイルの書き方（flat config）は、インストールした版の公式ドキュメントで確かめてから書く。`sv add eslint` が使えるなら、それを優先する
- 規則は各パッケージの推奨設定を基本にする。既存のコードで出る違反は、動作を変えない範囲で直し、fix（`{タイムスタンプ}_fix_phase10.md`）に記録する。規則を外したり弱めたりする場合は、理由を imple に書く
- 整形（Prettier など）は今回は入れない
- 理由：共通規則で、checkコマンドに lint を含めることになったため。いまのプロジェクトには lint がない
- 配信物には入らない（OSS 一覧の対象外）。W10-1 の確認に含める

### 1.2 checkコマンドを1つにまとめる

- `bun run check` を、次をこの順に実行する1つのコマンドにする。最初に失敗した段で止め、その段の出力のうち失敗の部分だけを表示する。全部通ったら、各段の結果を1行ずつ表示する
  1. 型検査（いまの `check` の中身。`svelte-kit sync`・`svelte-check`・Service Worker の `tsc`）
  2. lint（ESLint）
  3. `check:tokens`
  4. `check:i18n`
  5. 単体テスト（Vitest）
  6. build
  7. e2e（Playwright）
- いまの `check` の中身は `check:types` という名前で残し、個別に実行できるようにする。`check:tokens`・`check:i18n`・`test`・`test:unit`・`test:e2e`・`check:watch` も残す
- まとめる仕組みは `scripts/check.ts`（Bun で実行）にする。名前と表示の形は、実装するときに決めて imple に書く（委任事項）
- 注意：いまの e2e は、`playwright.config.ts` の `webServer` で build してからプレビューを開いている。checkコマンドでは build を独立した段にし、e2e が同じビルドを二重に作らないようにする（方法は実装するときに決めて imple に書く。`test:e2e` を単独で実行したときは、今までどおり build してから開くことを保つ）
- `.github/workflows/release.yml` は、`bun install --frozen-lockfile` → Playwright の依存の導入 → `bun run check` → ドラフトリリースの作成、の形にする（個別の `check:tokens`・`check:i18n`・`check`・`test`・`build` の実行を1回にまとめる）
- `CONTRIBUTING.md` の「確認・テスト」と「リリース手順」とリポジトリ構成を、checkコマンドに合わせて直す
- 理由：共通規則で、自動検査を checkコマンド1つにまとめ、CI もそれを呼ぶことになったため。いまは5つのコマンドに分かれていて、walk と CI に同じ並びを何度も書いている

### 1.3 Phase 10 の walk を、新しい規則の並びにする

- W10-6 と W10-14 は、どちらも「`check:tokens`・`check:i18n`・`check`・`test`・`build` が通る」で同じ検査である。1つにまとめ、新しい ID（W10-16）で Phase 10 の walk の先頭に置く。元の2つの位置には、移動先を1行で残す
- Phase 10 で作る画面（S05b・S05c）について、エージェントがモックと構造で照合する項目がないため、足す（W10-17）。W10-16 の直後に置く
- checkコマンドと lint が本当に失敗を検出できるかを確かめる項目を足す（W10-18）。W10-17 の直後に置く
- 理由：共通規則の「checkコマンドが通る（先頭）→ モックとの照合 → 判断を要する検証」の並びに合わせるため。チェックした項目がないので、並べ替えても実施の記録には影響しない

### 1.4 リリース準備で `timeline.md` に記録する

- T11-6 に、「`timeline.md` にリリース準備 0.2.0 の行（その時点のプランアセットの版）を追記する。コミットメッセージを提示する前に行う」を足す
- 「ワークフローと同じ手順のローカル実行」は、`bun run check` を実行することになる
- 理由：共通規則で、リリース準備のときに `timeline.md` へ記録することになったため

### 1.5 プランアセットを v5 にする

- SPEC だけ、次の2か所を直す。ほかのファイル（brand・tokens・icon_master・mock）は、中身を変えずに `_v5` でコピーする
  - §4 技術スタック：表に「lint｜ESLint（TypeScript・Svelte 用のプラグイン）。開発時だけの依存」の行を足す
  - §7 配布・公開方法の「CI」：「型チェック・テスト・ビルドを行って」「辞書のキーがそろっているかの確認も、テストに含める」を、「checkコマンド（型検査・lint・トークンと辞書の検査・単体テスト・ビルド・e2e）を実行して」に直す
  - 冒頭の「改訂について」に v5 の行を足す
- 確定事項（トークンの値、画面構成、マスターSVG とそのレイヤー構成、アイコンの余白ルール）は変わらない。tokens は v4 と同じ中身なので、`check:tokens` と `gen:icons` は、最新版（v5）を自動で読んでも結果は変わらない
- モックは、これまでどおり1枚の旧形式（`lt_time_keeper_mock_v5.html`）のまま使い、画面ごとに分けない（スキルの規定）

## 2. 影響するドキュメントと項目

- **プランアセット**（`specs/`）：全ファイルを `archived/` へ移し、`_v5` で作り直す（中身が変わるのは SPEC だけ。1.5）
- **`timeline.md`**：`プランアセット v5：checkコマンドの統合と ESLint の導入 ← development/261117163547_change_check_command_and_lint.md` の行を追記する
- **imple**
  - §1 前提とバージョン：ESLint と関連するパッケージを、インストールした版で書き足す。「依存は増やさない」は、配信物に入る依存の話だと分かるように書き直す
  - §2 全体構成：`scripts/check.ts` と ESLint の設定ファイルを足す
  - §5 テストの方針：「checkコマンド」の節を足す（段の順序、止め方、失敗の表示、`check:types` などの個別のコマンド、build と e2e の二重ビルドの扱い）
  - §7 公開・CI・ドキュメント：`release.yml` の流れを `bun run check` に直し、`CONTRIBUTING.md` の中身に lint と checkコマンドを足す
- **tasks**（Phase 10・11）
  - 新規 T10-15【エージェント】ESLint を導入し、既存のコードの違反を直す。依存: T1-2。Phase 10 の先頭に置く
  - 新規 T10-16【エージェント】`scripts/check.ts` で checkコマンドをまとめ、`package.json` のスクリプト・`release.yml`・`CONTRIBUTING.md` を直す。依存: T10-15。T10-15 の直後に置く
  - T10-10：コピー元を、specs の最新版（v5）の tokens・brand・icon_master に直す（書体のトークンが変わったのは v4 で、v5 の tokens は v4 と同じ中身であることを注記する）
  - T11-3：「`check:i18n`」を「checkコマンド（中身の各段と個別のコマンド）」に直す
  - T11-6：1.4 のとおり `timeline.md` の追記を足す
  - ほかの項目は変えない
- **walk**（Phase 10・11）
  - W10-16（新規、先頭）・W10-17（新規）・W10-18（新規）を足す（3. の案）
  - W10-6・W10-14：位置に「→ W10-16 に統合した」と1行残す。チェックは入れない
  - W10-1：開発時だけの依存の例に ESLint を足す
  - W10-9：「`tokens_v4.css`」「v4 の写し」を、specs の最新版（v5）に直す
  - W10-15：「モック v4」を「モック v5（v4 と同じ中身）」に直す
  - W11-4：「（`check:i18n` を含む）」を「（checkコマンドを含む）」に直す
  - 冒頭の、モックのファイル名（`mock_v4.html`）を `mock_v5.html` に直す
- **実装・テスト**：画面と動作は変わらない。lint に合わせた書き換えは、動作を変えない範囲に限る

## 3. 変更案

tasks（Phase 10 の先頭。見出しと `Phaseの推奨` の直後に置く）：

```markdown
- [ ] T10-15 【エージェント】ESLint を導入する（TypeScript と `.svelte` を対象に、各パッケージの推奨設定を基本にした flat config。`package.json` に `lint` を足す）。既存のコードで出る違反を、動作を変えない範囲で直す
  - 依存: T1-2
  - 版と設定の書き方は、インストールした版の公式ドキュメントで確かめる。`sv add eslint` が使えるなら、それを優先する。規則を外す・弱める場合は、理由を imple に書く
  - 違反を直した箇所は `{タイムスタンプ}_fix_phase10.md` に記録する
- [ ] T10-16 【エージェント】`scripts/check.ts` を作り、`bun run check` を、型検査（`check:types` に改名）→ lint → `check:tokens` → `check:i18n` → 単体テスト → build → e2e の順に実行する1つのコマンドにする。最初に失敗した段で止め、失敗の部分だけを表示する。`release.yml` を `bun run check` を呼ぶ形に、`CONTRIBUTING.md` の確認・テスト・リリース手順・リポジトリ構成を checkコマンドに合わせて直す
  - 依存: T10-15
  - e2e がビルドを二重に作らないようにする。`test:e2e` を単独で実行したときは、今までどおり build してから開く
```

walk（Phase 10 の先頭）：

```markdown
- [ ] W10-16 【エージェント】checkコマンド（`bun run check`）が通る
  - 推奨: Sonnet・low以上
  - 依存: T10-9, T10-13, T10-14, T10-16
- [ ] W10-17 【エージェント】Phase 10 で作った画面が、モックと構造で一致する（要素の有無と配置の順序、遷移先、描かれた状態、文言の辞書キー）
  - 依存: W10-16
  - 画面: S05b, S05c
  - モックは1枚の旧形式（`lt_time_keeper_mock_v5.html`）。画面IDで位置を検索し、S05b・S05c の範囲だけを読む
- [ ] W10-18 【エージェント】checkコマンドが各段の失敗を検出し、失敗した段の失敗の部分だけを表示して止まる。型の誤り・lint の違反・色の直書き・辞書のキーの欠け・単体テストの失敗を1つずつわざと入れて確かめ、戻すと通る。`release.yml` が自動検査を `bun run check` の1回だけで行っている
  - 推奨: Sonnet・medium以上
  - 依存: W10-16
```

W10-6・W10-14（元の位置に残す1行）：

```markdown
- [ ] W10-6 【エージェント】→ W10-16 に統合した（checkコマンドを1つにまとめたため）
- [ ] W10-14 【エージェント】→ W10-16 に統合した（checkコマンドを1つにまとめたため）
```

T11-6（足す一文）：

```markdown
  - リリース前の確認のあと、コミットメッセージを提示する前に、`timeline.md` に `リリース準備 0.2.0（プランアセット v{n}）← CHANGELOG.md` の行を追記する（v{n} はその時点の specs の版）
```

## 4. 推奨

- T10-15・T10-16：Phase の推奨（Sonnet・high以上）と同じなので、`推奨:` は書かない
- W10-16：Sonnet・low以上。W10-17：Phase の推奨と同じ（Sonnet・high以上）。W10-18：Sonnet・medium以上

## 5. 承認後の手順

1. 現行の imple・tasks・walk と、`specs/` のプランアセット v4 の全ファイルを `archived/` へ移す
2. プランアセットを `_v5` で作る（SPEC は 1.5 のとおり直し、ほかは中身を変えずにコピーする）
3. 変更を反映した imple・tasks・walk を、新しいタイムスタンプで `planning_dialog/` に作る（完了済みの項目は、ID・チェック・実施メモをそのまま引き継ぐ）
4. `timeline.md` に v5 の行を追記し、このファイルの状態を「承認済み・実施済み」に直す
5. 次の着手は、W9-11【ユーザー】の完了報告を受けたあと、Phase 10 の T10-15
