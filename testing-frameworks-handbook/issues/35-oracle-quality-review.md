# quality: Test oracleの強さと独立性を監査する
<!-- labels: testing,quality,oracle,priority-high -->

## Tasks

- [ ] critical testごとにoracle種別とprotected failureを記録
- [ ] production codeと同じalgorithmを期待値計算に使うtestを検出
- [ ] assertionなし、常にtrue、過剰snapshotを検出
- [ ] false positive/negativeの代表例をmutationで確認

## Acceptance criteria

- [ ] critical riskに独立したoracleがある
- [ ] passしても保証しないことを各suiteに記載

