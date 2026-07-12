# Test strategy: <system/change>

## 1. Context and goals

system、利用者、変更、対象外を短く書く。

## 2. Risk register

| Failure | Impact | Likelihood | Detection difficulty | Owner |
|---|---:|---:|---:|---|
| | | | | |

## 3. Architecture and boundaries

component、DB、external API、broker、UI、production topologyを示す。

## 4. Test portfolio

| Risk | Test level/technique | Real/replaced | Oracle | CI lane |
|---|---|---|---|---|
| | | | | |

## 5. Non-functional

- Performance/SLO:
- Security/threats:
- Resilience/DR:
- Accessibility/usability:
- Data/privacy:

## 6. Environments and test data

reproducibility、Nix/container、seed、account、cleanup、parallel isolationを書く。

## 7. CI and release gates

lane、duration budget、required checks、canary、rollbackを定義する。

## 8. Flakiness and diagnostics

artifact、retry、quarantine、owner、SLAを定義する。

## 9. Metrics

escaped defect、mutation、coverage、flake、duration、queue、maintenanceをrisk別に見る。

## 10. Exit criteria and residual risk

完了条件、未検証、manual judgment、承認者を書く。

