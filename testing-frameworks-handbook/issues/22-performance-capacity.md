# test(perf): benchmark/load/stress/spike/soak/capacityを分離する
<!-- labels: performance-testing,load-testing,needs-infrastructure -->

## Tasks

- [ ] SLOとworkload modelを定義
- [ ] microbenchmarkとsystem loadを別suite化
- [ ] k6/JMeter/Gatling候補を比較
- [ ] coordinated omission、warm-up、client bottleneckを確認
- [ ] p50/p95/p99、error rate、saturationを保存
- [ ] soakでleak/queue buildupを検証

## Acceptance criteria

- [ ] functional E2E timingを性能根拠に使わない
- [ ] capacity limitとdegradation behaviorがdocument化

