# Data・ML・LLM・Agent testing

# Part 1: Data testing

> 実行例: [`labs/ai-evals`](../labs/ai-evals/README.md)は、有料APIを使わずfake model・seed付き合成data・versioned datasetで、data quality（schema/null/range/unique/reconciliation、late/duplicate/out-of-order）、ML（critical slice gate、fairness、robustness、PSI drift、seed分布）、RAG（recall@kとgroundednessの分離）、LLM-as-judgeのhuman calibration（Cohen's kappa）、agentのtool schema・sandbox・prompt injection・trajectory/outcome/cost/latency分離・provenanceをtestします。

## なぜpipeline successだけでは足りないか

jobがexit 0でもdataは壊れます。

- row missing/duplicate
- wrong join
- currency scale
- timezone shift
- late event ignored
- schema meaning changed
- PII mixed
- backfill double-count

## Schema tests

- column/field presence
- type/nullability
- nested structure
- compatibility
- semantic version

schema一致は意味の一致ではありません。`amount`がcentからyenへ変わってもintegerのままです。

## Constraint tests

- not null
- unique
- range/domain
- referential integrity
- regex/format
- conditional constraint

## Distribution tests

- quantiles
- category frequency
- missing rate
- drift
- outlier
- correlation

normalなbusiness変化とdata defectを区別するthreshold/seasonalityが必要です。

## Reconciliation

source-to-targetで件数だけでなくbusiness totalを照合します。

```text
orders count
gross/net/tax/refund totals
distinct customer
checksum by partition/day
```

## Pipeline behavior

- idempotent rerun
- checkpoint/restart
- duplicate/late/out-of-order
- partial partition failure
- backfill
- schema evolution
- timezone/day boundary
- very large partition

## Data contract

producer/consumer間でschema、semantics、freshness、quality、ownershipを合意します。

```text
field: total_minor
meaning: final charged amount in currency minor unit
freshness: < 15min
null: never
owner: payments
```

## ETL unit/component/integration

- unit: transformation function
- component: in-memory/small fixture pipeline
- integration: real engine/storage/catalog
- system: source-to-warehouse
- production: freshness/volume/invariant

sample CSVだけではdistributed engine、partition、decimal、schema evolutionを確認できません。

# Part 2: ML testing

## ML systemのtest対象

- data
- feature pipeline
- training code
- model artifact
- serving code
- decision policy
- monitoring/retraining

model metricだけではsystemをtestできません。

## Data split/leakage

- train/validation/test separation
- entity/time leakage
- duplicate/near-duplicate
- future information
- label leakage

random splitが適切でないtime/entity problemがあります。

## Offline metrics

- task metric
- baseline comparison
- confidence interval
- slice metric
- calibration
- cost-sensitive error

aggregate accuracyだけでminority/critical slice failureを隠さないようにします。

## Robustness

- noise
- missing/corrupted feature
- distribution shift
- adversarial input
- out-of-domain
- abstention

## Fairness

legal/domain contextに応じてgroup/slice metric、error disparity、threshold effectを評価します。protected attributeを雑に削除してもproxy biasは残ります。

## Reproducibility

- code/data/model version
- random seeds
- environment/hardware
- hyperparameters
- feature definitions
- dataset snapshot

GPU/non-deterministic operationでbit exactが難しい場合、許容範囲とrepeatを定義します。

## Training-serving skew

同じfeature inputに対しoffline/online transformationを比較し、schema/default/time windowを確認します。

## Shadow/canary

new modelをshadowで比較し、canaryでsmall cohortへ出します。feedback loop、delayed label、policy impactを考慮します。

# Part 3: LLM application testing

## 評価対象を分解する

```text
input handling
prompt/template
retrieval
context construction
model response
post-processing
tool calls
policy/guardrail
final user outcome
```

全部をend-to-end scoreだけで評価すると原因が分かりません。

## Golden dataset

含めるもの:

- representative tasks
- difficult/edge cases
- past incidents
- safety/adversarial
- multilingual/locale
- user segments
- expected answerまたはrubric
- source/provenance

dataset自体をversion管理し、test contaminationとstalenessをreviewします。

## Deterministic tests

LLMを呼ばずに確認できるもの:

- prompt rendering
- context length/truncation
- tool schema
- parser/structured output
- policy routing
- citation mapping
- cache/key
- retry/fallback

これらは普通のUnit/contract testにします。

## Retrieval evaluation

- corpus/index correctness
- recall@k
- precision/relevance
- chunking
- metadata filter
- access control
- freshness
- answer source coverage

最終answerが良くてもunauthorized document retrievalはsecurity failureです。

## Generation evaluation

- correctness
- completeness
- groundedness/faithfulness
- relevance
- instruction following
- style/format
- citation accuracy
- uncertainty/abstention

## LLM-as-judge

judgeをcalibrateします。

```text
human-labeled sample
agreement/confusion matrix
position/order swap
model/version freeze
rubric examples
abstain/disagreement
slice analysis
```

judge prompt/model変更もtest infrastructure changeです。

## Non-determinism

- repeated trials
- pass rate/distribution
- temperature/top-p固定
- provider model version
- statistical gate
- failure sample保存

1回のpass/failで品質を断定しません。

## Prompt injection/security

- direct/indirect injection
- data exfiltration
- tool misuse
- cross-tenant retrieval
- hidden instruction
- untrusted markup/file
- output injection into downstream
- denial of wallet/resource abuse

## Cost/latency

- token/input/output
- tool calls
- cache hit
- p95/p99 latency
- retry/fallback
- budget per task

quality向上とcost/latencyをmulti-objectiveで評価します。

# Part 4: Agent testing

## Agentをstate machineとして見る

```text
Plan -> SelectTool -> CallTool -> Observe -> UpdateState -> Finish
```

各transitionとinvariantをtestします。

## Tool contract test

- schema-valid arguments
- least privilege
- timeout/cancellation
- idempotency
- error interpretation
- secret redaction
- destructive action confirmation

## Simulated environment

real serviceの前にdeterministic tool simulatorで次を注入します。

- stale result
- rate limit
- partial failure
- ambiguous success
- conflicting sources
- long sequence
- malicious content

## Trajectory vs outcome

最終answerだけでなく、必要に応じてtrajectoryも評価します。

- unnecessary calls
- unsafe call
- loop
- ignored error
- wrong recipient/resource
- budget exceeded

ただし特定の内部思考順序を固定しすぎず、observable actionとpolicyを評価します。

## Agent sandbox/security

- filesystem/network scope
- recipient/identity resolution
- external side effect approval
- prompt injection boundary
- data minimization
- audit trail
- rollback/compensation

## Multi-agent test

- task decomposition
- duplicate/conflicting action
- shared state consistency
- deadlock/livelock
- authority boundaries
- partial agent failure
- final aggregation

## Human-in-the-loop

- escalation condition
- context presented to reviewer
- approve/reject semantics
- timeout/default
- auditability
- no silent bypass

## Online evaluation

- canary cohort
- task success
- correction/undo rate
- user feedback
- safety incident
- cost/latency
- distribution shift

## AI evaluation checklist

- [ ] deterministic componentsをLLM E2Eから分離
- [ ] dataset/rubric/source/versionを管理
- [ ] aggregateだけでなくcritical slices
- [ ] judgeをhuman labelでcalibrate
- [ ] repeated trialsとdistribution
- [ ] retrieval authorization
- [ ] injection/tool misuse/secret exfiltration
- [ ] outcomeとobservable trajectory
- [ ] cost/latency/budget
- [ ] model/prompt変更をversioned releaseとして扱う

