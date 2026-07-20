# test: property/fuzz/metamorphic/differential suiteを追加する
<!-- labels: property-testing,fuzzing,research -->

## Tasks

- [x] domain invariantを5件定義
- [x] generator distributionとshrinkerをreview
- [x] parser/APIへcoverage-guided fuzz
- [x] oracleが難しい機能へmetamorphic relation
- [x] 旧版/別実装とのdifferential test
- [x] seeds/counterexamplesをregression corpusへ保存

## Acceptance criteria

- [x] example testでは見つからない1 defectを発見またはsynthetic defectで実証
