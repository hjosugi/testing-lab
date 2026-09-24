# 観点3 生成型テスト・研究・最先端

> Testing Frameworks Handbook のNotebookLM取り込み用バンドル。
> 生成元: https://github.com/hjosugi/testing-lab （scripts/build-notebooklm.sh で再生成）

---

<!-- SOURCE: docs/07-advanced-testing.md -->

# Property、Fuzz、Mutation、Contract、E2E

## Property-based testing

exampleを列挙する代わりに、広い入力に対して保たれる性質を定義します。

例:

- sort結果はorderedで、元入力のpermutation
- encode/decodeはround tripする
- discount後のtotalは負にならない
- idempotent operationを2回適用しても結果が同じ

property testは具体例を不要にするものではありません。business例は読みやすいspecificationとして残し、広い入力空間をpropertyで補います。

generatorは値をrandomに作るだけでは不十分です。empty/single/many、境界/通常値、valid/invalidの分布を定義し、failure時にdomain上の小さいcounterexampleへ縮むかreviewします。実行seedとshrink pathに加え、原因が分かったminimal inputをregression corpusへ昇格します。

## Fuzzing

fuzzingはcrash、panic、hang、security boundaryに強い手法です。Goはtoolchainにfuzzingを統合しています。seed corpus、最大時間、failure inputの保存、nondeterminism排除が重要です。

property-based testingのgenerator coverageと、coverage-guided fuzzerのprogram edge feedbackは別物です。structured domain inputは前者、raw parser/API boundaryは後者をdefaultにし、round trip、semantic invariant、differential resultをcrash以外のoracleとして追加します。

実行可能な5 invariant、generator/shrinker review、metamorphic/differential suite、Go parser fuzzは[advanced lab](../labs/advanced/GENERATOR-REVIEW.md)にあります。

## Mutation testing

production codeへ小さな変更（`>`→`>=`、条件削除、return値変更）を加え、testが失敗するかを測ります。

- killed: testがmutationを検出
- survived: assertion不足、equivalent mutant、到達不能など
- mutation score: killed / testable mutants

score 100%を盲目的に目指さず、money、authorization、data lossなど高risk moduleへ適用します。PHPはInfection、JavaはPIT、JSはStryker、Pythonはmutmut/cosmic-ray、Rustはcargo-mutantsなどが候補です。

### Risk-based mutation lane

[`labs/mutation`](../labs/mutation/README.md)は8言語へmutation laneを割り当てます。StrykerJS（JS）、PIT（Java）、Infection（PHP）、cargo-mutants（Rust）、mutmut spike由来のcurated mutant（Python）、reviewed catalog（Go/C#/C++）を、billing・payment state・duplicate charge・secret redaction・data lossのmodule単位で選びます。

- 変更fileからlaneを選び、high riskから600秒のPR budgetへ詰めます。溢れた分とlow riskは理由付きでscheduled full laneへ回します。
- survivorは`test-added`/`code-fixed`、または`equivalent`/`low-value`/`accepted-risk`のdecision（owner・期限・根拠必須）へ必ず落とします。
- scoreの代わりにreview action rate（reviewしたsurvivorのうち行動につながった割合）を見ます。exception message mutantのように数だけ多いsurvivorは、この指標を下げるのでlaneから外します。

spikeでは、既存のexample/property testが揃っていたにもかかわらず、JS 12件、Java 1件、Python 2件、Go 4件、C# 2件、C++ 1件の高リスクsurvivorが見つかり、すべてtest追加で解消しました（[SPIKE.md](../labs/mutation/SPIKE.md)）。

## Consumer-driven contract testing

Pactではconsumer testが実際に必要とするrequest/response例からcontractを生成し、provider verificationで再生します。OpenAPI schema testとは目的が違います。

- schema: 可能なAPI surfaceの静的記述
- consumer contract: 現在のconsumerが依存するconcrete interaction

matching ruleは「変化してよい意味」だけへ局所的に置きます。response object全体を
type matcherにすると、consumerが必要とする固定statusまで緩める危険があります。
provider stateはfixtureの説明ではなく、verification直前に再現可能なstateを作る
handlerとして実装します。

