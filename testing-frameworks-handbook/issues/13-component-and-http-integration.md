# test: component/HTTP integrationのvertical sliceを完成する
<!-- labels: integration-testing,api,hands-on,priority-high -->

## Tasks

- [ ] in-process componentとreal HTTP testを分離
- [ ] invalid JSON、timeout、cancellation、large bodyを追加
- [ ] unique portとparallel executionを検証
- [ ] trace ID/error problem detailをassert
- [ ] test scope/boundary/double/oracleをREADMEへ記録

## Acceptance criteria

- [ ] `labs/system` HTTP adapter testが100回連続green
- [ ] test名だけで境界が分かる
