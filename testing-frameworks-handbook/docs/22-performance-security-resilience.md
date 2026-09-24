# Performance・Security・Resilience

これらは「non-functional」とまとめられがちですが、設計・oracle・environmentが大きく違います。

# Part 1: Performance testing

## まずSLOを決める

```text
POST /orders
p95 < 300ms
p99 < 800ms
error rate < 0.1%
at 500 requests/sec
with 10k active customers
for 30 minutes
```

「速いこと」だけではtestできません。

## Microbenchmark

function/algorithmの小さな性能を測ります。

注意:

- JIT warm-up
- dead-code elimination
- constant folding
- CPU frequency/noise
- GC/allocation
- statistical comparison

unit test内でwall clockを測り`< 10ms`とassertするのは不安定です。専用benchmark harnessを使います。

## Component benchmark

serializer、query、cache、business componentなどをdependency込みで測ります。

## Load test

想定通常負荷でSLOを満たすか確認します。

workload model:

- operation mix
- arrival rate vs closed users
- think time
- data cardinality
- cache warm/cold
- read/write ratio
- auth/session

## Stress test

負荷を限界以上へ上げ、bottleneckとdegradationを確認します。

見るもの:

- saturation point
- error type
- queue growth
- timeout propagation
- recovery after load removal
- data correctness

## Spike test

急激な負荷変化を与えます。autoscaling起動時間、connection storm、cache stampedeを確認します。

## Soak/endurance test

長時間実行で次を探します。

- memory/thread/file descriptor leak
- connection leak
- queue/lag accumulation
- log/disk growth
- cache fragmentation
- scheduled task overlap

## Capacity test

安全に提供できる最大traffic/data/tenantを求めます。限界ぎりぎりをproduction capacityにせずheadroomを持ちます。

## Scalability test

resourceを増やしたときにthroughput/latencyがどう変化するか測ります。

- vertical
- horizontal
- partition/shard
- hot key
- coordination overhead

## Volume test

大量data sizeでquery、index、memory、backup、migrationが機能するか確認します。request rateとは別です。

## Latency injection test

dependency latencyがtailへどう伝播するか確認します。averageだけでなくp99とdeadline budgetを見ます。

## Coordinated omission

systemが遅い間にload generatorがrequestを送らなくなると、遅延を過小評価します。arrival-rate modelとtool behaviorを確認します。

実行例は[`labs/performance`](../labs/performance/README.md)です。同じ400ms stallに対し、closed-model clientのp99は100ms未満に留まり、intended start time基準のopen modelではp99が250msを超えることをtestで固定しています。load generator自身のsend遅れも記録し、予算を超えたrunはSLO判定をinvalidにします。

## Performance correctness

高速でもresponse/drop/dataが誤っていれば失敗です。

- response validation sampling
- no lost/duplicate writes
- final state reconciliation
- error classification

## Baselineとregression

hardware/cloud noiseを考慮し、confidence interval、effect size、複数runを使います。小さい変化を毎回failさせるとnoiseになります。

# Part 2: Security testing

## Threat modelから始める

asset、actor、entry point、trust boundary、abuse caseを整理します。

```text
Asset: order/payment/customer PII
Actor: anonymous/customer/support/admin/vendor
Boundary: browser/API/service/DB/third-party
Abuse: IDOR, privilege escalation, replay, injection, exfiltration
```

実行例は[`labs/security`](../labs/security/README.md)です。8件のabuse caseをthreat modelのattacker・asset・trust boundaryへ結び、critical caseはrequired checkへ接続し、scanner findingはexploit impact・owner・SLA・suppression期限を持つledgerで管理します。

## SAST

source/bytecodeのpattern/data flowを分析します。

長所:

- early/fast
- code location

限界:

- runtime configuration
- business authorization
- false positive/negative

## SCA

dependency、license、known vulnerabilityを確認します。

- direct/transitive
- runtime reachability
- exploitability
- lockfile/SBOM
- fix availability
- exception expiry

## DAST

running applicationへ外部からprobeします。authentication/seed/cleanupを設計し、productionへ破壊的scanを送らないようscopeを固定します。

## IAST/RASP-assisted test

runtime instrumentationを用いてsource/sinkを観測します。environment overheadとcoverage範囲を理解します。

