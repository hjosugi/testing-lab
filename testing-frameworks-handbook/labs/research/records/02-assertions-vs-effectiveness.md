# Assertion count vs. effectiveness with suite size controlled

Result: **not reproduced (negative result: weak correlation in this setting)**

## Citation and status

- Title/DOI/URL: Zhang and Mesbah, "Assertions Are Strongly Correlated with Test Suite Effectiveness", ESEC/FSE 2015, https://doi.org/10.1145/2786805.2786858
- Peer-reviewed / preprint / industry report: peer-reviewed
- Version/date: ESEC/FSE 2015 conference paper

## Claim

The number of assertions correlates strongly with mutation score even when suite size is controlled.

## Context and baseline

- Repository/module/commit: same subject and suites as record 01
- Baseline: mutation score of fixed-size suites
- Equal budget: same 160 suites

## Treatment

- Tool/version/config: `coverageVersusMutation` (assertion counts come from the pool)
- Seeds/time budget/attempts: seed 2014
- Human work included: pool deliberately mixes value assertions and type-only assertions

## Outcomes

- Fault/mutant detection: mean tau(assertions, mutation score) at fixed size = 0.132 (size 3: -0.146, size 5: 0.315, size 8: 0.237, size 12: 0.12)
- Runtime/flake: none
- Review/maintenance cost: n/a
- Business-risk proxy: n/a

## Threats and differences

- Most tests here have exactly one assertion, so assertion count barely varies within a size; the paper studied suites with much wider variation.
- Six tests assert only `typeof fee === "number"`: assertion *count* ignores assertion *strength*, which this pool makes visible on purpose.
- Small sample; no significance test.

## Decision

- Adopt / limited pilot / reject / more evidence: **more evidence** before using assertion counts as a quality metric; review assertion strength instead (Issue #36 oracle audit).
- Owner and review date: testing-lab maintainers, revisit with a pool that varies assertions per test.
