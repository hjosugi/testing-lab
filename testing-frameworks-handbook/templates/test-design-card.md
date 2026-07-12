# Test design card

## Protected failure

- 利用者/事業/運用に起きる失敗:
- Severity / likelihood:
- Owner:

## Boundary

- SUT:
- Real dependencies:
- Replaced dependencies and why:
- Entry point / stimulus:
- Observation points:

## Oracle

- Expected value / invariant / model / contract / relation:
- そのoracleが独立している理由:
- False positive / false negative risk:
- Passしても保証しないこと:

## Data and nondeterminism

- Representative / boundary / invalid data:
- Time / random / concurrency / network control:
- Seed / clock / namespace:

## Execution

- Local / PR / main / nightly / release / production:
- Timeout / retry / quarantine policy:
- Parallel isolation:
- Required environment:

## Diagnostics

- Failure message:
- Logs / trace / screenshot / DB state:
- Secret/PII redaction:

## Lifecycle

- Related requirement/incident:
- Review date:
- Replacement/retirement condition:

