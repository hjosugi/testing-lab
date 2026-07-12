# Integration testing完全ガイド

## 一言で

Integration testingは、本物の境界を使って「接続・変換・設定・実装差」が正しいか確認するテストです。

## なぜUnit testだけでは足りないか

Unit testがgreenでも次は壊れます。

- SQL column名が違う
- transaction isolationが想定と違う
- JSON enumの大文字小文字が違う
- HTTP timeoutが設定されていない
- Kafka keyがなくorderingが崩れる
- timezone/encoding/localeが違う
- dependency injection wiringが誤る
- TLS/certificate/DNS/proxyが違う

## Integration testの5つの形

### 1. In-process integration

framework/router/serializer/DI containerなどを本物で動かします。外部processはfakeでも構いません。

### 2. Process-to-process integration

application processとDB/broker/mock serverをnetwork越しに動かします。

### 3. Service integration

複数の自社serviceを起動します。

### 4. Third-party sandbox integration

payment/email/cloudなどvendor sandboxを使います。

### 5. Production connectivity smoke

実production dependencyとの最小安全操作を確認します。

これらを同じ`integration` directoryへ混ぜるとruntimeとownershipが分からなくなります。

## Database integration

### 必ず本番と同じengineを使うrisk

in-memory DBでは次が異なる可能性があります。

- SQL dialect
- collation/case sensitivity
- timestamp/decimal
- locking/isolation
- index/query planner
- constraint timing
- JSON/array/type
- extension

### Testcontainersの使い方

```text
immutable image digest
random host port
readiness condition
production migration適用
unique database/schema per worker
automatic cleanup
failure logs保存
```

container reuseで速度を上げる場合もtest data isolationを保ちます。

### Transaction rollback pattern

各testをtransactionで囲みrollbackすると速いですが、次を隠す可能性があります。

- commit hook
- after-commit event
- real transaction boundary
- multiple connection visibility
- deadlock

rollback testとcommit integration testを分けます。

### Repository contract suite

同じbehavior suiteをin-memoryとreal DBへ実行します。

```text
saves and reloads
rejects duplicate id
optimistic version conflict
preserves decimal/timezone
pagination ordering stable
```

fakeがcontractを満たしても性能/query planは保証しません。

### Migration test

```text
empty -> latest
previous supported -> latest
large representative data -> latest
interrupted migration -> resume
mixed old/new application -> compatible phase
rollback where supported
```

schema diffだけでなくdata transformationを照合します。

## HTTP integration

### Server-side

- route/method
- content type/negotiation
- validation
- authentication/authorization filter
- error mapping
- body/header limit
- cancellation/disconnect
- compression
- observability context

### Client-side

- base URL/path/query encoding
- headers/auth/idempotency key
- serialization/deserialization
- timeout/deadline
- retry policy
- error classification
- connection pooling
- proxy/TLS where necessary

### Mock HTTP serverの限界

WireMock/mountebank等はwire-level requestを確認できますが、real vendorのTLS、rate limit、undocumented behavior、eventual consistencyは保証しません。少数sandbox smokeで補います。

## Messaging integration

### 確認するもの

- topic/queue/exchange name
- serializer/schema
- partition key
- ordering scope
- ack/nack
- retry/backoff
- dead-letter routing
- duplicate handling
- consumer group/rebalance
- tracing headers
- large message limit

### At-least-onceを前提にする

```text
publish succeeded but ack lost
consumer processed but offset commit failed
redelivery after timeout
```

duplicateはexceptionではなく通常failure modeとしてtestします。

### Async assertion

fixed sleepではなくdeadline内のconditionをpollします。

```text
await until order status == CONFIRMED
deadline 10s
poll 100ms with backoff
on timeout dump consumer lag, DLQ, trace
```

## Filesystem integration

- path separator/case sensitivity
- atomic rename
- permission
- disk full/quota
- concurrent writer
- symlink/traversal
- encoding/newline
- large file/partial write
- cleanup after crash

temporary directoryはtestごとに固有にし、current working directoryへ依存しません。

## Cache integration

- serialization/version
- TTL/expiry
- eviction
- stampede
- key collision/tenant prefix
- unavailable cache fallback
- consistency with source of truth
- cluster behavior

local map fakeではTTL、eviction、network、cluster behaviorが消えます。

## Search engine integration

- analyzer/tokenizer
- mapping
- refresh/eventual visibility
- pagination/search-after
- relevance fixtures
- alias/index migration
- partial failure

exact rankingを固定しすぎるとengine upgradeで壊れます。business-critical orderと許容差を分けます。

## Object storage integration

- multipart upload
- checksum
- metadata/content type
- range request
- eventual consistency assumption
- signed URL expiry
- permission/encryption
- cleanup/versioning

emulatorとmanaged serviceの差を少数cloud testで確認します。

## Email integration

local capture serverで次を確認します。

- envelope/from/to
- MIME/HTML/text
- attachment
- charset
- link correctness
- no PII leak

deliverability、SPF/DKIM/DMARCはseparate environment/monitoringが必要です。

## Identity provider integration

- OIDC discovery/JWKS rotation
- issuer/audience
- expiry/clock skew
- redirect URI/cookie/SameSite
- role/claim mapping
- logout/revocation
- key rotation

JWT library Unit testだけではconfiguration errorを検出できません。

## Cloud emulator integration

LocalStack/Azurite等は高速ですが、完全互換ではありません。

三層にします。

1. fake: domain/application test
2. emulator/container: protocol integration
3. real cloud sandbox: managed behavior smoke

## Shared environmentの問題

- test data collision
- deployment race
- stale service version
- hidden manual configuration
- quota/rate limit
- non-repeatable external state
- ownership不明

可能ならephemeral environment、難しければnamespace、unique identifiers、environment version manifestを使います。

## Parallel execution

resourceをworkerごとに分けます。

```text
database/schema: test_<worker>
topic: orders_<run_id>
tenant: test-<run_id>-<worker>
port: OS-assigned 0
filesystem: unique temp dir
```

global cleanupで他workerのdataを消さないよう、作成したresourceだけを追跡します。

## Cleanup failure

cleanupはtest success/failureに関わらず実行します。ただしcleanup failureをsilent ignoreするとleakを隠します。

- primary test failureとcleanup failureを両方記録
- TTL/tag-based janitor
- budget/quota alert
- destructive cleanup scope guard

## Integration test speed

改善順:

1. 不要なfull contextを削る
2. dependency bootをsuite単位で共有しdataを分離
3. migration/image cache
4. parallelization
5. affected-test selection
6. contract/componentへ下げられる重複を削る

mockへ置き換えるだけでintegration coverageを失わないようにします。

## Failure diagnosis

保存するevidence:

- application/dependency version
- configuration checksum
- request/response redacted
- DB/broker logs
- migration version
- container health
- trace/span IDs
- seed/run/worker IDs

## Integration test checklist

- [ ] 対象boundaryをtest名へ書いた
- [ ] productionと同じprotocol/engine/versionか
- [ ] image/version/digestを固定
- [ ] readinessはport openだけで十分か
- [ ] data isolation/parallel safety
- [ ] commit/async behaviorをrollbackで隠していないか
- [ ] duplicate/timeout/partial failureを含むか
- [ ] cleanup/leak detection
- [ ] fake/emulator/real serviceのgapを記録
- [ ] failure時のlogs/tracesを保存