contract testはnetwork、service discovery、auth infrastructure全体のE2Eを置き換えません。compatibilityを速く検証する層です。

## Service virtualization

mountebankのようなover-the-wire doubleは、processをまたぐHTTP/TCP/SMTP等をfakeにします。application内mockより現実的ですが、protocol fakeと本物のdriftを管理する必要があります。

## Browser E2E

Playwrightはbrowser context isolation、locator、web-first assertion、auto-waitを中心にします。TestCafeはhybrid architecture、native CDPまたはproxy、browser sandboxing、自動待機を特徴とします。

選定時はAPIの好みだけでなく次を比較します。

- browser control protocol
- isolation unit（context/process/profile）
- wait semantics
- trace/video/network diagnostics
- parallel worker model
- mobile emulationとreal deviceの範囲
- native dialog、extension、WebViewの制約

`sleep(3000)` はconditionを待っていません。observable stateを待つAPIを使います。

## Mobile/game UI

EarlGreyはiOS UIのsynchronization、Airtestはimage recognition、Pocoはengine UI hierarchy inspectionを中心にします。Web E2E frameworkと同じ比較表に押し込まず、対象surfaceと観測方法から選びます。

---

<!-- SOURCE: docs/19-generative-and-search-based-testing.md -->

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

reviewでは「最初のfailureが小さいか」ではなく、固定seedで同じfailureを再生でき、shrinkerがdomain上の最小境界へ進み、最小inputだけを通常testで再生できるかを確認します。generatorのsample分布も固定seedで監査し、edge caseへ偏らせた意図とordinary caseを探索する余地の両方を数値化します。

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

coverage feedbackは「新しいcode pathへ届いた」ことを示し、正しい結果を示しません。accepted parser inputにはround tripとsemantic/differential oracleを追加し、invalid inputにはpanicしないことと分類済みerrorを要求します。

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

Checkoutの実行例では、optimized totalを独立したrepeated-addition modelと比較します。normalizationはtimestamp等の非意味的差だけへ限定し、quantity、price、error分類は比較から除外しません。詳細は[advanced lab review](../labs/advanced/GENERATOR-REVIEW.md)を参照してください。

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

---

<!-- SOURCE: docs/13-research-and-modern-practice.md -->

# 研究論文から見る最新のテスト

確認日: 2026-07-12

この章は、frameworkのmarketingではなく、peer-reviewed paperと明示したpreprintから実務判断を組み立てます。個別研究の数値はdataset、言語、tool、対象projectに依存するため、そのまま自社へ一般化しません。

## 2026年の実務に効く10の論点

### 1. Coverageを品質目標にしない

Inozemtseva and Holmes, “Coverage Is Not Strongly Correlated with Test Suite Effectiveness” (ICSE 2014) は、suite sizeを制御するとcoverageとeffectivenessの強い相関を支持できないと報告しました。これはcoverageが無価値という意味ではありません。

実務への含意:

- coverageはuntested areaの発見に使う
- quality gateはrisk別にbranch、assertion quality、mutation、incident dataを合わせる
- coverageを上げるためだけのassertion-free testを作らない

関連して、Zhang et al., “Assessing Effectiveness of Test Suites: What Do We Know and What Should We Do?” (TOSEM 2024) はtest suite effectiveness評価の知見と限界を整理しています。

### 2. Mutation testingを全件実行からchange-focused feedbackへ

Googleの実践研究 “Practical Mutation Testing at Scale” (TSE 2021/2022) は、mutantをcode reviewへ統合し、developerが行動できる形で提示する方向を示しました。重要なのはrepository全体のscore競争ではなく、変更行に近いrelevant mutantです。

実務への含意:

- PRではchanged files／high-risk codeのmutantを優先
- survived mutantを「test追加」「equivalent」「low-value」にtriage
- mutation tool自体のruntime budgetを設ける
- simple syntactic mutantだけで実故障を代表できるとは仮定しない

