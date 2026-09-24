# Flakiness analysis and safe test selection lab

flaky testを「個別testの運の悪さ」ではなく**systemicな原因**として分析し、retryでrequired checkを緑に見せない運用と、見逃しを測りながら使うtest selectionを検証します。

## Ground truth付きCI history

[`src/history.mjs`](src/history.mjs)は60 run × 10 testのattempt-level historyをseed付きで生成し、原因を意図的に埋め込みます。

| 埋め込んだ原因 | 影響するtest | 期待される分析結果 |
|---|---|---|
| runner-7がpayments sandboxを名前解決できない | payment-capture / refund / webhook | host=runner-7のsystemic cluster |
| orders-cleanupが先に走るとorders-listが空tableを見る | orders-list | `after=orders-cleanup`（order dependence） |
| wall-clock依存 | ui-timer | どのfeatureでも説明できないintrinsic flake |
| run 45からの本物のregression | checkout-total | flakeではなくbroken（全attemptで失敗） |

## 分析

1. **first attemptとretryを分離**: 各run×testを`pass` / `flaky`（初回失敗→retry成功）/ `fail`（全attempt失敗）に分類します。retryで隠すと97.3%が緑に見えますが、first-attempt failure rateは13.7%です。
2. **co-failure clustering**: 初回失敗が同じrunに起きるtestをJaccard ≥ 0.5でsingle-linkage clusteringします。
3. **attribution**: clusterの各attemptにhost、worker、fixture、service、「どのtestの後に走ったか」をfeatureとして付け、support ≥ 5かつP(fail|feature) ≥ 0.8のfeatureを原因候補にします。上の表の4原因すべてを正しく復元できることをtestで確認します。
4. **random orderとseed**: 各runのorder seedを保存し、同じseedで失敗順序を再現します。共有stateを持つ小さなsuiteでも、失敗seedの再実行が同じorder・同じ失敗になることを確認します。

## Quarantine

[`quarantine.json`](quarantine.json)の各entryは`owner`、原因分類（host-infra / order-dependent-fixture / timing / external-service / unknown）、tracking issue、最長30日の期限を持ちます。期限切れ・owner不在・未知の原因はvalidationで失敗します。

## Required check

`requiredCheck`は**first attempt**から判定します。

- quarantineされていないtestが初回失敗したら、retryで通っても`blocking`（「flakyとして記録され、緑ではない」）
- quarantine中のtestの失敗は`quarantinedFailures`として報告し続ける（非表示にしない）
- regression（checkout-total）はquarantineで逃がせない

retryは診断情報（再現するか、環境依存か）を得るためのもので、required checkを緑にする手段ではありません。

## Test selection

[`fixture-project/`](fixture-project/)の静的import graphを使います。

| 方式 | 選び方 | 40 commitでの結果 |
|---|---|---|
| dependency-based | 変更fileへ推移的にimportで到達するtest。graphにないfile（例: runtimeに読む`config/payment.json`）はfull runへfallback | miss 0/13、平均2.5 test（全4 test） |
| predictive（top-1） | 過去に同じfile変更で失敗したtest上位1件 | miss 8/13（61.5%）、平均1.4 test |

predictive selectionは単独では安全ではありません。5 commitごとのfull runで見逃しを最大4 commit以内に検出できることを測り、miss rateをdashboardへ出して採否を判断します。まずdependency-based selectionを導入し、predictiveはperiodic full runとmiss metricを併用する場合だけ使います。

## Dashboard

`scripts/dashboard.mjs`は`build/flake-dashboard.md`（CIでは`GITHUB_STEP_SUMMARY`にも）へ、first-attempt failure rate、flake rate、retryで隠した場合の見かけのpass rate、診断時間（初回flake→quarantine）、selection miss rate、cluster attributionを出力します。`labs/system`のPlaywright flake reporterが`test-results/flake-metrics.json`を残していれば、そのfirst-attempt failureも同じ表へ載せます。

## 実行

```bash
nix develop .#generative --command make test-flakiness
nix develop .#generative --command make flake-dashboard
```

## このlabが保証しないこと

- historyは合成dataです。実CIではattempt単位のJUnit XML/reporter出力を同じschema（runId、testId、attempt、host、worker、fixture、service、order seed）で保存する必要があります。
- attributionは相関です。runner-7のDNSのような原因は、再現実験（同じhostで再実行、別hostへ移す）で確認してから直します。
