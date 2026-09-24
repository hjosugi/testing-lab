# Test oracle完全ガイド

> 実行例: [`labs/oracles`](../labs/oracles/README.md)は、critical riskごとのoracle種類・独立性・守るfailure・保証しないことをinventory化し、8言語の全testをassertionなし・常にtrue・production同一式の期待値・snapshotで静的監査し、findingをfixed/acceptedとして記録します。初回監査でperformance testの同一式oracleを発見し、独立実装へ置き換えました。

## Oracle problem

test inputを作れても、正解を判定できなければtestになりません。複雑なoptimizer、ML model、画像処理、distributed system、scientific computationでは、完全なexpected outputを手で列挙できないことがあります。

## Oracle taxonomy

### 1. Specified-output oracle

具体的なinput/output例です。

```python
assert tax(1000, rate=0.1) == 100
```

向くもの:

- business example
- boundary value
- regression defect

弱点:

- example外を探索しない
- expectedをproduction実装から写す危険
- large structured outputで保守が難しい

### 2. Predicate/invariant oracle

exact valueではなく必ず満たす性質を検証します。

```text
balance never becomes negative
decoded(encode(x)) == x
sorted output is ordered and a permutation of input
authorization never expands without explicit grant
```

invariantは強すぎるとvalid behaviorをrejectし、弱すぎるとbugを通します。

### 3. Reference oracle

信頼できる別実装と比較します。

```text
optimized_result(input) == slow_clear_reference(input)
```

referenceは遅くてもよく、単純さと独立性を優先します。同じhelper/libraryを共有するとcommon-mode bugを見逃します。

### 4. Differential oracle

複数実装、version、vendor、compiler、browserを比較します。

例:

- SQL engine間
- JSON parser間
- old/new compiler
- Chromium/Firefox/WebKit
- CPU/GPU implementation

差がbugとは限りません。仕様で許された差、floating-point tolerance、undefined behaviorを分類します。

### 5. Metamorphic oracle

source inputとfollow-up inputの結果関係を検証します。

例:

| Transformation | Relation |
|---|---|
| search corpusへ無関係document追加 | existing result order should remain |
| currency valueとrateを同倍率 | converted ratio remains |
| graph node idをrename | shortest-path cost unchanged |
| imageを回転後逆回転 | content approximately restored |
| permissionを減らす | accessible resources must not increase |

metamorphic relation自体がdomain specificationです。LLMに生成させる場合もhuman reviewが必要です。

### 6. Model-based oracle

systemより単純なstate machine/modelを用意します。

```text
Cart: Empty -> Active -> CheckedOut
CheckedOut cannot accept AddItem
Cancel from Active releases reservations
```

実装のevent列をmodelへ適用し、state/outputを比較します。modelがproduction codeと同程度に複雑なら価値が落ちます。

### 7. Contract/schema oracle

protocolのshape、type、compatibilityを判定します。

- JSON Schema/OpenAPI
- Protobuf/Avro schema compatibility
- Pact interaction
- SQL schema constraint
- W3C conformance

schemaがbusiness semanticsを保証するとは限りません。`amount`がnumberでもcurrency/scale/signが誤っている可能性があります。

### 8. Snapshot/golden oracle

前回承認した大きなartifactと比較します。

適するもの:

- compiler output/AST
- formatted document
- UI rendering
- serialization
- CLI help/error

危険:

- 一括更新でbugを承認
- irrelevant fieldでdiff noise
- nondeterministic order/time/id
- opaque binary diff

改善:

- semantic normalization
- focused snapshot
- reviewer ownership
- baseline update reason

### 9. Human oracle

自動判定できないUX、visual quality、曖昧なbusiness判断を人が評価します。

human oracleも再現性を設計します。

- rubric
- blind/rand order
- multiple raters
- disagreement handling
- sampled re-review
- sensitive data policy

### 10. Statistical oracle

