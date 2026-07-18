# ADR-NNNN: Testing policy exception for {scope}

- Status: Proposed
- Date: YYYY-MM-DD
- Owner:
- Review / expiry date:
- Supersedes: none
- Related Issue / PR:

## Context and risk

- Change / system:
- User or operational failure being protected:
- Boundary:
- CI lane:

## Policy rule being excepted

ADR-0001のsection名を示し、外れるdefault/prohibitionを正確に要約する。

## Why the default is insufficient

default policyで検出できないfailure、実行cost、environment制約をevidence付きで書く。

## Options considered

| Option | Detection value | Coupling / drift risk | Runtime / maintenance | Decision |
|---|---|---|---|---|
| ADR-0001 default | | | | |
| Proposed exception | | | | |
| Alternative | | | | |

## Decision and scope

許可するdouble、assertion、fake、対象file、期間を限定する。scope外へ一般化しない。

## Compensating tests and controls

| Residual risk | Compensating test/control | CI lane | Owner |
|---|---|---|---|
| | | | |

## Interaction coupling / fake drift

- どのimplementation変更でtestが壊れ得るか:
- fakeとreal adapterのsemantic差:
- passしても保証されないこと:

## Exit criteria

- default policyへ戻すために必要なadapter/environment/design:
- tracking Issue:
- removal or renewal condition:

## Consequences

### Positive

-

### Negative

-

## Approval

- Reviewer:
- Decision date:
- Status after review: Proposed / Accepted / Rejected / Superseded
