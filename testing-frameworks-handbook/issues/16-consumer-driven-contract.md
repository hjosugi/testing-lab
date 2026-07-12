# test(contract): Pact consumer/provider verificationを実装する
<!-- labels: contract-testing,pact,microservices -->

## Tasks

- [ ] consumer client unit testからPactを生成
- [ ] minimal matching ruleを使用
- [ ] provider stateを明示
- [ ] provider verificationをCIへ追加
- [ ] pending/WIP pactとcan-i-deploy policyを設計
- [ ] OpenAPI conformanceとの重複/差分を記録

## Acceptance criteria

- [ ] breaking provider changeでprovider verificationがfail
- [ ] irrelevant provider field追加ではconsumer testが壊れない