2024–2026年にはLLMで文脈依存mutationを生成する研究が増えています。Metaのmutation-guided LLM test generationやMutGenは、mutation feedbackをtest生成loopへ戻します。ただし研究benchmark上の改善を、productionでのcorrect oracleと同一視しません。

### 3. Property-based testingはgenerator設計が本体

QuickCheck (ICFP 2000) が確立したproperty-based testingは、2024年の “Property-Based Testing in Practice” で実務利用の経験が調査され、2025年にはgeneratorをprobabilistic programとして調整する研究も進みました。

最新の考え方:

- propertyだけでなくinput distributionとshrinkerをreviewする
- uniform randomが重要caseを十分探索するとは限らない
- coverage-guided PBTやtargeted PBTでrare stateへ誘導する
- failing seedとminimal counterexampleをregression corpusへ保存する

### 4. Oracle problemを設計問題として扱う

Barr et al., “The Oracle Problem in Software Testing: A Survey” (TSE 2015) が整理したとおり、input生成より「正しい結果をどう知るか」が難しい場合があります。LLM test generationでもoracle hallucinationが中心リスクです。

oracleが弱い場合の選択肢:

- differential testing: 独立実装やversion間を比較
- metamorphic testing: input変換前後の関係を検証
- model-based testing: state machine/modelと比較
- invariant/property: 必ず保つ制約を検証
- runtime assertion/production invariant: 本番観測も利用

Chen et al.のmetamorphic testing review (TOSEM 2018) と2024–2026年のmetamorphic relation generation研究は、oracleを単一expected valueから関係性へ広げる流れを示します。

### 5. Flakinessはtest単体でなくsystemic failureとして見る

flaky test研究は、time、order、concurrency、network、randomness、resource leakなどを分類してきました。2025年の “An Empirical Analysis of Co-Occurring Flaky Test Failures” は、共通原因で同時発生するclusterをsystemic flakinessとして分析しました。SAP HANAの2026年研究では、対象datasetでconcurrency関連が大きな割合を占めました。

実務への含意:

- testごとのretry回数だけを見ない
- 同一run／worker／host／fixture／serviceでco-failureをcluster分析
- timeoutを増やす前にresource saturationとsynchronizationを調べる
- order randomizationとseed保存をCIへ入れる
- quarantineにはowner、原因分類、expiryを必須にする

### 6. Distributed systemはdeterministic simulationへ寄せる

FoundationDBのdeterministic simulatorと、AWSの “Systems Correctness Practices at Amazon Web Services” (CACM 2025) は、delay、failure、schedulingを制御したsimulationをbuild-time correctnessへ近づける考え方を示します。

適用条件:

- time、network、disk、scheduler、randomをabstract化できる
- seedからfailureを完全再現できる
- model/invariantを用意できる
- simulationとreal implementationのsemantic gapを実環境testで補う

これは普通のmock-heavy unit testとは異なり、実production logicをcontrolled runtime上で広いschedule/failureへ晒す手法です。

### 7. Test selectionは速度だけでなくmiss riskを管理する

Meta/FacebookのPredictive Test Selection (ICSE-SEIP 2019) と後続のdata-driven test selectionは、changeごとに有効なsubsetを選ぶ方向を示しました。

安全な導入:

- required deterministic dependency testsは常時実行
- ML-selected laneとperiodic full laneを併用
- selection missを測定し、model driftを監視
- security、migration、billingなどは予測だけでskipしない
- PR feedback timeとescaped regressionの両方を最適化

### 8. LLM生成testは「生成」より「検証loop」が重要

Schäfer et al., “An Empirical Evaluation of Using Large Language Models for Automated Unit Test Generation” (TSE 2024) は、大規模なLLM unit test生成を評価しました。その後の研究はprompt、context、fine-tuning、coverage guidance、mutation feedbackへ広がっています。

2025–2026年の流れ:

- repository context／call graph／documentationを与える
- compile/test/fixのclosed loop
- coverageだけでなくmutationで追加testを誘導
- legacy package単位のagent workflow
- generated test自体のflakinessとtest smellを評価

採用gate:

