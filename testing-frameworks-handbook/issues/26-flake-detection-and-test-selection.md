# ci: systemic flakiness分析とsafe test selectionを導入する
<!-- labels: ci,flaky-tests,test-selection,priority-high -->

## Tasks

- [x] first-attempt failureを保存しretry後greenと分離
- [x] co-failureをworker/host/fixture/serviceでcluster化
- [x] random orderとseed保存
- [x] quarantine owner/expiry/原因分類
- [x] dependency-based affected testsを先に導入
- [x] predictive selectionはperiodic full runとmiss metricを併用

## Acceptance criteria

- [x] flake rate、diagnosis time、selection missをdashboard化
- [x] retryでrequired checkを常時greenに見せない
