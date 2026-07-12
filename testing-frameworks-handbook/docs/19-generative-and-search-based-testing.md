# 生成・探索型テスト

## Example-based testとの違い

example-based testは人がcaseを選びます。生成型testはruleに従って多数のcaseを作り、未知の組み合わせを探索します。

```text
Example: [2, 1]をsortすると[1, 2]
Property: 任意のlistをsortするとorderedかつ元のpermutation
Fuzz: 任意bytesでparserがmemory safetyを破らない
Model-based: 任意操作列でstate machine invariantを守る
```

## Property-based testing

### 構成要素

1. generator
2. property/oracle
3. runner
4. shrinker
5. example database/corpus

### よいproperty

#### Round trip

```text
decode(encode(x)) == x
```

ただしencode/decodeが同じbugを共有する可能性があるため、known examplesも残します。

#### Idempotence

```text
normalize(normalize(x)) == normalize(x)
```

#### Inverse

```text
decrypt(encrypt(x, key), key) == x
```

#### Invariant preservation

```text
sum(accounts) remains constant after internal transfer
```

#### Monotonicity

```text
adding a non-negative item never decreases total
```

#### Commutativity

適用順が意味を持たないoperationに限定します。

```text
merge(a, b) == merge(b, a)
```

#### Model/reference equivalence

```text
optimized(x) == simple_reference(x)
```

### Generator design

uniform randomだけでは重要caseへ届かないことがあります。

含めるpartition:

- empty/single/many
- min/max/around boundary
- duplicates
- sorted/reverse/almost sorted
- unicode/normalization/invalid bytes
- timezone/DST/leap day
- very large/small/nan/infinity
- valid/invalid ratio
- correlated fields

### Shrinking

failure inputを小さくします。

```text
original: 400-operation sequence
shrunk: Deposit(1), Withdraw(1), Withdraw(1)
```

custom generatorにはsemantic shrinkerが必要な場合があります。単純にlistを短くすると前提条件を壊すことがあります。

### Stateful property testing

command generatorとmodel stateを使います。

```text
Commands: Create, AddItem, Checkout, Cancel, Retry
Precondition: Checkout requires Active cart
Next state: Active -> CheckedOut
Postcondition: checked-out cart cannot change
```

## Fuzz testing

### Mutation-based fuzzing

seed inputをbit/byte/token単位で変化させます。

### Generation-based fuzzing

grammar/schema/protocolからvalid/invalid inputを生成します。

### Coverage-guided fuzzing

new branch/pathへ到達したinputをcorpusへ残します。

### Stateful/protocol fuzzing

単一packetでなくsequence/stateを探索します。

### Fuzz oracle

- no crash/panic
- no hang/timeout
- memory/resource bound
- parser/serializer round trip
- semantic invariant
- differential result
- security property

### Harness quality

悪いharnessはparserへ届く前に多くのinputを捨てます。

確認:

- target functionへ直接到達
- global state reset
- deterministic
- fast
- sanitizer併用
- failure artifact保存
- secretなし

## Metamorphic testing

exact answerが作れない場合に、input transformationとoutput relationを定義します。

### 例

#### Search

- queryへirrelevant whitespace normalization
- unrelated document追加
- duplicate document handling

#### ML classifier

- meaning-preserving paraphrase
- irrelevant metadata removal
- small noise robustness

#### Graph

- node renaming
- disconnected component追加
- edge weight scaling

#### Finance

- same currency minor-unit scaling
- transaction split/merge where policy allows

### Relationの誤り

「画像を少し変えてもclassは同じ」は常に正しくありません。domain expertがvalid transformation rangeを定義します。

## Differential testing

### 比較対象

- versions
- implementations
- vendors
- architectures
- optimized/reference
- parser/compiler/browser

### Normalization

次を除いて比較します。

- timestamps
- generated IDs
- ordering when unspecified
- floating tolerance
- diagnostic wording

normalizeしすぎるとmeaningful differenceを消します。

## Model-based testing

### Model types

- finite state machine
- transition system
- abstract data type model
- reference model
- formal model (TLA+/Alloy等)

### Offline vs online

- offline: sequenceを先に生成
- online: 実行結果を見て次commandを生成

### Coverage

- state coverage
- transition coverage
- transition-pair coverage
- requirement/risk coverage
- fault coverage

## Combinatorial testing

全組み合わせが大きすぎる場合、pairwise/t-wiseでinteractionを選びます。

例:

```text
browser: 3
OS: 4
locale: 10
payment: 5
feature flags: 8 binary
```

全組み合わせは膨大です。pairwiseはすべての2要因組み合わせを含む小さなsetを作ります。

注意:

- 3要因以上のbugを見逃す
- high-risk combinationは手動で必須追加
- invalid combination constraintをmodel化

## Search-based software testing

test generationをoptimization problemとして扱います。

- branch distance
- coverage
- exception discovery
- mutation kill
- performance worst case
- diversity

genetic algorithm、hill climbing、evolutionary searchなどを使います。fitness functionが弱いと意味のないcaseを最適化します。

## Grammar-based testing

language/file/protocol grammarからinputを生成します。

- SQL
- JSON/XML
- compiler language
- network protocol
- configuration

valid grammarだけでなく、境界でcontrolled invalid inputも作ります。

## Concolic/symbolic execution

concrete executionとsymbolic constraintを組み合わせ、branchを到達するinputを解きます。

強み:

- hard-to-reach branch
- precise constraint

制約:

- path explosion
- environment/native call
- solver cost
- complex heap/concurrency

## Fault injection

inputではなくenvironment failureを生成します。

- exception
- latency
- drop/duplicate/reorder
- disk full
- process kill
- clock jump
- resource exhaustion

## Mutation testingは生成型か

test inputではなくfaulty program variantを生成します。test suiteの検出能力を探索する点で生成型testingの一つとして理解できます。

## LLM-generated tests

LLMはsemantic exampleとscaffolding生成に強い一方、oracle hallucination、private implementation coupling、test smell、duplicate testが課題です。

安全なloop:

```text
spec/bug/report/context
  -> generate candidate
  -> compile
  -> run against original
  -> run against known fault/mutants
  -> smell/flake review
  -> human oracle review
```

coverage上昇だけでは採用しません。

## どれを選ぶか

| Problem | Technique |
|---|---|
| broad structured input | property-based |
| parser/memory safety | coverage-guided fuzz |
| exact output unknown | metamorphic |
| multiple implementations | differential |
| operation sequence | stateful/model-based |
| configuration matrix | combinatorial |
| hard branch | symbolic/search-based |
| suite strength | mutation |
| semantic example draft | LLM + verification loop |

## Reproducibility

保存するもの:

- seed
- minimal counterexample
- generator/tool/version
- model/property version
- environment
- execution budget
- original failure trace

randomnessを固定するだけでなく、failure artifactを普通のregression testへ昇格します。

