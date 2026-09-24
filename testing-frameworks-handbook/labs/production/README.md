# Production verification and observability-as-behavior lab

canary、shadow traffic、synthetic monitoring、runtime business invariant、SLO burn-rate alert、feature flag kill switch、traceによるcritical flow検証を、**pre-deploy testの代わりではなく二枚目の網**として実装します。log・metric・trace・alertそのものも、testできるbehaviorとして扱います。

## 構成

| File | 役割 |
|---|---|
| [`src/service.mjs`](src/service.mjs) | checkout v1/v2（v2はflag付きbundle discountと、3行以上で割引を二重適用する欠陥）、customer単位でstickyなcanary routing、flag cohortとkill switch、synthetic accountのstore、shadow用sanitizer |
| [`src/canary.mjs`](src/canary.mjs) | 最小sample数付きcanary判定（error rate差、runtime invariant違反）、multi-window burn-rate alert、alert route→runbook |
| [`src/telemetry.mjs`](src/telemetry.mjs) | W3C `traceparent`伝播、OTLP/JSON形のspan、label allowlistとseries上限付きmetric、redaction付き構造化log |
| [`RUNBOOK.md`](RUNBOOK.md) | alertごとの意味・最初に見るもの・最初の安全な操作 |
| [`verification-plan.json`](verification-plan.json) | blast radius（canary最大5%、flag cohort最大10%、synthetic件数、abort条件、rollback）とprivacy方針。**未review** |

## 検証するbehavior

| Behavior | Oracle |
|---|---|
| pre-deploy coverage | 3つのruntime invariantすべてにpre-deploy test（pricing contract）があり、v2の欠陥はpre-deploy testでも検出される |
| synthetic account | `synthetic=true`でbusiness metricから除外、tagで削除、2回目のcleanupは0件 |
| canary | 約5%がsticky routing、sample不足では判定保留、invariant違反でabort、rollbackで全員v1 |
| feature flag | cohort約10%、kill switchで全員off |
| shadow traffic | IDはhash化、`sku/quantity/unitPrice`だけcopy、email/card/order IDは出ない、永続化しない。新割引による期待差分（3件）とinvariant違反（3行以上の2件）を分けて報告 |
| SLO alert | 99.9%で長短両windowのburn rate ≥ 14.4でpage、≥ 6でticket、短windowが回復したらpageしない。全routeのrunbook anchorが実在 |
| critical flow trace | real HTTPでcheckout→paymentへ`traceparent`が伝播し、1つのtrace treeになる（payment spanがcheckout spanの子） |
| triage from artifacts | 両serviceのlogがtrace IDで結合でき、失敗spanに理由がある |
| telemetry privacy | email、card番号、tokenがspan・log・metricに残らない |
| metric cardinality | `customer_id`/`order_id` labelは拒否、1 metricあたりのseries上限でraw pathのような無制限値を止める |

## 範囲と正直な限界

- spanはOTLP/JSONと同じ形（`resourceSpans/scopeSpans/spans`、`traceId`/`spanId`/`parentSpanId`）ですが、OpenTelemetry SDKではなく最小実装です。実環境ではOTel SDK + collectorへ置き換え、同じassertion（trace tree、属性、redaction）をcollectorのexport結果に対して行います。
- `verification-plan.json`はengineering draftで、SREとprivacy ownerによるblast radius/privacy reviewは**まだ行っていません**（`reviewed: false`をtestで固定）。
- canary・shadow・syntheticはprocess内の模型です。実traffic、実alert manager、実on-call通知は検証していません。

## 実行

```bash
nix develop .#generative --command make test-production
```

## Passしても保証しないこと

- canary・shadow・synthetic・alertはprocess内の模型での検証で、実traffic、実alert manager、実on-call通知の動作は示しません。
- telemetryのsecret検査は既知の値の完全一致で、encodeや分割されたsecretは検出しません。
