# Testing Frameworks: Design, Schools, and Polyglot Hands-on

2026年7月時点のテスト設計を、思想・言語・実装・運用の4方向から学ぶための実行可能な教材です。

このリポジトリで扱う中心テーマは次のとおりです。

- Classical（Detroit／Chicago）school と London（mockist）school の本当の違い
- xUnit、fixture、parameterized test、property-based test、fuzzing、mutation test
- unit／integration／contract／E2E の責務分担
- Python、JavaScript／TypeScript、Java／Kotlin、C#、C++、Go、Rust、PHP の言語差
- Mocha、AVA、Node test runner、pytest、JUnit 6、Truth、NUnit、MSTest/MTP、Catch2、Go `testing`、Rust `cargo test`／`rstest`、PHPUnit／Infection
- Pact、TestCafe、Playwright、Airtest、EarlGrey、mountebank など専門ツールの位置づけ
- Nix による再現可能な開発環境

## 最短ルート

```bash
nix develop
./scripts/test-all.sh
```

Nix が未導入なら、先に [docs/12-nix-setup.md](docs/12-nix-setup.md) を参照してください。初回は各エコシステムの依存関係を取得するためネットワーク接続が必要です。

テストを初めて体系的に学ぶ場合は、最初に[初学者向け「あらゆるテスト」やさしい解説](docs/00-beginner-friendly-all-tests.md)を読んでください。専門用語を先に覚えなくても、ECサイトの例から全体像を理解できます。

## 学習順

1. [初学者向けやさしい解説](docs/00-beginner-friendly-all-tests.md)
2. [全体マップ](docs/00-map.md)
3. [テストの基礎](docs/01-foundations.md)
3. [Classical と London の深掘り](docs/02-london-vs-classical.md)
4. [フレームワーク比較](docs/03-framework-catalog.md)
5. [言語ごとの差](docs/04-language-differences.md)
6. [境界とテストポートフォリオ](docs/05-boundaries-and-portfolio.md)
7. [test double](docs/06-test-doubles.md)
8. [property／fuzz／mutation／contract／E2E](docs/07-advanced-testing.md)
9. [選定ガイド](docs/08-selection-guide.md)
10. [本番プロジェクト導入](docs/09-production-strategy.md)
11. [Google面接向け説明](docs/10-interview-guide.md)
12. [公式情報源](docs/11-sources.md)
13. [研究論文から見る最新のテスト](docs/13-research-and-modern-practice.md)
14. [全テスト種別の完全taxonomy](docs/14-complete-testing-taxonomy.md)
15. [2026 tool landscape](docs/15-tool-landscape-2026.md)
16. [あらゆるテストを設計する共通手順](docs/16-how-to-design-any-test.md)
17. [Test oracle完全ガイド](docs/17-test-oracles-deep-dive.md)
18. [Unitからproduction verificationまでの境界設計](docs/18-test-levels-deep-dive.md)
19. [生成・探索型テスト](docs/19-generative-and-search-based-testing.md)
20. [Integration testing完全ガイド](docs/20-integration-testing-deep-dive.md)
21. [E2E・Acceptance・BDD完全ガイド](docs/21-e2e-and-acceptance-deep-dive.md)
22. [Performance・Security・Resilience](docs/22-performance-security-resilience.md)
23. [Data・ML・LLM・Agent testing](docs/23-data-ml-llm-agent-testing.md)
24. [CI・Flakiness・テスト経済性](docs/24-ci-flakiness-economics.md)
25. [言語・framework内部構造](docs/25-language-framework-internals.md)
26. [100種類のテスト設計カード](docs/26-100-test-types.md)
27. [論文を実務へ適用する研究ガイド](docs/27-research-guide.md)
28. [ECサイトを例にした完全test strategy](docs/28-case-study-commerce.md)
29. [テスト用語集](docs/29-glossary.md)
30. [どのテストを書くかDecision guide](docs/30-decision-tree.md)
31. [最先端テストを「7つの観点」で理解する](docs/31-frontier-multi-perspective.md)

実案件へ転用する場合は、[test design card](templates/test-design-card.md)、[test strategy template](templates/test-strategy-template.md)、[研究再現template](templates/research-reproduction.md)をコピーして使えます。

## ハンズオン

すべて同じ `Checkout` ドメインを使います。これにより、構文ではなく設計思想を比較できます。

| 言語 | 主な runner／framework | Classical | London | 追加テーマ |
|---|---|---:|---:|---|
| Python | pytest 9 | yes | yes | fixture、parametrize、unittest.mock |
| JavaScript | Node test、Mocha 11、AVA 8 | yes | yes | concurrency、isolation、Sinon |
| Java | JUnit 6 | yes | yes | Mockito、Truth、parameterized test |
| C# | NUnit 4、MSTest 4／MTP | yes | yes | constraints、runner と framework の分離 |
| C++ | Catch2 3 | yes | yes | SECTION、RAII、手書き spy |
| Go | 標準 `testing` | yes | yes | table test、interface、fuzzing |
| Rust | `cargo test`、rstest | yes | yes | ownership、trait、unit/integration 境界 |
| PHP | PHPUnit 13 | yes | yes | MockObject、Infection |

[labs/README.md](labs/README.md) から各ラボに進めます。

`labs/system` には、同じWeb applicationに対するcomponent、real HTTP integration、API contract、acceptance、Playwright E2E、accessibilityの縦断例があります。

`labs/advanced` には、同じproduction codeに対してexample、property、metamorphic、differential、model-based、concurrency、fault-injection、characterization、snapshot、performanceを当てる比較実験があります。

## Issue backlog

[issues/README.md](issues/README.md) に、学習・実装・検証・発展課題を依存順で並べています。各ファイルはそのまま GitHub Issue 本文として使えます。

```bash
./scripts/create-issues.sh --dry-run
# 内容を確認後
./scripts/create-issues.sh --apply
```

## NotebookLM knowledge base

全docsとIssueを、NotebookLMへ取り込める6つの観点別バンドルにまとめています。生成済みファイルは [notebooklm/](notebooklm/README.md) にあり、docs更新後は次で再生成します。

```bash
./scripts/build-notebooklm.sh
```

## 重要な結論

- runner、framework、assertion library、mock library、specialized testing tool は別カテゴリです。人気順だけで比較してはいけません。
- Classical と London は敵対する宗派ではありません。境界と変更リスクに応じて混ぜるのが実務的です。
- mock の数ではなく、テストが「公開された振る舞い」を守っているか、「現在の実装手順」を固定しているかを見ます。
- coverage は未実行箇所の発見には使えますが、正しさの証明にはなりません。mutation score と production risk を合わせて判断します。
- AI生成testは下書きとして有用ですが、compile率やcoverageだけで採用しません。oracle、mutation score、test smell、flakiness、人による仕様確認をgateにします。
- E2E を増やす前に、domain test、component/integration test、contract test でどこまで欠陥を局所化できるかを確認します。

## 検証範囲

[VALIDATION.md](VALIDATION.md) に、この生成環境で実行できた確認と、Nix 環境で実行すべき確認を分けて記録しています。

ZIPの収録範囲と再生成方法は[RELEASE-MANIFEST.md](RELEASE-MANIFEST.md)を参照してください。

## ライセンス

- 文書: CC BY 4.0（[LICENSE-DOCS](LICENSE-DOCS)）
- サンプルコード: MIT（[LICENSE-CODE](LICENSE-CODE)）
