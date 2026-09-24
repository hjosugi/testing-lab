# Co-occurring flaky failures share systemic causes

Result: **method reproduced on synthetic data (prevalence not tested)**

## Citation and status

- Title/DOI/URL: Pei et al., "An Empirical Analysis of Co-Occurring Flaky Test Failures", ISSTA 2025, https://doi.org/10.1145/3756681.3756945
- Peer-reviewed / preprint / industry report: peer-reviewed
- Version/date: ISSTA 2025

## Claim

Flaky failures often co-occur in clusters with a shared root cause (infrastructure, shared fixtures), so fixing the cause beats fixing tests one by one.

## Context and baseline

- Repository/module/commit: `labs/flakiness` synthetic history (60 runs x 10 tests) with injected ground truth
- Baseline: per-test flake rates
- Equal budget: same history for all analyses

## Treatment

- Tool/version/config: Jaccard co-failure clustering + feature attribution (`labs/flakiness/src/analysis.mjs`)
- Seeds/time budget/attempts: history seed 2026
- Human work included: choice of features (host, worker, fixture, service, order)

## Outcomes

- Fault/mutant detection: all four injected causes recovered (3 payment tests -> host=runner-7; orders-list -> after=orders-cleanup; ui-timer intrinsic; checkout-total regression)
- Runtime/flake: first-attempt failure 13.7% vs retry-masked 97.3% pass
- Review/maintenance cost: one host fix resolves three tests
- Business-risk proxy: n/a

## Threats and differences

- Synthetic data can only show that the *method* recovers causes that exist; it cannot show how common such clusters are (the paper's empirical claim).
- Real attribution needs replay experiments, not only correlation.

## Decision

- Adopt / limited pilot / reject / more evidence: **limited pilot** on real attempt-level CI data.
- Owner and review date: CI owners.
