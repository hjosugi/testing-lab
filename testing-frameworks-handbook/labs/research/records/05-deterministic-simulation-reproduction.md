# Deterministic simulation reproduces distributed failures from a seed

Result: **reproduced (at single-service scale)**

## Citation and status

- Title/DOI/URL: Zhou et al., "FoundationDB: A Distributed Unbundled Transactional Key Value Store", SIGMOD 2021, https://doi.org/10.1145/3542700.3542707; Feng et al., "RediI", ICSE 2025, https://doi.org/10.1109/ICSE55347.2025.00244
- Peer-reviewed / preprint / industry report: peer-reviewed (both)
- Version/date: SIGMOD 2021; ICSE 2025

## Claim

When time, scheduling, randomness, network, and disk go through controlled seams, any failing run can be replayed exactly from its seed.

## Context and baseline

- Repository/module/commit: `labs/resilience` payment client with retry/breaker/idempotency
- Baseline: real HTTP chaos (not replayable)
- Equal budget: 50 seeds per scenario

## Treatment

- Tool/version/config: `labs/resilience/src/sim.mjs`
- Seeds/time budget/attempts: seeds 1..50
- Human work included: fault plan (drop/duplicate/delay rates)

## Outcomes

- Fault/mutant detection: removing the idempotency key is found by seed search (double charge) and the failing seed replays the identical trace hash
- Runtime/flake: virtual time; a 60 s outage runs in milliseconds
- Review/maintenance cost: failure report = seed + fault plan
- Business-risk proxy: double charge

## Threats and differences

- A single-process simulation; the semantic gap to TCP (resets, half-open connections) is documented in `labs/resilience/README.md`.
- FoundationDB simulates a whole cluster; this lab simulates one client/provider pair.

## Decision

- Adopt / limited pilot / reject / more evidence: **adopt** seams + seeded simulation for retry/idempotency logic.
- Owner and review date: payments team.
