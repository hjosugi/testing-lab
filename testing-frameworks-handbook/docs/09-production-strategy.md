# 本番プロジェクトへの導入

## 90日プラン

### Day 1-14: 可視化

- test種類、実行時間、flake率、ownerを棚卸し
- production incidentをどのtest層なら防げたか分類
- critical business pathsを10個まで選ぶ
- fast laneのbaselineを保存

### Day 15-30: 境界整理

- clock/random/remote APIへ明示portを置く
- giant fixtureとglobal stateを削減
- fake contract suiteを作る
- test namingとdata builderの規約を決める

### Day 31-60: portfolio改善

- pure domainへproperty test
- service間へcontract test
- real DB integrationをephemeral化
- E2Eをcritical journeyへ整理
- flake quarantineにowner/期限を追加

### Day 61-90: 強度と運用

- high-risk moduleへmutation test
- CI lane分離
- p50/p95 test duration、flake率、escaped defectをdashboard化
- framework upgrade policyを決める

## pull request checklist

- 変更したbehaviorがtest名から分かる
- successだけでなく重要failure pathがある
- clock/random/networkが制御されている
- private implementationを不必要にverifyしていない
- parallel実行で共有resourceが衝突しない
- retryを追加する場合、原因Issueと期限がある
- integration fakeにはreal adapter contractがある
- E2E追加理由が下位層で検出できないfailureに対応する

## metrics

| Metric | 目的 | 誤用 |
|---|---|---|
| suite p50/p95 duration | feedback速度 | test数だけ削る |
| flake rate | trust | retry後greenを成功扱い |
| mutation score by risk module | assertion強度 | 全repo 100%目標 |
| escaped defects | portfolio gap | 個人評価 |
| failure diagnosis time | report品質 | logs量を増やすだけ |

