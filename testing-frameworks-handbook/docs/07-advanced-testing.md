# Property、Fuzz、Mutation、Contract、E2E

## Property-based testing

exampleを列挙する代わりに、広い入力に対して保たれる性質を定義します。

例:

- sort結果はorderedで、元入力のpermutation
- encode/decodeはround tripする
- discount後のtotalは負にならない
- idempotent operationを2回適用しても結果が同じ

property testは具体例を不要にするものではありません。business例は読みやすいspecificationとして残し、広い入力空間をpropertyで補います。

## Fuzzing

fuzzingはcrash、panic、hang、security boundaryに強い手法です。Goはtoolchainにfuzzingを統合しています。seed corpus、最大時間、failure inputの保存、nondeterminism排除が重要です。

## Mutation testing

production codeへ小さな変更（`>`→`>=`、条件削除、return値変更）を加え、testが失敗するかを測ります。

- killed: testがmutationを検出
- survived: assertion不足、equivalent mutant、到達不能など
- mutation score: killed / testable mutants

score 100%を盲目的に目指さず、money、authorization、data lossなど高risk moduleへ適用します。PHPはInfection、JavaはPIT、JSはStryker、Pythonはmutmut/cosmic-ray、Rustはcargo-mutantsなどが候補です。

## Consumer-driven contract testing

Pactではconsumer testが実際に必要とするrequest/response例からcontractを生成し、provider verificationで再生します。OpenAPI schema testとは目的が違います。

- schema: 可能なAPI surfaceの静的記述
- consumer contract: 現在のconsumerが依存するconcrete interaction

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

