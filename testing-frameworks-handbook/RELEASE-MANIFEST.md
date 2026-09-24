# Release manifest

生成日: 2026-07-19

## 内容

- 34章の解説Markdown（初学者向けから研究・実運用まで）
- 100種類のtest design card
- 8言語のClassical/London比較ラボ
- HTTP integration、OpenAPI/Pact contract、property、Storybook/Vitest browser component/a11y、Playwright 3-engine critical journey/flakeラボ
- fast-check 4.9 property/metamorphic/differential/shrink suiteとGo coverage-guided parser fuzzを含むadvanced techniqueラボ
- StrykerJS/PIT/Infection/cargo-mutants/curated/catalog mutantによるrisk-based mutation laneとdecision ledger
- coordinated omissionを避けたopen-model load generatorとload/stress/spike/soak/capacity/microbenchmark分離ラボ
- threat-model駆動abuse-case test、secret/SAST/workflow/SCA scan、SBOM署名、finding ledgerのsecurity verification lab
- seed再現可能なdeterministic simulationとabort/rollback付きchaos experimentのresilience lab
- fake model・versioned datasetによるdata/ML/RAG/LLM-as-judge/agent sandbox evaluation lab
- Nix flakeとtoolchain別development shell
- GitHub Issue本文52件
- test design、strategy、device matrix、research reproduction、testing policy exception ADR template
- source/research links、validation report、license

## Archiveから除外する生成物

- `node_modules`、`vendor`
- `build`、`target`、`.gradle`
- Playwright report/test results
- Storybook static build
- `.pact-artifacts`
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
