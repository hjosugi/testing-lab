# test(perf): benchmark/load/stress/spike/soak/capacityを分離する
<!-- labels: performance-testing,load-testing,needs-infrastructure -->

## Tasks

- [x] SLOとworkload modelを定義
- [x] microbenchmarkとsystem loadを別suite化
- [x] k6/JMeter/Gatling候補を比較
- [x] coordinated omission、warm-up、client bottleneckを確認
- [x] p50/p95/p99、error rate、saturationを保存
- [x] soakでleak/queue buildupを検証

## Acceptance criteria

- [x] functional E2E timingを性能根拠に使わない
- [x] capacity limitとdegradation behaviorがdocument化
