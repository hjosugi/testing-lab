# test: Testcontainersでreal Postgres integrationを追加する
<!-- labels: integration-testing,testcontainers,database -->

## Depends on

- #13

## Tasks

- [ ] immutable digestのPostgres imageを指定
- [ ] migrationを本番と同じ経路で適用
- [ ] transaction、locking、unique constraint、timezoneを検証
- [ ] in-memory repositoryと同じcontract suiteを実行
- [ ] container readinessとcleanupを検証

## Acceptance criteria

- [ ] Docker-compatible runtimeのclean CIでgreen
- [ ] container unavailable時はsilent skipせず明示failure

