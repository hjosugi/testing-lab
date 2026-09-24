# Architecture Decision Records

| ADR | Status | Decision |
|---|---|---|
| [0001](0001-hybrid-testing-policy.md) | Accepted | Classical/London hybrid testing policy |
| [0002](0002-adopt-microsoft-testing-platform.md) | Accepted | .NET 10 testの既定platformにMTPを採用 |
| [0003](0003-javascript-unit-runner-selection.md) | Accepted | Node.js unit/component testの既定runnerをnode:testにする |

## 運用

1. architecture、boundary、test policyを長期に変える判断はADRを追加する
2. statusは`Proposed`、`Accepted`、`Superseded`、`Deprecated`のいずれかにする
3. 既存ADRを上書きせず、新ADRからsupersedeする
4. hybrid testing policyの例外は[testing policy exception template](../../templates/testing-policy-exception-adr.md)を使う
5. 一時例外にはowner、期限、compensating test、exit criteriaを必須にする
