# data: Test data factory・隔離・privacyを整備する
<!-- labels: testing,test-data,privacy,security -->

## Tasks

- [ ] minimal factoryとmeaningful defaultsを作成
- [ ] unique namespace/tenantとcleanupを実装
- [ ] production data利用の禁止/匿名化policyを定義
- [ ] clock、random seed、localeをrecord

## Acceptance criteria

- [ ] parallel実行でcollisionしない
- [ ] artifactにPII/secretが残らない

