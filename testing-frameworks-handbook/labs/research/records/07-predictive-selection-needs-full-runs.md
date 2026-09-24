# Predictive test selection needs a safety net

Result: **safety-net practice reproduced; paper-level savings not tested**

## Citation and status

- Title/DOI/URL: Machalica et al., "Predictive Test Selection", ICSE-SEIP 2019, https://doi.org/10.1109/ICSE-SEIP.2019.00018
- Peer-reviewed / preprint / industry report: peer-reviewed (industry track)
- Version/date: ICSE-SEIP 2019

## Claim

Learned selection can run far fewer tests while catching most failures, provided misses are measured and bounded by periodic full runs.

## Context and baseline

- Repository/module/commit: `labs/flakiness/fixture-project` + 40 synthetic commits with ground-truth failures
- Baseline: dependency-based (import graph) selection with full-run fallback
- Equal budget: same commits; full run every 5 commits for both

## Treatment

- Tool/version/config: `labs/flakiness/src/selection.mjs` (history-ranked top-1 as the predictive stand-in)
- Seeds/time budget/attempts: seed 77
- Human work included: none

## Outcomes

- Fault/mutant detection: dependency selection missed 0/13 failing commits (mean 2.5 of 4 tests); predictive top-1 missed 8/13 (mean 1.4 tests), max detection delay 4 commits
- Runtime/flake: n/a
- Review/maintenance cost: n/a
- Business-risk proxy: delayed detection of regressions

## Threats and differences

- Tiny project and a naive predictor: the paper's model uses many features and large history, so its miss rate is far lower. What reproduces is the *need* to measure misses and bound them with full runs, not the paper's numbers.

## Decision

- Adopt / limited pilot / reject / more evidence: **adopt dependency-based selection first**; predictive selection only with a published miss metric.
- Owner and review date: CI owners.
