# test: Testcontainersでreal Postgres integrationを追加する
<!-- labels: integration-testing,testcontainers,database -->

## Depends on

- #13

## Tasks

- [x] immutable digestのPostgres imageを指定
- [x] migrationを本番と同じ経路で適用
- [x] transaction、locking、unique constraint、timezoneを検証
- [x] in-memory repositoryと同じcontract suiteを実行
- [x] container readinessとcleanupを検証

## Acceptance criteria

- [x] Docker-compatible runtimeのclean CIでgreen
- [x] container unavailable時はsilent skipせず明示failure
