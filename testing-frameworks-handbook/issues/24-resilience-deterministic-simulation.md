# test(resilience): fault injection/chaos/deterministic simulationを設計する
<!-- labels: resilience,chaos-engineering,distributed-systems -->

## Tasks

- [ ] clock/network/disk/random/scheduler seamを棚卸し
- [ ] retry/backoff/circuit breaker/idempotency test
- [ ] deterministic seedでdelay/failure scheduleを再現
- [ ] steady state、blast radius、abort conditionを定義
- [ ] Chaos Monkey/Kubernetes chaos候補をcontrolled環境で評価
- [ ] simulationとreal environmentのsemantic gapを検証

## Acceptance criteria

- [ ] failureをseedから再現可能
- [ ] chaos experimentが安全にabort/rollback可能

