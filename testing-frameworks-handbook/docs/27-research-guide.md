# テスト研究を実務へ適用するガイド

> 実行例: [`labs/research`](../labs/research/README.md)は、coverage/mutation相関（size制御）、assertion数、PBT generator/shrinking、flaky co-failure、deterministic simulation、生成test vs human test、predictive selectionの7主張を同一budget・同一oracleで再現し、negative resultも含めて`templates/research-reproduction.md`形式で記録します。recordの数値はtestで実験結果と一致を強制します。

## 一言でいうと

論文の結論をそのまま規則にせず、**問い・対象・比較条件・効果量・限界**を読み、自分のsystemで小さく再現します。

## 論文を読む7つの質問

1. Research questionは何か。
2. 対象は学生、小規模OSS、大規模企業、生成benchmarkのどれか。
3. 独立変数とoutcomeは何か。
4. baselineは公平か。
5. statistical significanceだけでなくeffect sizeはどうか。
6. construct/internal/external validityの脅威は何か。
7. artifact、data、codeを再現できるか。

## Evidenceの強さ

| 種類 | 強み | 注意 |
|---|---|---|
| systematic review/survey | 研究全体を俯瞰 | 元研究の質に依存 |
| controlled experiment | 因果を見やすい | 現場一般化に限界 |
| industrial case study | 現実の規模 | 単一組織の文脈 |
| mining software repositories | 大量の履歴 | proxy metricと因果混同 |
| benchmark evaluation | 比較可能 | benchmark contamination/代表性 |
| experience report | 実装詳細 | selection/publication bias |
| preprint | 新しい | peer review前 |

## 重要な研究テーマと実務上の読み方

### Coverage

高coverageと高品質は同義ではありません。coverageは「通っていない場所」を探すには有用ですが、oracle strengthを表しません。branch coverage、mutation、escaped defect、riskを合わせます。

### Mutation testing

mutation scoreはtest adequacyの強い補助指標ですが、equivalent mutant、tool operator、sampled mutants、runtime costを確認します。全repositoryを毎PRで回すより、critical moduleとchanged codeから始めます。

### Property-based / fuzzing

欠陥発見数だけでなく、generator quality、oracle、shrinking、seed再現性、corpus evolutionを見ます。API surfaceへ雑なrandom bytesを投げるだけでは比較になりません。

### Flaky tests

test codeだけでなくproduction concurrency、infrastructure、environment interactionも原因です。研究の分類体系を自社failure taxonomyへ移し、検出率と修復時間を測ります。

### Test selection/prioritization

短縮率だけでなく、fault detection loss、changed code coverage、fallback full run、モデルdriftを確認します。

### LLM test generation

compile/pass/coverageだけでは「正しいoracle」を評価できません。

- generated testがbuggy implementationを正解として固定していないか
- mutationをkillするか
- duplicate/trivial testでないか
- hidden benchmark/test contaminationがないか
- dependency/API versionが現実的か
- human review costを含めて得か

## 再現実験テンプレート

```markdown
# Claim
何が、何と比べ、どの条件で改善するか

# Context
system、language、module risk、commit、environment

# Baseline
既存手法、同じbudget、同じoracle

# Treatment
tool/version/configuration/seed/time budget

# Outcomes
real/mutated fault detection、runtime、flake、review/maintenance cost

# Threats
sample、operator、leakage、learning effect、confounder

# Decision
adopt / limited pilot / reject / more evidence
```

## 最新情報の扱い

- versionやreleaseは公式documentation/repositoryを一次情報にする
- paperはDOI、publisher、conference/journal pageを優先する
- arXivはpreprintと明記する
- blogは実装補助に使い、一般的結論の唯一の根拠にしない
- “latest”は検索日を記録する

本教材の具体的な文献とリンクは[研究と最新実務](13-research-and-modern-practice.md)および[公式情報源](11-sources.md)にあります。

## Team journal club

60分なら次で進めます。

- 5分: claim
- 10分: method/sample
- 10分: results/effect
- 10分: threats
- 15分: 自社riskへの対応
- 10分: 小さな実験とowner決定

「面白かった」で終わらせず、adoption decisionまたは検証Issueを残します。

## AI時代の研究上の注意

- benchmark leakageとtraining contamination
- model/version/APIの非再現性
- prompt・temperature・tool schemaの未報告
- judge modelとtarget modelの相関bias
- pass@kと単一attemptの混同
- cost/latency/human correctionの除外
- security/privacy条件の不足

model名だけで比較せず、artifact、budget、attempt count、oracle、人手を揃えます。

## 採用前checklist

- [ ] claimを1文で言える
- [ ] baselineとbudgetが公平
- [ ] 自社と対象populationの差を説明できる
- [ ] outcomeがbusiness riskへつながる
- [ ] artifact/version/seedを保存した
- [ ] maintenanceとfalse alarmを測る
- [ ] pilotの停止条件がある
- [ ] preprintとpeer-reviewedを区別した