1. compileし、clean environmentで繰り返しpassする
2. testを先に書いてproduction defectを再現したか、またはmutationをkillする
3. assertionがspecificationに基づく
4. private implementationへ過剰couplingしていない
5. human reviewerが「このfailureならproduction changeを止める」と判断できる
6. prompt/model/versionをprovenanceとして保存する

LLMがproduction codeからexpected valueを写すだけでは、同じ誤りをoracleへ複製します。仕様、別実装、property、incident reproductionをground truthにします。

### 9. AI生成testのtest smellとflakinessを別途検査する

2024年の “Test Smells in LLM-Generated Unit Tests” は、20,500のLLM生成suiteと大規模なhuman-written suiteを比較し、Magic Number Test、Assertion Roulette、Long Test、Useless Testなどの問題を報告しました。2026年にはLLM生成test固有のflakiness研究も出ていますが、preprint段階のものは結論を暫定扱いします。

実務への含意:

- AI生成codeにも同じreview/lintersを適用
- generated test数をproductivity metricにしない
- test name、single reason to fail、determinism、cleanupを静的/動的にcheck
- suspiciously easyなgreen testへmutationを当てる

### 10. Shift-left／shift-rightではなくcontinuous verification

modern testingはpre-merge testだけで完結しません。

- design time: type、contract、formal model、TDD
- build time: unit、property、mutation、simulation
- pre-production: integration、migration、E2E、performance
- production: canary、shadow、synthetic、invariant、observability

ただしproduction monitoringはpre-deploy testの代替ではありません。rollback可能性、blast radius、privacy、user impactを設計したうえで補完します。

## Evidence ladder

| Evidence | 強み | 注意 |
|---|---|---|
| systematic review／survey | 広い研究を統合 | 新研究への遅れ、study quality差 |
| peer-reviewed industrial study | 現実のscaleとcost | 1社のtooling/culture依存 |
| controlled experiment | 比較しやすい | toy task／被験者差 |
| benchmark study | 再現しやすい | benchmark contamination／現実性 |
| preprint | 最新 | peer review前、結論が変わり得る |
| vendor blog | 実装詳細 | 成功例bias、評価条件不足 |

## 研究をprojectへ導入するテンプレート

```text
Claim:
Target context:
Evidence type:
Dataset/language/tool:
Threats to validity:
Smallest reversible experiment:
Success metric:
Guardrail metric:
Decision date:
```

例: mutation testingをPRへ導入するなら、1つのhigh-risk moduleで4週間試し、review action rate、追加testがkillしたmutant、CI時間、equivalent mutant率を測ります。全repo scoreを先にKPI化しません。

## 論文リーディングリスト

### Foundational

1. Beck, “Simple Smalltalk Testing: With Patterns” (1989) — xUnit familyの起点。
2. Claessen and Hughes, “QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs” (ICFP 2000), DOI: https://doi.org/10.1145/351240.351266
3. Meszaros, “xUnit Test Patterns” (2007) — test double、fixture、test smellの語彙。
4. Barr et al., “The Oracle Problem in Software Testing: A Survey” (TSE 2015), DOI: https://doi.org/10.1109/TSE.2014.2372785
5. Chen et al., “Metamorphic Testing: A Review of Challenges and Opportunities” (TOSEM 2018), DOI: https://doi.org/10.1145/3143561

### Effectiveness／Mutation

6. Inozemtseva and Holmes, “Coverage Is Not Strongly Correlated with Test Suite Effectiveness” (ICSE 2014), DOI: https://doi.org/10.1145/2568225.2568271
7. Zhang and Mesbah, “Assertions Are Strongly Correlated with Test Suite Effectiveness” (ESEC/FSE 2015), DOI: https://doi.org/10.1145/2786805.2786858
8. Petrović et al., “State of Mutation Testing at Google” (ICSE-SEIP 2018), DOI: https://doi.org/10.1145/3183519.3183521
9. Petrović et al., “Practical Mutation Testing at Scale: A View from Google” (TSE 2021/2022), DOI: https://doi.org/10.1109/TSE.2021.3107634
10. Sánchez et al., “Mutation Testing in Practice: Insights From Open-Source and Industrial Projects” (TSE 2024), DOI: https://doi.org/10.1109/TSE.2024.3377378
11. Zhang et al., “Assessing Effectiveness of Test Suites: What Do We Know and What Should We Do?” (TOSEM 2024), DOI: https://doi.org/10.1145/3635713

