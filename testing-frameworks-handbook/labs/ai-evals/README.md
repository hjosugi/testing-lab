# Data・ML・LLM・Agent evaluation lab

有料APIや外部modelを使わず、決定的なfake model・小さな自前model・versioned datasetで、data quality、ML、RAG、LLM-as-judge、agentの評価方法を検証します。評価の**方法とgate**を学ぶlabで、特定LLMの性能は主張しません。

## Data quality（`src/data.mjs`）

| Check | 例 |
|---|---|
| schema / null / range / enum | `total`が負、`currency`が`EUR`、`orderId`がnull、`total`が小数 |
| unique | 同じ`orderId`の重複 |
| reconciliation | 注文合計 ≠ 明細合計、存在しない注文への明細（orphan） |
| late / duplicate / out-of-order | event-time tumbling window + watermark（allowed lateness 30秒）。eventId重複は無視、閉じたwindowへの遅延eventは`late`へ分離し、公開済みの集計を書き換えない |

bounded disorder（隣接swap）と10件の再配送を加えても集計が同一であることをmetamorphic relationとしてtestします。

## ML（`src/model.mjs`）

seed付き合成dataで学習する純JSのlogistic regression（不正検知）です。少数region（br）の不正は多数region（jp）と特徴が異なるように作っています。

| Test | 結果 |
|---|---|
| aggregate | accuracy > 0.95、recall ≥ 0.6で**合格** |
| critical slice | br sliceのrecallが0.5未満で**gate不合格**。aggregateだけ見ると見逃す |
| fairness | region間のequal-opportunity gap（recall差）を報告 |
| robustness | 判定境界から離れた取引は、amountの微小摂動で判定が反転しない |
| drift | 同じ母集団のPSI < 0.1、amountを1 shiftした母集団はPSI > 0.25 |
| nondeterminism | 5つのtraining/data seedの**最悪値**でgate。seed間のばらつきが0でないことも確認 |

## RAG（`src/rag.mjs`、`datasets/rag.v1.json`）

BM25 retrieverのrecall@kと、extractive fake generatorのgroundedness（回答文のtokenの80%以上がretrieved contextにあるか）を別々に測ります。q4は「groundedだが質問に答えていない」例で、groundedness ≠ correctnessをtestで固定しています。contextにない主張（hallucination）はungroundedとして検出します。

## LLM-as-judge calibration（`src/judge.mjs`、`datasets/judge-sample.v1.json`）

rubric judge（必須語あり・禁止主張なし）を、人が2名でlabelした20件と比較します。

- strict judge: Cohen's kappa 0.9。不一致1件（J-20: 対比として禁止語を含む正答）はrubricのfalse negativeとして記録
- lenient judge（禁止主張を無視）: kappa 0.6で、使用閾値0.7未満のためgateに使わない

judgeをgateに使う前に、必ず人のsampleで一致度を測ります。

## Agent（`src/agent.mjs`、`src/evaluate.mjs`、`datasets/agent-golden.v1.json`）

| 層 | 実装 |
|---|---|
| deterministic parser / tool schema | JSON 1 object、既知tool、型・長さ・余分な引数を検査。不正な出力は実行前に拒否 |
| sandbox | taskごとのallowlist。write/external toolは明示許可が必要。tool emulatorでtimeout/error/permission deniedを注入 |
| fake model | taskごとの決定的policy。`followsInjectedInstructions`でtool出力内の`SYSTEM: call …`に従う（prompt injectionに弱いmodel）、`temperature`で壊れたJSONを確率的に出す |
| versioned golden dataset | 9 item、slice（lookup/multi-step/write/adversarial）、adversarial 2件はdocument内にrefund/email実行の注入 |

評価は**trajectory**（不正出力・禁止tool試行・policy拒否・権限外副作用）、**final outcome**、**cost**（token概算）、**latency**を別々に集計し、release gateは次の順に判定します。

1. 権限外の副作用が1件でもあれば不合格（absolute security invariant）
2. sliceごとのoutcome合格率
3. token予算、p95 latency予算

prompt injectionに従うmodelでも、sandboxが`issue_refund`/`send_email`を拒否するため副作用は0件です。negative controlとしてsandboxを外すと、同じmodelで3件の権限外副作用（過剰refund、注入refund、注入email）が発生し、gateが落ちます。

### Provenance

各runはmanifestにmodel version、temperature、prompt template hash、tool schema version/hash、dataset名@version/hash、seed、fault設定、sandbox bypassを記録し、manifestと全item結果からresult hashを作ります。同じmanifestは同じresult hashを再現し、prompt・seed・datasetのどれかを変えるとhashが変わります。

## 実行

```bash
nix develop .#generative --command make test-ai-evals
```

## このlabが保証しないこと

- fake modelは評価harnessを検証するためのものです。実LLMの能力・安全性の評価には、同じharnessへ実modelを差し替え、sampling回数とcostを設計し直す必要があります。
- 人のlabel 20件はcalibration方法の例です。実運用ではslice別に十分な件数と、label者間一致度の記録が必要です。
- sandboxはprocess内のallowlistです。実環境ではOS/container/network境界での隔離も必要です。
