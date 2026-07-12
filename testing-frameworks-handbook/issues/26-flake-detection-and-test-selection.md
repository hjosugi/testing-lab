# ci: systemic flakiness分析とsafe test selectionを導入する
<!-- labels: ci,flaky-tests,test-selection,priority-high -->

## Tasks

- [ ] first-attempt failureを保存しretry後greenと分離
- [ ] co-failureをworker/host/fixture/serviceでcluster化
- [ ] random orderとseed保存
- [ ] quarantine owner/expiry/原因分類
- [ ] dependency-based affected testsを先に導入
- [ ] predictive selectionはperiodic full runとmiss metricを併用

## Acceptance criteria

- [ ] flake rate、diagnosis time、selection missをdashboard化
- [ ] retryでrequired checkを常時greenに見せない