### Property／Fuzz／Oracle

12. Padhye et al., “JQF: Coverage-Guided Property-Based Testing in Java” (ISSTA 2019), DOI: https://doi.org/10.1145/3293882.3339002
13. Goldstein et al., “Property-Based Testing in Practice” (ICSE 2024), DOI: https://doi.org/10.1145/3597503.3639581
14. Koparkar et al., “A Primer on Property-Based Testing” (SPLASH-E 2024), DOI: https://doi.org/10.1145/3637466
15. Tjoa et al., “Property-Based Testing as Probabilistic Programming” (OOPSLA 2025), DOI: https://doi.org/10.1145/3763082

### Flakiness

16. Luo et al., “An Empirical Analysis of Flaky Tests” (FSE 2014), DOI: https://doi.org/10.1145/2635868.2635920
17. Parry et al., “A Survey of Flaky Tests” (TOSEM 2021), DOI: https://doi.org/10.1145/3476105
18. Li et al., “Systematically Producing Test Orders to Detect Order-Dependent Tests” (ISSTA 2023), DOI: https://doi.org/10.1145/3597926.3598083
19. Pei et al., “An Empirical Analysis of Co-Occurring Flaky Test Failures” (ISSTA 2025), DOI: https://doi.org/10.1145/3756681.3756945
20. Berndt et al., “An Empirical Study of Fixed Issue Reports for SAP HANA” (2026 preprint): https://arxiv.org/abs/2602.03556

### Distributed systems／Selection

21. Machalica et al., “Predictive Test Selection” (ICSE-SEIP 2019), DOI: https://doi.org/10.1109/ICSE-SEIP.2019.00018
22. Zhou et al., “FoundationDB: A Distributed Unbundled Transactional Key Value Store” (SIGMOD 2021/2022), DOI: https://doi.org/10.1145/3542700.3542707
23. Brooker et al., “Systems Correctness Practices at Amazon Web Services” (CACM 2025), DOI: https://doi.org/10.1145/3729175
24. Feng et al., “RediI: Test Infrastructure to Enable Deterministic Reproduction of Failures in Distributed Systems” (ICSE 2025), DOI: https://doi.org/10.1109/ICSE55347.2025.00244

### LLM-assisted testing

25. Schäfer et al., “An Empirical Evaluation of Using Large Language Models for Automated Unit Test Generation” (TSE 2024), DOI: https://doi.org/10.1109/TSE.2023.3334955
26. Wang et al., “Software Testing with Large Language Models: Survey, Landscape, and Vision” (TSE 2024 preprint version): https://arxiv.org/abs/2307.07221
27. Ouédraogo et al., “Test Smells in LLM-Generated Unit Tests” (2024 preprint): https://arxiv.org/abs/2410.10628
28. Ryan et al., “Mutation-Guided LLM-based Test Generation at Meta” (FSE 2024 / extended preprint): https://arxiv.org/abs/2501.12862
29. MutGen, “On Mutation-Guided Unit Test Generation” (2025 preprint): https://arxiv.org/abs/2506.02954
30. “Large Language Models for Unit Test Generation” (2025 survey preprint): https://arxiv.org/abs/2511.21382

## 読み方の注意

- publication yearとonline-first yearが異なる場合があります。
- arXivはversionが更新されるため、引用時はversion/dateを固定します。
- LLM研究はmodel version、prompt、benchmark contamination、temperature、pass@kで結果が大きく変わります。
- mutation scoreはmutator setとequivalent mutant処理を明示しないと比較できません。
- flakiness studyはrerun policyと「flaky」のoperational definitionを確認します。


---

<!-- SOURCE: docs/27-research-guide.md -->

# テスト研究を実務へ適用するガイド

