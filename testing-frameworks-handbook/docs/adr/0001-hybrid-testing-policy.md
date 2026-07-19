# ADR-0001: Classical/London hybrid testing policy

- Status: Accepted
- Date: 2026-07-19
- Decision owners: repository maintainers
- Applies to: production code、test code、CI lane、test double

## Context

ClassicalとLondonはunitの切り方とoracleが異なります。どちらかをrepository全体へ一律適用すると、pure domain ruleまでmockするか、重要なoutbound protocolを最終stateだけで間接的に見るかのどちらかに偏ります。

このrepositoryでは変更riskとboundaryからstyleを選び、必要な現実性とfailure局所性を最小costで組み合わせます。schoolはidentityやdirectory ruleではなく、個々のriskへtestを設計するための選択肢です。

## Decision

### layerごとのdefault

| Layer | Default style | Realにするもの | Replaceするもの | Primary oracle | 必須の補完 |
|---|---|---|---|---|---|
| Domain | Classical / sociable | value object、entity、policy、pure collaborator | 原則なし。clock/random等の非決定性だけ制御 | return value、state、invariant、property | focused unit、property、mutation |
| Application / use case | Hybrid | subjectと軽量domain object | process外port、遅い/非決定的boundary | outcome/stateを基本に、business上重要なmessageだけinteraction | real wiringのcomponent test |
| Adapter | Contract + integration | owned adapter、serializer、driver、可能ならreal engine/server | provider sandboxが不可能な時のcontrolled server/stub | protocol、mapping、constraint、error semantics | consumer/provider contract、少数sandbox smoke |
| Composition / entry point | Classical component | production wiringと複数real service | process外boundaryのみfake | externally observable outcome | framework/transport integration、critical E2E |

defaultは強制的な割合ではありません。同じfeatureでdomainはClassical、application protocolはLondon、adapterはreal integrationを併用します。

### risk / boundary decision table

| Risk / boundary | First choice | Double | Oracle | Complement | Avoid |
|---|---|---|---|---|---|
| price、discount、validation等のpure rule | Classical focused/sociable unit | 通常なし | exact state + property | mutation | value object mock |
| 複数domain objectのstate transition | Classical sociable unit | process外portだけfake | aggregate state/invariant | focused diagnostic test | private method assertion |
| payment、notification等の重要outbound command | London solitary unit | owned outbound portのmock/spy | message、引数、cardinality | state-based component | third-party SDKを直接mock |
| failure時にside effectを禁止 | focused interaction test | owned port mock | `not_called`をbusiness consequenceに限定 | component fault injection | 全collaboratorへの機械的`not_called` |
| call order / causality | interaction timeline | owned role mock | relative/strict order | component state | 逆順でも正しい手順の固定 |
| DB query、constraint、transaction | real adapter integration | fakeはfast feedbackだけ | persisted state、constraint、rollback | shared contract suite | in-memory fakeだけでDB互換を主張 |
| external HTTP schema/error mapping | owned adapter contract | local stub server | request/response contract | provider/sandbox smoke | vendor clientのmethod callだけをoracleにする |
| framework/DI wiring | component/integration | process外port fake | public entry point outcome | smoke/E2E | constructor call graphのmock |
| browser/user journey | component browser + critical E2E | networkをriskに応じてroute | rendered/accessible/user outcome | API/contract | DOM/framework internalsのmock |
| rare timeout/retry/idempotency failure | deterministic fake/stub + state model | clock/provider port | final state + bounded important interaction | controlled integration | sleepとunbounded retry |

### mock対象

mock/spyを使ってよいdefault:

- repositoryが所有するconsumer-side port
- process外、遅い、非決定的、またはrare failureを持つboundary
- interaction自体がbusiness consequenceになるcommand
- call count/orderがidempotency、atomicity、causalityの仕様であるmessage

interaction assertionはmessage、business引数、必要なcardinalityへ絞ります。順序は「逆順でも利用者から見たbehaviorが正しいか」を問い、正しくない場合だけ固定します。

### mock禁止対象

例外ADRなしではmockしない:

