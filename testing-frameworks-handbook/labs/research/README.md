# Research reproduction lab

主要論文の主張を、**同じbudget・同じoracle**で小規模に再現し、[`templates/research-reproduction.md`](../../templates/research-reproduction.md)の形式で記録します。再現できなかった結果もnegative resultとして残します。実験はすべてseed付きで決定的に動き、testが「recordに書いた数値＝codeが今出す数値」を強制します。

## 結果一覧

| # | Claim（出典、状態） | 結果 | Record |
|---|---|---|---|
| 1 | coverageとmutation scoreの相関はsuite sizeを制御すると弱まる（Inozemtseva & Holmes, ICSE 2014, peer-reviewed） | **部分的に再現**: raw tau 0.641 → size固定で平均0.344。方向は一致、ただし「弱い」より中程度 | [01](records/01-coverage-vs-mutation.md) |
| 2 | assertion数はsize制御後もeffectivenessと強く相関（Zhang & Mesbah, ESEC/FSE 2015, peer-reviewed） | **再現せず（negative）**: size固定で平均tau 0.132。assertionの数ではなく強さが効く設定 | [02](records/02-assertions-vs-effectiveness.md) |
| 3 | 同じbudgetでboundary寄りgeneratorとshrinkingが有効（Claessen & Hughes ICFP 2000、Goldstein et al. ICSE 2024） | **再現**: 検出率uniform 0.075 vs boundary 0.995、反例62→最小37 | [03](records/03-pbt-generator-and-shrinking.md) |
| 4 | flaky failureは共通原因でclusterを作る（Pei et al., ISSTA 2025） | **手法を合成dataで再現**（有病率は未検証） | [04](records/04-co-occurring-flaky-failures.md) |
| 5 | deterministic simulationはseedから失敗を再現（FoundationDB SIGMOD 2021、RediI ICSE 2025） | **単一service規模で再現** | [05](records/05-deterministic-simulation-reproduction.md) |
| 6 | 生成testはscoreが高くてもoracleが現状の挙動を写す（Schäfer et al. TSE 2024、Ouédraogo et al. 2024 **preprint**） | **非LLMの代替で部分的に再現**: 生成suiteのmutation score 1.0 > human 0.813なのに、既存の本物の欠陥を検出できない | [06](records/06-generated-vs-human-tests.md) |
| 7 | predictive selectionはmiss測定とfull runが前提（Machalica et al., ICSE-SEIP 2019） | **安全網の必要性を再現**（論文規模の削減率は未検証） | [07](records/07-predictive-selection-needs-full-runs.md) |

## 実験の設計

- **subject**: `src/subject.mjs`の送料計算（10 branch probe）。coverageは外部toolなしでprobeから測ります。
- **mutants**: `src/mutants.mjs`の16個の文字列置換（境界、演算子、定数）。mutantは`data:` URLのmoduleとして読み込み、元のfileは変更しません。
- **test pool**: 24 test。値をassertするtestと、型だけを見る弱いtestを意図的に混ぜています。
- **equal budget**: 比較する処理（suite、generator、生成test vs human test）には同じ件数・同じmutant・同じseedを与えます。
- **統計**: Kendall tau-b（論文1と同じ）。有意性検定は行っていません（小sampleのため、数値は傾向として扱います）。

## Peer-reviewedとpreprintの区別

各recordの`Peer-reviewed / preprint / industry report`に状態を書き、preprint（例: record 06のOuédraogo et al.）はpeer-reviewedの主張と同じ重みで採用判断に使いません。industry trackの論文（record 07）も明記します。

## 自社contextへのexternal validity

- subjectは30行の関数1つです。**方向性**（sizeがcoverage相関の多くを説明する、境界寄りgeneratorが境界欠陥に強い、生成oracleは既存欠陥を写す）は採用判断に使えますが、**数値**を大規模codebaseへ外挿しません。
- 4、5、7は`labs/flakiness`と`labs/resilience`の合成環境での再現です。実CI履歴・実分散systemでのpilotをowner付きで記録しています。
- record 06はLLMを使っていません。有料APIを使わない制約下の代替で、LLM固有の性質（hallucinated API、非決定性）は測っていません。

## 実行

```bash
nix develop .#generative --command make test-research
```

## Passしても保証しないこと

- testは「recordの数値が実験の出力と一致する」ことを保証します。論文の主張が一般に正しいかどうかは保証しません。
- 小さなsubjectでの結果を大規模codebaseへ外挿しないでください（上記external validity）。
