# Coverage vs. mutation score with suite size controlled

Result: **partially reproduced (direction reproduced; fixed-size correlation is moderate, not weak)**

## Citation and status

- Title/DOI/URL: Inozemtseva and Holmes, "Coverage Is Not Strongly Correlated with Test Suite Effectiveness", ICSE 2014, https://doi.org/10.1145/2568225.2568271
- Peer-reviewed / preprint / industry report: peer-reviewed
- Version/date: ICSE 2014 conference paper

## Claim

Coverage correlates with suite effectiveness (mutation score) mostly because both grow with suite size; with size held fixed the correlation is low to moderate.

## Context and baseline

- Repository/module/commit: `labs/research/src/subject.mjs` (shipping fee, 10 branch probes)
- Baseline: raw Kendall tau over all suites
- Equal budget: 160 random suites (4 sizes x 40), same 24-test pool and 16 mutants for every suite

## Treatment

- Tool/version/config: `src/experiments.mjs#coverageVersusMutation`, branch-probe coverage, textual mutation operators (`src/mutants.mjs`)
- Seeds/time budget/attempts: seed 2014, deterministic
- Human work included: test pool and mutation operators written by hand

## Outcomes

- Fault/mutant detection: raw tau(coverage, mutation score) = 0.641; tau(size, mutation score) = 0.673
- With size fixed: mean tau = 0.344 (size 3: 0.248, size 5: 0.408, size 8: 0.366, size 12: 0.353)
- Runtime/flake: milliseconds, no flake (pure functions)
- Review/maintenance cost: n/a
- Business-risk proxy: mutants in fee rules

## Threats and differences

- One 30-line function, 24 tests, 16 hand-written mutants versus five large Java projects in the paper.
- Branch probes, not statement coverage; Kendall tau-b like the paper, but no significance test.
- Hand-picked mutation operators may favor boundary checks.
- External validity for this team: the direction (size drives much of the raw correlation) matches; the fixed-size value (~0.34) is higher than "weak", so treat coverage as a gap finder, not an effectiveness score.

## Decision

- Adopt / limited pilot / reject / more evidence: **adopt the practice** (never gate on coverage alone; use mutation on high-risk code, see `labs/mutation`).
- Owner and review date: testing-lab maintainers, re-run when the subject or operators change.