> 実行例: [`labs/research`](../labs/research/README.md)は、coverage/mutation相関（size制御）、assertion数、PBT generator/shrinking、flaky co-failure、deterministic simulation、生成test vs human test、predictive selectionの7主張を同一budget・同一oracleで再現し、negative resultも含めて`templates/research-reproduction.md`形式で記録します。recordの数値はtestで実験結果と一致を強制します。

## 一言でいうと

論文の結論をそのまま規則にせず、**問い・対象・比較条件・効果量・限界**を読み、自分のsystemで小さく再現します。

## 論文を読む7つの質問

1. Research questionは何か。
2. 対象は学生、小規模OSS、大規模企業、生成benchmarkのどれか。
3. 独立変数とoutcomeは何か。
4. baselineは公平か。
5. statistical significanceだけでなくeffect sizeはどうか。
6. construct/internal/external validityの脅威は何か。
7. artifact、data、codeを再現できるか。

## Evidenceの強さ

| 種類 | 強み | 注意 |
|---|---|---|
| systematic review/survey | 研究全体を俯瞰 | 元研究の質に依存 |
| controlled experiment | 因果を見やすい | 現場一般化に限界 |
| industrial case study | 現実の規模 | 単一組織の文脈 |
| mining software repositories | 大量の履歴 | proxy metricと因果混同 |
| benchmark evaluation | 比較可能 | benchmark contamination/代表性 |
| experience report | 実装詳細 | selection/publication bias |
| preprint | 新しい | peer review前 |

## 重要な研究テーマと実務上の読み方

### Coverage

高coverageと高品質は同義ではありません。coverageは「通っていない場所」を探すには有用ですが、oracle strengthを表しません。branch coverage、mutation、escaped defect、riskを合わせます。

### Mutation testing

mutation scoreはtest adequacyの強い補助指標ですが、equivalent mutant、tool operator、sampled mutants、runtime costを確認します。全repositoryを毎PRで回すより、critical moduleとchanged codeから始めます。

### Property-based / fuzzing

欠陥発見数だけでなく、generator quality、oracle、shrinking、seed再現性、corpus evolutionを見ます。API surfaceへ雑なrandom bytesを投げるだけでは比較になりません。

### Flaky tests

test codeだけでなくproduction concurrency、infrastructure、environment interactionも原因です。研究の分類体系を自社failure taxonomyへ移し、検出率と修復時間を測ります。

### Test selection/prioritization

短縮率だけでなく、fault detection loss、changed code coverage、fallback full run、モデルdriftを確認します。

### LLM test generation

compile/pass/coverageだけでは「正しいoracle」を評価できません。

- generated testがbuggy implementationを正解として固定していないか
- mutationをkillするか
- duplicate/trivial testでないか
- hidden benchmark/test contaminationがないか
- dependency/API versionが現実的か
- human review costを含めて得か

## 再現実験テンプレート

```markdown
# Claim
何が、何と比べ、どの条件で改善するか

# Context
system、language、module risk、commit、environment

# Baseline
既存手法、同じbudget、同じoracle

# Treatment
tool/version/configuration/seed/time budget

# Outcomes
real/mutated fault detection、runtime、flake、review/maintenance cost

# Threats
sample、operator、leakage、learning effect、confounder

# Decision
adopt / limited pilot / reject / more evidence
```

## 最新情報の扱い

- versionやreleaseは公式documentation/repositoryを一次情報にする
- paperはDOI、publisher、conference/journal pageを優先する
- arXivはpreprintと明記する
- blogは実装補助に使い、一般的結論の唯一の根拠にしない
- “latest”は検索日を記録する

本教材の具体的な文献とリンクは[研究と最新実務](13-research-and-modern-practice.md)および[公式情報源](11-sources.md)にあります。

## Team journal club

60分なら次で進めます。

- 5分: claim
- 10分: method/sample
- 10分: results/effect
- 10分: threats
- 15分: 自社riskへの対応
- 10分: 小さな実験とowner決定

「面白かった」で終わらせず、adoption decisionまたは検証Issueを残します。

## AI時代の研究上の注意

- benchmark leakageとtraining contamination
- model/version/APIの非再現性
- prompt・temperature・tool schemaの未報告
- judge modelとtarget modelの相関bias
- pass@kと単一attemptの混同
- cost/latency/human correctionの除外
- security/privacy条件の不足

