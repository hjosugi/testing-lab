# data: Test data factory・隔離・privacyを整備する
<!-- labels: testing,test-data,privacy,security -->

## Tasks

- [x] minimal factoryとmeaningful defaultsを作成
- [x] unique namespace/tenantとcleanupを実装
- [x] production data利用の禁止/匿名化policyを定義
- [x] clock、random seed、localeをrecord

## Acceptance criteria

- [x] parallel実行でcollisionしない
- [x] artifactにPII/secretが残らない
