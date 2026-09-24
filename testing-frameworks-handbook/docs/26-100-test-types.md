# 100種類のテスト設計カード

> 実行例: pairwise / combinatorial testingは[`labs/combinatorial`](../labs/combinatorial/README.md)で、制約・incident必須case・除外理由付きのmatrixを再生成可能に作ります。

## 読み方

これは「100種類すべて導入する」リストではありません。同じテストを**対象、目的、技法、実行時期**の別軸で呼ぶため、用語は重なります。各行の「核心」を見て、自分のriskに必要なものだけ選びます。

## A. 境界とスコープ（1–15）

| # | 名前 | 一言で | 典型oracle |
|---:|---|---|---|
| 1 | Unit | 小さな論理単位 | return/state/invariant |
| 2 | Sociable unit | 協力objectを本物で束ねる | observable state |
| 3 | Solitary unit | 協力objectをdoubleで隔離 | output/interaction |
| 4 | Component | deployable内部をまとめる | API/state/event |
| 5 | Adapter | DB/HTTP等の変換境界 | round-trip/contract |
| 6 | Integration | 複数の実物を接続 | joint behavior |
| 7 | Contract | producer/consumerの約束 | schema/example/rule |
| 8 | Consumer-driven contract | consumer利用形をproviderへ検証 | pact interaction |
| 9 | Subcutaneous | UI直下のapplication API | business outcome |
| 10 | API | network/API面 | status/body/side effect |
| 11 | System | 完成system全体 | requirement/SLO |
| 12 | End-to-end | 実利用journey | user outcome |
| 13 | Acceptance | stakeholderの受入条件 | executable example |
| 14 | Alpha | 組織内で総合評価 | acceptance/defect |
| 15 | Beta | 限定利用者・現実環境 | feedback/telemetry |

## B. 目的と変更確認（16–29）

| # | 名前 | 一言で | 典型oracle |
|---:|---|---|---|
| 16 | Smoke | buildが基本動作するか | critical checks pass |
| 17 | Sanity | 小変更周辺が妥当か | focused expected behavior |
| 18 | Regression | 既存behaviorを壊していないか | previous expected result |
| 19 | Re-test / confirmation | 修正した欠陥そのものを再確認 | bug no longer reproduces |
| 20 | Characterization | legacyの現状behaviorを記録 | captured behavior |
| 21 | Compatibility | version/OS/clientの組合せ | same contract/behavior |
| 22 | Backward compatibility | 古いconsumer/dataを維持 | old suite/data passes |
| 23 | Forward compatibility | 新field等を古い側が許容 | tolerant behavior |
| 24 | Installation | install/upgrade/uninstall | runnable/clean state |
| 25 | Migration | schema/data変換 | invariant/reconciliation |
| 26 | Upgrade | release間の移行 | behavior/data preserved |
| 27 | Configuration | setting組合せ | expected resolved config |
| 28 | Localization | 言語・形式 | correct translation/format |
| 29 | Internationalization | localeへ適応できる設計 | Unicode/time/currency rule |

## C. 例・生成・探索技法（30–47）

| # | 名前 | 一言で | 典型oracle |
|---:|---|---|---|
| 30 | Example-based | 具体的入力と期待値 | exact expected output |
| 31 | Table/parameterized | 同じruleへ複数case | per-row expected |
| 32 | Property-based | 広い入力で性質を確認 | invariant/property |
| 33 | Stateful property | command列と状態を生成 | model state |
| 34 | Fuzz | 自動変異でcrash等を探索 | no crash/sanitizer/invariant |
| 35 | Coverage-guided fuzz | 新pathを増やす変異 | coverage feedback |
| 36 | Grammar-based fuzz | 文法上もっともらしい入力 | parser/property |
| 37 | Mutation | production codeを変えtestを評価 | mutant killed |
| 38 | Metamorphic | 入力変換前後の関係 | metamorphic relation |
| 39 | Differential | 複数実装の結果を比較 | agreement/reference |
| 40 | Model-based | 仕様modelから遷移生成 | model conformance |
| 41 | State-machine | 状態遷移と禁止遷移 | state/invariant |
| 42 | Combinatorial | pairwise/t-wise組合せ | rule per combination |
| 43 | Search-based | 探索最適化で難しいcase | fitness/objective |
| 44 | Symbolic execution | path conditionを解く | assertion/path safety |
| 45 | Concolic | concrete+symbolicでpath探索 | path oracle |
| 46 | Random | 一様/分布からcase生成 | invariant/reference |
| 47 | Fault injection | failureを意図的に入れる | recovery/degradation |

## D. 表示・対話・人間（48–61）

