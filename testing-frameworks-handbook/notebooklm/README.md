# NotebookLM knowledge base

ハンドブック全体（docs 33章 + issues 52件）を、NotebookLMへそのまま取り込める6つの「観点別バンドル」にまとめたものです。`../scripts/build-notebooklm.sh` で再生成できます。

## 取り込み手順

1. [notebooklm.google.com](https://notebooklm.google.com) で新しいノートブックを作成する。
2. 「ソースを追加」でこのディレクトリの `01`〜`06` のMarkdownファイルをアップロードする（6ソース）。
3. ノートブック名を「Testing Frameworks Handbook 2026」などにする。

## バンドル構成

| File | 観点 | 含む内容 |
|---|---|---|
| 01-foundations-schools-frameworks.md | 基礎・思想 | 初学者向け解説、Classical vs London、framework比較、言語差、用語集 |
| 02-design-oracles-levels.md | 設計・oracle | 境界設計、test double、taxonomy、oracle、テストレベル、decision tree |
| 03-generative-research-frontier.md | 生成・研究 | property/fuzz/mutation、研究ガイド、最先端7観点マップ |
| 04-integration-e2e-operations.md | 統合・運用 | integration/E2E深掘り、performance/security/resilience、CI・flakiness、ECケーススタディ |
| 05-ai-data-tools-2026.md | AI・ツール | data/ML/LLM/agentテスト、2026 tool landscape、100テストカード、選定ガイド |
| 06-hands-on-roadmap-issues.md | 実践 | 全Issueバックログ、Nixセットアップ、情報源 |

## おすすめの使い方

- **音声概要（Audio Overview）**: 出力言語を日本語にして、バンドル1〜3から通勤用の解説を生成する。
- **学習ガイド／FAQ**: バンドルごとに生成し、issues の演習前の予習に使う。
- **観点横断の質問例**:
  - 「Classical schoolとLondon schoolの違いを、oracle設計の観点から説明して」
  - 「LLM生成テストの弱点と、mutation testingで審査すべき理由は？」
  - 「deterministic simulation testingは従来のchaos engineeringと何が違う？」
  - 「うちはE2Eだけ厚い。7観点診断だとどこが弱い？」

## 注意

- バンドルは生成物です。内容を直したいときは `docs/`・`issues/` を編集して再生成してください。
- バンドル内の相対リンクは連結により解決しません（NotebookLMはリンクを辿らないため実害なし）。ブラウズ用途では元の `docs/` を読んでください。
- NotebookLMの回答はソースに基づきますが、引用元チャンクを確認してから実務判断に使ってください。
