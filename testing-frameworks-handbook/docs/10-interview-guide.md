# Google面接向け説明

## 30秒版

I separate the test runner, test framework, assertion library, and mocking library. For unit-test design, I use Classical-style state tests for domain logic and London-style interaction tests for important orchestration protocols. I avoid mocking value objects and internal methods. I add real integration tests for databases, contract tests for service compatibility, and only a small number of critical E2E tests. I measure reliability with flake rate and mutation testing, not coverage alone.

## Classical vs London

Classical TDD usually tests a group of real in-memory objects and verifies the final state or returned value. It is resilient to internal refactoring, but a failure may be less local.

London TDD usually isolates one subject and replaces collaborators with test doubles. It verifies important interactions and supports outside-in design. It gives local failures, but too many interaction checks can couple tests to implementation details.

I do not choose one school for the whole codebase. I choose by boundary and risk.

## framework選定の2分版

First, I define the test layer and failure types. A unit-test runner, a browser E2E tool, and a mutation tool solve different problems, so I do not compare them only by popularity.

Then I run a small spike with the same cases: async success, dependency failure, parameterized tests, parallel isolation, and diagnostic output.

I evaluate execution semantics, failure messages, IDE and CI support, version policy, and team debugging cost. For a new Java project, I would start with JUnit 6. For Go or Rust, I would start with the standard toolchain. For Node.js, I would evaluate the built-in test runner before adding Mocha or AVA.

Finally, I design a test portfolio. Domain rules use state and property tests. External adapters use integration tests. Service compatibility uses contract tests. Critical user journeys use a small number of E2E tests.

## follow-up questions

### Why not mock every dependency?

Mocks improve isolation, but they can lock the current call sequence. I mock only important boundaries or protocols. For stable in-memory domain objects, I prefer real objects.

### Is 100% coverage good?

It can show that every line ran, but it cannot prove that assertions detect wrong behavior. I use coverage to find gaps and mutation testing to evaluate test strength.

### How do you handle flaky tests?

I classify the cause: time, concurrency, shared state, network, UI waiting, randomness, or environment. I make the dependency deterministic. Retry is temporary and must have an owner and an expiry date.

