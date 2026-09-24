# Generator distribution and shrinking in property-based testing

Result: **reproduced**

## Citation and status

- Title/DOI/URL: Claessen and Hughes, "QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs", ICFP 2000, https://doi.org/10.1145/351240.351266; Goldstein et al., "Property-Based Testing in Practice", ICSE 2024, https://doi.org/10.1145/3597503.3639581
- Peer-reviewed / preprint / industry report: peer-reviewed (both)
- Version/date: ICFP 2000; ICSE 2024

## Claim

With the same number of generated inputs, generators biased toward boundary values find boundary defects far more often than uniform generators, and shrinking turns a random counterexample into a minimal one that is easier to diagnose.

## Context and baseline

- Repository/module/commit: `src/experiments.mjs#generatorAndShrinker` (quantity cap off by one at exactly 100)
- Baseline: uniform generator over 1..1000
- Equal budget: 100 inputs per seed, 200 seeds for both generators

## Treatment

- Tool/version/config: hand-written uniform and boundary-biased (30% edge values) generators; bisection shrinker
- Seeds/time budget/attempts: seeds 1..200
- Human work included: choice of edge values

## Outcomes

- Fault/mutant detection: uniform 0.075 vs boundary-biased 0.995 of seeds found the defect
- Shrinking: first counterexample 62 shrank to 37 (the minimal failing input)
- Runtime/flake: deterministic
- Review/maintenance cost: a minimal counterexample is directly a regression test
- Business-risk proxy: billing cap

## Threats and differences

- The boundary list contains the defect value by construction; real generators must guess boundaries from types and specs.
- One defect shape; defects in the interior of the domain would favor uniform search.
- fast-check in `labs/advanced` shows the same effect with a production library (GENERATOR-REVIEW.md).

## Decision

- Adopt / limited pilot / reject / more evidence: **adopt** boundary-biased generators plus shrinking for billing inputs (already in `labs/advanced`).
- Owner and review date: testing-lab maintainers.