非決定的systemをdistributionで判定します。

例:

- p99 latency < 300ms with confidence interval
- recommendation quality does not regress > 1%
- failure rate below threshold
- model slice metric above minimum

単一runのpoint estimateでgateしません。sample size、variance、multiple comparison、practical significanceを考慮します。

### 11. Runtime oracle

productionでbusiness invariant/SLOを監視します。

- no order marked paid without payment reference
- double-entry ledger balances
- replication lag within bound
- error budget burn

runtime oracleはpre-production testを置き換えず、実traffic/scaleでしか見えないfailureを補います。

## Partial oracle

完全なcorrectnessではなく一部だけ検証するoracleです。

```text
response parses
no crash
output within range
monotonic relation holds
security invariant holds
```

partial oracleを「正しさを証明した」と表現しないことが重要です。

## Pseudo-oracle

独立した代替実装を正解の近似として使います。両実装が同じbugを持つ可能性があるためpseudoと呼びます。different algorithm/team/language/libraryを選び、独立性を高めます。

## Oracle strength

次のtestは同じlineを実行しても強さが違います。

```python
result = calculate_total(items)
assert result is not None                 # weak
assert result >= 0                        # partial invariant
assert result == 1200                     # exact example
assert result == reference_total(items)   # differential/reference
```

mutation testingはoracle strengthを測る一つの方法です。ただしmutant setが現実的なfaultを代表するか確認します。

## False positiveとfalse negative

| Error | Meaning | Cost |
|---|---|---|
| false positive | correct systemをtestがfail | trust低下、delivery遅延 |
| false negative | faulty systemをtestがpass | escaped defect |

strict snapshotはfalse positiveを増やし、弱いinvariantはfalse negativeを増やします。riskごとにbalanceします。

## Oracle independence

悪い例:

```python
expected = production.calculate(items)
actual = production.calculate(items)
assert actual == expected
```

よい独立性:

- specification exampleを固定
- simple reference algorithm
- database constraint
- independently generated contract
- accounting identity
- round-trip relation

## Floating point oracle

`abs(actual - expected) < epsilon`を万能に使いません。

確認事項:

- absolute vs relative tolerance
- units and scale
- ULP
- accumulation error
- NaN/infinity/signed zero
- deterministic hardware/library requirements

moneyはbinary floating pointを避け、integer minor unitsまたはdecimal policyを明示します。

## Async/distributed oracle

eventual consistencyでは即時valueだけをassertしません。

```text
Safety: never publish duplicate settlement
Liveness: settlement eventually reaches Completed within 30s
Convergence: replicas eventually agree
Ordering: per-account sequence is monotonic
```

pollingはfixed sleepでなくdeadline + condition + diagnosticを使います。

## Security oracle

securityは「200が返る」ではなく否定的性質が中心です。

- unauthorized principal never reads tenant data
- secret never appears in log/error/trace
- invalid signature always rejected
- permission reduction never increases access
- rate limit enforced across replicas

## LLM-as-judge oracle

LLM judgeは柔軟ですが、それ自体が非決定的でbiasを持ちます。

必須設計:

- explicit rubric
- frozen judge model/version/prompt
- order/position swap test
- human-labeled calibration set
- false positive/negative by slice
- judge disagreement/abstention
- no judge self-evaluation when avoidable
- cost/latency/privacy budget

LLM judge scoreだけでhigh-stakes correctnessをgateしません。

## Oracle review checklist

- [ ] oracleのsourceは何か
- [ ] production implementationから独立しているか
- [ ] partial/fullのどちらか
- [ ] false positive/negative costは何か
- [ ] nondeterminism/toleranceを定義したか
- [ ] schemaだけでsemanticsを保証したと誤認していないか
- [ ] snapshot updateをreviewするownerがいるか
- [ ] generated oracleにhuman/spec groundingがあるか
- [ ] mutationまたはsynthetic faultでoracle strengthを確認したか

