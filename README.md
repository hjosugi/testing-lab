# testing-lab

テスト設計・テストフレームワークを「思想・実装・運用・研究」の多観点で学ぶための実験リポジトリです。

## 内容

- [testing-frameworks-handbook/](testing-frameworks-handbook/) — 本体。docs 32章、8言語のハンズオンlab、実行可能なintegration/contract/property/E2E例、Issueバックログ52件、NotebookLM取り込み用バンドル。

## はじめかた

```bash
cd testing-frameworks-handbook
cat README.md
nix develop --command env STRICT=1 ./scripts/bootstrap.sh
nix develop --command env STRICT=1 ./scripts/test-all.sh
```

real Postgres integrationを含む個別labもNix shellから実行できます。Docker daemonだけはhost側で利用可能にしてください。

最先端テストの全体像を先に掴みたい場合は [docs/31-frontier-multi-perspective.md](testing-frameworks-handbook/docs/31-frontier-multi-perspective.md)（7つの観点マップ）から。

## Issueバックログ

このリポジトリのGitHub Issuesには、`testing-frameworks-handbook/issues/` の52件（学習→8言語lab→統合/UI→専門領域→運用/研究）が登録されています。Phase順は [issues/README.md](testing-frameworks-handbook/issues/README.md) を参照。