model名だけで比較せず、artifact、budget、attempt count、oracle、人手を揃えます。

## 採用前checklist

- [ ] claimを1文で言える
- [ ] baselineとbudgetが公平
- [ ] 自社と対象populationの差を説明できる
- [ ] outcomeがbusiness riskへつながる
- [ ] artifact/version/seedを保存した
- [ ] maintenanceとfalse alarmを測る
- [ ] pilotの停止条件がある
- [ ] preprintとpeer-reviewedを区別した


---

<!-- SOURCE: docs/31-frontier-multi-perspective.md -->

# 最先端テストを「7つの観点」で理解する

確認日: 2026-07-12

最先端のテストは、単一のツールや手法ではなく、**複数の観点が同時に動いている状態**として理解すると全体がつながります。この章は既存の深掘り章への「観点別の入口」です。1つの観点だけで語られるベストプラクティスは、他の観点から見ると偏っていることが多い、というのが本章の中心メッセージです。

## 観点マップ

| # | 観点 | 中心の問い | 深掘り章 |
|---|---|---|---|
| 1 | 思想 | 何を「単体」とみなし、何を偽物に置き換えるか | [02](02-london-vs-classical.md), [06](06-test-doubles.md) |
| 2 | Oracle | 「正しい」を誰がどう定義するか | [17](17-test-oracles-deep-dive.md) |
| 3 | 生成 | テスト入力とテストコードを誰が作るか | [19](19-generative-and-search-based-testing.md) |
| 4 | 実行環境 | どこで・いつ検証するか（CIから本番まで） | [18](18-test-levels-deep-dive.md), [28](28-case-study-commerce.md) |
| 5 | 対象 | 決定的なコードか、分散系か、確率的なAIか | [23](23-data-ml-llm-agent-testing.md) |
| 6 | 経済性 | テストにいくら払い、何を諦めるか | [24](24-ci-flakiness-economics.md) |
| 7 | 研究 | エビデンスはどこまで信じられるか | [13](13-research-and-modern-practice.md), [27](27-research-guide.md) |

## 観点1: 思想 — schoolsは「対立」から「使い分けのスペクトラム」へ

Classical（Detroit）とLondon（mockist）の論争は、2026年には「solitary／sociable unit test」の**スペクトラム**として整理されています。

- 最先端の合意点は「**実装ではなく契約をテストする**」。London styleの弱点とされた「mockがprotocolを固定しすぎてrefactoringを壊す」問題は、mock対象を「自分が所有する境界のrole」に限定することで回避します。
- 逆にClassical styleの弱点「失敗時に原因の位置が分かりにくい」は、テストサイズを絞り、observability（trace、structured logging）で補うのが現代的です。
- 実践では「domainはsociable + real object、外部境界はcontract + test double」というhybridが標準です（[04-build-hybrid-policy](../issues/04-build-hybrid-policy.md)で演習）。

## 観点2: Oracle — assertionからLLM-as-judgeまで

テストの本体はassertionではなく**oracle（正解の定義）**です。最先端の変化はoracleの多様化です。

| Oracle | 例 | 強い場面 | 弱点 |
|---|---|---|---|
| specified | `assert total == 1050` | 仕様が明確 | 仕様の書き漏れ |
| property/invariant | 「itemを足してtotalは減らない」 | 入力空間が広い | property設計が難しい |
| metamorphic | 「並べ替えても結果不変」 | 期待値が計算不能 | 関係の発見が難しい |
| differential | 参照実装・旧実装と比較 | migration、最適化 | 参照側のバグ |
| LLM-as-judge | 生成文の品質採点 | 自然言語出力 | judge自体のbias・drift検証が必要 |

LLM-as-judgeは2025〜2026年に急速に普及しましたが、**judgeのcalibration（人間評価との一致率測定）を省くと「テストしているつもり」になる**ことが繰り返し報告されています。実装例は[labs/advanced](../labs/advanced/)のoracle別テスト11種を参照してください。

