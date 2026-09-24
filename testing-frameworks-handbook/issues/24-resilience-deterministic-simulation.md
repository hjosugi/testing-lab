# test(resilience): fault injection/chaos/deterministic simulationを設計する
<!-- labels: resilience,chaos-engineering,distributed-systems -->

## Tasks

- [x] clock/network/disk/random/scheduler seamを棚卸し
- [x] retry/backoff/circuit breaker/idempotency test
- [x] deterministic seedでdelay/failure scheduleを再現
- [x] steady state、blast radius、abort conditionを定義
- [x] Chaos Monkey/Kubernetes chaos候補をcontrolled環境で評価
- [x] simulationとreal environmentのsemantic gapを検証

## Acceptance criteria

- [x] failureをseedから再現可能
- [x] chaos experimentが安全にabort/rollback可能
