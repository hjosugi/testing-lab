# Release manifest

生成日: 2026-07-12

## 内容

- 32章の解説Markdown（初学者向けから研究・実運用まで）
- 100種類のtest design card
- 8言語のClassical/London比較ラボ
- HTTP integration、API contract、property、Playwright/a11yラボ
- dependency-free advanced techniqueラボ11件
- Nix flakeとtoolchain別development shell
- GitHub Issue本文51件
- test design、strategy、research reproduction template
- source/research links、validation report、license

## Archiveから除外する生成物

- `node_modules`、`vendor`
- `build`、`target`、`.gradle`
- Playwright report/test results
- Python bytecode

依存物を同梱せずlock fileとNix定義を同梱することで、archiveを小さくし、取得元とversionをreview可能にします。

## 再生成

```bash
./scripts/package.sh
```

scriptはpathをsortし、ZIP extra metadataを外します。ZIP自体のtimestampはsource file timestampに依存するため、bit-for-bit reproducible releaseが必要ならsource timestampを固定したrelease pipelineで実行してください。

## Validation

詳細は[VALIDATION.md](VALIDATION.md)を参照してください。未導入toolchainを含む正式gateは次です。

```bash
nix develop --command env STRICT=1 ./scripts/bootstrap.sh
nix develop --command ./scripts/check-lockfiles.sh
nix develop --command env STRICT=1 ./scripts/test-all.sh
```