## Authentication tests

- invalid/expired/revoked token
- issuer/audience/signature
- session fixation
- CSRF
- logout/invalidation
- MFA recovery
- password reset enumeration
- clock skew/key rotation

## Authorization tests

role matrixだけでなくresource ownership/tenantを確認します。

```text
actor x action x resource owner x state
```

deny-by-default、horizontal/vertical privilege escalationをtestします。

## Injection tests

- SQL/NoSQL/LDAP/OS command
- template
- header/CRLF
- log injection
- prompt injection/tool injection

escapingだけでなくparameterization、allowlist、sandboxを確認します。

## Web security tests

- XSS
- CSRF
- SSRF
- request smuggling
- open redirect
- path traversal
- insecure upload
- CORS/CSP/security headers

## API security tests

- BOLA/IDOR
- mass assignment
- excessive data exposure
- rate limit/resource consumption
- inventory/version exposure
- unsafe third-party API consumption

## Cryptographic tests

- known answer vectors
- key/nonce uniqueness
- algorithm/mode policy
- rotation/backward compatibility
- invalid signature/ciphertext
- constant-time where required
- secret never logged

crypto primitive自体を自作testで証明せず、標準library + official vectorを使います。

## Fuzz/security testing

parser/protocolへsanitizer付きfuzzを行い、crashだけでなくresource exhaustion、state confusionを探します。

## Penetration test/red team

自動scannerが見つけにくいchain、business logic、social/operational gapを人が探索します。結果を再現testとthreat modelへ戻します。

## Supply-chain tests

- source/dependency provenance
- signed artifact
- reproducible build where possible
- SBOM
- malicious package/name confusion
- CI secret/permission
- release integrity

# Part 3: Resilience testing

## Resilienceとは

故障を防ぐだけでなく、故障中に安全にdegradeし、回復できる能力です。

## Failure modes

- fail-stop
- slow/timeout
- partial response
- stale/incorrect response
- duplicate
- reorder
- split brain
- resource exhaustion
- clock skew/jump
- operator/config error

exceptionだけをstubするtestはfailure spaceの一部です。

## Retry test

- retryable/non-retryable classification
- max attempts/deadline
- exponential backoff/jitter
- idempotency
- retry storm
- cancellation

retryでlatency budgetを超えたり、non-idempotent operationを重複実行したりしないか確認します。

## Timeout/deadline test

各hopのtimeout合計がend-to-end deadline内か確認します。timeoutはfailure発生まで待つ時間であり、適当に大きくしません。

## Circuit breaker test

- open threshold
- half-open probe
- recovery
- per-dependency isolation
- metrics/alert

## Bulkhead test

1 dependency/tenant/workloadのresource exhaustionが他へ波及しないか確認します。

## Graceful degradation

recommendationが停止してもcheckoutは動く、cache staleを表示する等、どの機能を落とせるか仕様化します。

## Fault injection test

application/component levelでcontrolled faultを注入します。deterministicでPRにも配置できます。

## Chaos experiment

production-like/productionでsystem-level hypothesisを検証します。

必須:

- steady state
- hypothesis
- blast radius
- abort condition
- observability
- rollback
- approval/owner
- learning capture

## Disaster recovery test

- region/account failure
- DNS/failover
- data replication/RPO
- restore/RTO
- key/secret availability
- runbook/personnel
- customer communication

## Game day

技術systemだけでなく人・process・communicationをtestします。inject、observe、decision、recovery、retrospectiveを行います。

## Deterministic simulation testing

time/network/disk/schedulerをsimulation runtimeで制御し、多数のfailure/scheduleをseedから再現します。

強み:

- rare interleaving
- fast/repeatable
- failure replay

コスト:

- architecture requirement
- simulator/real gap
- native/external dependency

## Cross-cutting checklist

- [ ] measurable requirement/SLO/threat/hypothesisがある
- [ ] workload/actor/failure modelが現実的
- [ ] correctnessも同時に確認
- [ ] destructive testのscope/abort/cleanup
- [ ] resultをaverage/one runだけで判断しない
- [ ] tool outputをbusiness riskへtriage
- [ ] productionとの差を明記
- [ ] learningをdesign/test/runbookへ戻す

