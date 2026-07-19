# test(contract): Pact consumer/provider verificationを実装する
<!-- labels: contract-testing,pact,microservices -->

## Tasks

- [x] consumer client unit testからPactを生成
- [x] minimal matching ruleを使用
- [x] provider stateを明示
- [x] provider verificationをCIへ追加
- [x] pending/WIP pactとcan-i-deploy policyを設計
- [x] OpenAPI conformanceとの重複/差分を記録

## Acceptance criteria

- [x] breaking provider changeでprovider verificationがfail
- [x] irrelevant provider field追加ではconsumer testが壊れない