## 観点3: 生成 — 人間が書く時代から「人間が審査する」時代へ

- **Property-based testing / fuzzing**は入力生成の自動化。coverage-guided fuzzing（libFuzzer、AFL++、Goのnative fuzzing）はsecurity領域で標準になりました。
- **LLMによるテスト生成**は2026年の最大の変化です。研究では、生成テストは「コンパイルが通りassertionが弱い」傾向（oracle problemの再来）が指摘されています。mutation testingで生成テストの検出力を測るのが現実的な受け入れ基準です。
- 逆説的に、**mutation testing**の価値が上がりました。テストを書くのが安くなったので、「そのテストはバグを検出できるのか」を測る側が律速になったためです。
- 実務の型: 「LLMが生成 → mutation scoreとreviewで審査 → 人間はproperty・contract・edge caseの設計に集中」。

## 観点4: 実行環境 — 「CIで終わり」から「本番も検証面」へ

最先端のテストはCIの内側で完結しません。

1. **PR前**: unit＋component＋contract（分単位）。
2. **CI**: integration（Testcontainersで本物のDB／broker）、E2E最小セット、mutation（変更行のみ）。
3. **デプロイ路**: canary、feature flag、progressive delivery。「テストの失敗」ではなく「メトリクスの劣化」が判定基準になります。
4. **本番**: synthetic monitoring（合成トランザクションの常時実行）、chaos engineering（定常状態仮説の実験）。
5. **シミュレーション**: FoundationDB系の**deterministic simulation testing**（Antithesis等）は、分散システムのrace・障害シナリオを決定的に再現する手法として2024年以降広く知られるようになりました。「再現できないバグ」を原理的に潰す、現時点で最も先端的な方向の1つです。

## 観点5: 対象 — 決定的コード・分散系・データ・AIでテストは別物

- **決定的なコード**: xUnit＋property。この領域の手法は成熟済み。
- **分散システム**: 順序・重複・部分障害が本質。delivery semantics（at-least-once等）のテスト、Jepsen的なlinearizability検証、deterministic simulation。
- **データ/ML**: 「unit tests for data」（Deequ等のexpectation）、モデルはbehavioral testing（invariance／directional expectation）とslice評価。
- **LLM/agent**: evals（golden set＋LLM-as-judge＋human calibration）、red-teaming、regression evalのCI組み込み、agentはsandbox環境でのtask成功率・副作用検査（[48-agent-evaluation-sandbox](../issues/48-agent-evaluation-sandbox.md)）。**pass/failからスコア分布へ**、が最大のパラダイム差です。

## 観点6: 経済性 — flakinessと選択が最重要の運用課題

- 大規模組織の報告では、**flaky testはテスト運用コストの最大要因**です。検疫（quarantine）、自動リトライの計測付き利用、flakiness予算が標準装備になりました。
- **test selection／prioritization**（変更に関係するテストだけ実行）は、大規模monorepoでは必須。MLベースのpredictive selectionは「見逃し率」を測って導入します。
- 「テストピラミッド」は比率の教義ではなく**feedback速度とコストの配分問題**として扱うのが2026年の主流です（Testing TrophyもHoneycombも同じ問いへの別解）。

## 観点7: 研究 — エビデンスの強さを見てから採用する

- 「coverageと欠陥検出の相関は弱い（テスト数を統制すると）」「mutation scoreはより強い指標」という系列の研究は、CIゲート設計に直接効きます。
- LLM生成テストの評価研究は急増中ですが、benchmark contamination（評価対象がモデルの学習データに含まれる問題）に注意。
- 論文の読み方・再現の型は[27-research-guide](27-research-guide.md)と[templates/research-reproduction.md](../templates/research-reproduction.md)へ。

## この章の使い方

1. 自分のプロジェクトを7観点で1行ずつ現状診断する（例:「oracleはspecifiedのみ」「本番は検証面になっていない」）。
2. 最も弱い観点に対応する深掘り章を読み、[issues/](../issues/)の対応演習を1つ実施する。
3. 四半期ごとに再診断する。観点のバランスが取れているかが「最先端かどうか」より重要です。
