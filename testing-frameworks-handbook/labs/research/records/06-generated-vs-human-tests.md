# Automatically generated tests vs. human specification tests

Result: **partially reproduced with a non-LLM stand-in (high mutation score, but blind to the real defect)**

## Citation and status

- Title/DOI/URL: Schäfer et al., "An Empirical Evaluation of Using Large Language Models for Automated Unit Test Generation", TSE 2024, https://doi.org/10.1109/TSE.2023.3334955; Ouédraogo et al., "Test Smells in LLM-Generated Unit Tests", 2024, https://arxiv.org/abs/2410.10628
- Peer-reviewed / preprint / industry report: Schäfer: peer-reviewed; Ouédraogo: preprint
- Version/date: TSE 2024; arXiv 2410.10628 (2024)

## Claim

Generated tests can reach high coverage/mutation scores, but their oracles often encode current behavior and carry smells, so scores alone overstate their value.

## Context and baseline

- Repository/module/commit: shipping subject with a seeded real defect (members get free shipping from 4000 instead of 5000)
- Baseline: 24 human specification tests
- Equal budget: 24 generated tests (same count)

## Treatment

- Tool/version/config: **no LLM** (no paid APIs); stand-in generator = random inputs + assert the output of the current (defective) code, i.e. a regression oracle like Randoop/EvoSuite or a naive LLM prompt "write tests for this function"
- Seeds/time budget/attempts: seed 2024
- Human work included: human pool written from the spec

## Outcomes

- Fault/mutant detection: mutation score generated 1 vs human 0.813; seeded real defect detected: generated false, human true
- Runtime/flake: none
- Review/maintenance cost: every generated test is a magic-number oracle (24/24); human pool has 6 type-only (weak) assertions
- Business-risk proxy: the member free-shipping threshold

## Threats and differences

- Not an LLM: the result speaks about regression oracles, which LLM-generated tests often resemble when asked to test existing code; it does not measure LLM output quality.
- Mutants are applied to the correct code while generated oracles come from the defective code, which is exactly the situation of generating tests for code that already has a bug.
- Small subject.

## Decision

- Adopt / limited pilot / reject / more evidence: **reject** mutation/coverage score as the acceptance gate for generated tests; require spec-derived oracles and human review (see `labs/mutation` and Issue #36).
- Owner and review date: testing-lab maintainers; repeat with a local model when one is available offline.