| # | 名前 | 一言で | 典型oracle |
|---:|---|---|---|
| 48 | UI component | widget単位の状態と操作 | DOM/semantics/state |
| 49 | Browser E2E | browserからjourney | visible user outcome |
| 50 | Mobile UI | 実機/emulatorの操作 | screen/app state |
| 51 | Desktop UI | native desktop interaction | accessibility tree/state |
| 52 | Visual regression | 画像差分 | approved visual diff |
| 53 | Snapshot | serialized output差分 | reviewed snapshot |
| 54 | Golden master | 大きな既知出力と比較 | approved artifact |
| 55 | Approval | 人が結果を承認 | approved output |
| 56 | Accessibility | 支援技術・WCAG観点 | semantic/automated/manual |
| 57 | Usability | 人が目的達成できるか | task success/observation |
| 58 | Exploratory | 学習と設計と実行を同時に行う | skilled observation |
| 59 | Manual scripted | 人が手順を実行 | expected observation |
| 60 | A/B experiment | 実利用でvariant比較 | causal product metric |
| 61 | Compatibility UI | browser/device/view組合せ | functional/visual result |

## E. 非機能品質（62–78）

| # | 名前 | 一言で | 典型oracle |
|---:|---|---|---|
| 62 | Microbenchmark | 小さな処理の性能 | distribution/baseline |
| 63 | Load | 想定負荷でSLO | latency/error/throughput |
| 64 | Stress | 限界を超えて挙動確認 | saturation/recovery |
| 65 | Spike | 急増・急減 | SLO/recovery |
| 66 | Soak/endurance | 長時間の劣化 | leak/drift/SLO |
| 67 | Capacity | 安全な最大処理量 | maximum under SLO |
| 68 | Scalability | resource増加との関係 | scaling efficiency |
| 69 | Volume | 大量dataで動作 | correctness/time/resource |
| 70 | Security functional | security requirement | allow/deny/audit |
| 71 | SAST | codeを実行せず弱点探索 | rule/data-flow finding |
| 72 | SCA | dependency既知脆弱性 | advisory/policy |
| 73 | DAST | 稼働systemを外部から検査 | exploitable response |
| 74 | IAST | 実行中内部観測で検査 | taint/runtime finding |
| 75 | Penetration | 攻撃者視点の人手探索 | demonstrated exploit/risk |
| 76 | Resilience | failure下でservice維持 | steady-state invariant |
| 77 | Chaos | production-likeで仮説実験 | steady state/abort rule |
| 78 | Recovery | failure後に復旧できるか | RTO/RPO/data invariant |

## F. 並行・分散・運用（79–90）

| # | 名前 | 一言で | 典型oracle |
|---:|---|---|---|
| 79 | Concurrency | interleaving下の正しさ | invariant/no lost update |
| 80 | Race detection | data raceをruntime検出 | race detector |
| 81 | Deadlock/liveness | 停止せず進行するか | deadline/progress |
| 82 | Idempotency | 同じ要求を繰返して同じ効果 | single side effect |
| 83 | Messaging | broker delivery semantics | event/state/eventual result |
| 84 | Distributed consistency | partition/reorder下の整合 | consistency invariant |
| 85 | Deterministic simulation | event/時間/failureを制御 | model/invariant |
| 86 | Backup/restore | backupから正しく戻るか | reconciliation/RTO/RPO |
| 87 | Disaster recovery | site/region障害から復旧 | service/data objectives |
| 88 | Canary verification | 少量trafficでrelease判断 | SLO/business guardrail |
| 89 | Shadow testing | 複製trafficで新旧比較 | differential result |
| 90 | Synthetic monitoring | 定期的な人工journey | success/latency |

## G. 特殊domainと継続評価（91–100）

| # | 名前 | 一言で | 典型oracle |
|---:|---|---|---|
| 91 | Data quality | datasetの品質 | schema/constraint/distribution |
| 92 | Reconciliation | sourceとtargetを照合 | totals/count/checksum |
| 93 | Data pipeline | ETL/streamの処理 | transformation/idempotency |
| 94 | ML offline evaluation | model qualityを固定dataで測る | metric/confidence/slices |
| 95 | ML robustness | shift/noise/adversarial耐性 | performance floor |
| 96 | Fairness | group間の影響差 | domain-approved metrics |
| 97 | LLM evaluation | retrieval/generation/guardrail | rubric/reference/judge |
| 98 | Agent trajectory | tool選択・状態遷移 | policy/state/outcome |
| 99 | Infrastructure as Code | plan/resource/policy | schema/policy/deploy smoke |
| 100 | Continuous verification | 本番で仮説を継続確認 | SLO/KPI/invariant |

## 用語衝突を解く3つの質問

たとえば「API integration regression test」は1本のtestを3軸で表しています。

1. **どこを通るか**: API / integration
2. **何のためか**: regression
3. **どう判定するか**: example / property / contract

会話ではラベルだけでなく、次の文にします。

> real PostgreSQLとHTTP serverを使い、重複checkoutで請求が1件になることをDB stateで判定するPR用integration regression test。

これなら人による「unitかintegrationか」の呼び名の差があっても設計を共有できます。

## 最小ポートフォリオ

一般的なweb serviceなら、まず次の10個から始めます。

1. domain unit/example
2. domain property
3. component use-case
4. real DB integration
5. outbound contract
6. API behavior/security
7. UI component/accessibility
8. critical E2E acceptance
9. load/resilience
10. canary/synthetic/reconciliation

その後、incidentとriskに応じて100のカードから追加します。

