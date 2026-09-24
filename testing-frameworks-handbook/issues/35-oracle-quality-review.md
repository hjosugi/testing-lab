# quality: Test oracleの強さと独立性を監査する
<!-- labels: testing,quality,oracle,priority-high -->

## Tasks

- [x] critical testごとにoracle種別とprotected failureを記録
- [x] production codeと同じalgorithmを期待値計算に使うtestを検出
- [x] assertionなし、常にtrue、過剰snapshotを検出
- [x] false positive/negativeの代表例をmutationで確認

## Acceptance criteria

- [x] critical riskに独立したoracleがある
- [x] passしても保証しないことを各suiteに記載
