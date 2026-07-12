# 境界とテストポートフォリオ

## pyramidより変更リスクから考える

unitを大量、integrationを中量、E2Eを少量という形は有用なheuristicですが、比率を目標にしません。欠陥の種類、変更頻度、実行時間、診断性からportfolioを決めます。

| Risk | 最初の選択 | 補完 |
|---|---|---|
| calculation bug | pure unit/property test | mutation test |
| orchestration bug | application unit/component test | interaction test |
| ORM/query mismatch | real DB integration | migration test |
| API breaking change | consumer/provider contract | smoke E2E |
| browser wiring | component/browser test | critical journey E2E |
| resilience | fault injection/component test | controlled chaos |

## boundaryを置く場所

test seamは技術都合だけでなくownership boundaryに置きます。

- process boundary: HTTP、message broker、filesystem
- nondeterminism boundary: clock、random、UUID
- persistence boundary: repository／transaction
- policy boundary: tax、pricing、authorization rule
- hardware/UI boundary: browser、mobile OS、game engine

## hermeticityの段階

1. pure in-memory
2. local process／temporary filesystem
3. ephemeral real infrastructure
4. shared test environment
5. production smoke

上に行くほど現実性が増えますが、速度、再現性、ownershipが難しくなります。同じ保証を全段階で重複させず、各段階でしか検出できないfailureを狙います。

## test contract for fakes

fake repositoryが本物と同じcontractを満たすか、同一suiteを両方へ実行します。

```text
RepositoryContract
  saves and reloads an order
  rejects duplicate id
  preserves version for optimistic locking

run against InMemoryOrderRepository
run against PostgresOrderRepository
```

これがないfakeは、便利な別実装にすぎず、本番の代替観測として信用できません。

## CI lane

| Lane | 目標 | 内容 | Block |
|---|---|---|---|
| fast | 5分以内 | lint、type、unit、small component | PR |
| integration | 15分目安 | DB、broker、contract provider | PR/merge policy |
| release | 30分以上可 | critical E2E、migration、security | deploy |
| scheduled | 夜間 | mutation、full fuzz、chaos、cross-browser | alert/triage |