- immutable value object、entityのdata accessor、collection
- pure function、discount/tax等のdomain policy
- private method、internal helper、同一aggregate内の実装手順
- ORM/SQL engine、serializer、DI containerの挙動を保証するためのmock
- third-party SDKの型を直接mockし、それだけで自分のadapter契約を保証するtest
- getter、constructor、cache等のbusiness consequenceを持たない全call列

禁止はlibraryの利用可否ではなく、oracleの誤りを防ぐ境界です。第三者SDKはowned portの外側へadapterで閉じ込め、adapter自体はcontract/integrationで検証します。

## Fake contract suite

stateful fakeをproduction adapterの代替としてrequired testへ使う場合、次をすべて満たします。

1. consumerが依存するowned portとbehaviorを明文化する
2. 同じcontract test本体をfakeと少なくとも1つのreal adapterへ実行する
3. success、not-found/empty、主要error、関連するconstraintを含める
4. idempotency、ordering、precision、transactionがriskならcontract caseへ含める
5. 各caseが独立したclean stateを持ち、parallel実行で共有stateを漏らさない
6. real adapter suiteをintegration CI laneでrequiredにし、恒久skipしない
7. 差異が見つかったらfakeを直すか、fakeが保証しないsemanticを明記する

real adapterがまだない段階ではfakeをTDD/fast feedbackに使えますが、release保証の代替にはしません。real adapter contractを追加するIssueと期限を作るか、下記の例外ADRを承認します。

Python repositoryはfast feedback用in-memory fakeとreal Postgres adapterへ同じcontract suiteを実行します。Postgres固有のtransaction、locking、constraint、timezone、migration、container lifecycleは専用integration suiteで補完し、Linux CI laneでrequiredにします。実装記録は[`issues/14-real-database-testcontainers.md`](../../issues/14-real-database-testcontainers.md)です。

## CI mapping

| Lane | Required policy evidence |
|---|---|
| fast / PR | domain state/property、application solitary、small component |
| integration / PR | real adapter contract、DB/API/broker semantics |
| release | provider smoke、migration、critical E2E |
| scheduled | mutation、fuzz、cross-browser、long-running risk |

mock-only application testがgreenでもcomposition、adapter、provider compatibilityは保証しません。少なくとも1つのcomponent testでproduction wiringを通し、boundary固有riskはintegration以降へ割り当てます。

## Exceptions

defaultから外れる場合は[`templates/testing-policy-exception-adr.md`](../../templates/testing-policy-exception-adr.md)をコピーし、次を記録します。

- 外れるpolicy ruleと対象scope
- risk / boundaryとdefaultが不十分な具体的理由
- 検討した代替と測定/evidence
- interaction couplingまたはfake driftの残余risk
- compensating testとCI lane
- owner、review date、exit criteria

一時例外は期限なしにできません。恒久判断は`Accepted` ADR、移行中は期限付き`Accepted` ADRとして管理します。

## Consequences

### Positive

- domain refactorでinteraction testが大量に壊れにくい
- application protocolのfailureがsubject単位に局所化する
- fake driftをreal adapter contractで検出できる
- test styleをrisk、boundary、oracleからreviewできる

### Cost

- 同じfeatureに複数levelのtestが必要になる
- real adapter contract用environmentの維持costが増える
- call orderを仕様にする判断と例外ADRのreviewが必要になる

## Examples in this repository

- Classical discount: [`labs/python/CLASSICAL-TDD.md`](../../labs/python/CLASSICAL-TDD.md)
- London notification workflow: [`labs/python/LONDON-TDD.md`](../../labs/python/LONDON-TDD.md)
- Shared fake/real contract: [`labs/python/test_support/order_repository_contract.py`](../../labs/python/test_support/order_repository_contract.py)
- Real Postgres semantics: [`labs/python/postgres_tests/postgres_engine_semantics.py`](../../labs/python/postgres_tests/postgres_engine_semantics.py)
- Component wiring: [`labs/python/tests/test_checkout_workflow_component.py`](../../labs/python/tests/test_checkout_workflow_component.py)
