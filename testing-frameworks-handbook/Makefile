.PHONY: bootstrap bootstrap-locked check-locks test verify-device-matrix test-generative test-python test-python-parallel test-python-mutation test-python-postgres test-python-postgres-unavailable test-node test-node-semantics test-node-unawaited test-system-api test-system-pact test-system-storybook test-system-e2e-stability test-system-http-stability test-advanced test-mutation-policy test-mutation-changed test-mutation-full test-performance test-performance-report test-performance-bench test-security test-security-sca test-security-sbom test-resilience test-ai-evals test-flakiness flake-dashboard test-acceptance test-production test-research test-oracles test-combinatorial test-concurrency test-cli test-java test-java-agent-matrix test-dotnet test-dotnet-runner-matrix test-dotnet-failure-diagnostics test-cpp test-cpp-ctest test-cpp-benchmark test-cpp-compile-time test-cpp-sanitizers test-go test-go-race test-go-parallel test-go-fuzz test-go-generated test-go-benchmark test-go-failures test-rust test-rust-boundaries test-rust-quality test-rust-mutation test-php test-php-migration test-php-mutation test-php-equivalent issues-dry-run notebooklm

bootstrap:
	./scripts/bootstrap.sh

bootstrap-locked:
	nix develop --command env STRICT=1 ./scripts/bootstrap.sh

check-locks:
	./scripts/check-lockfiles.sh

test:
	./scripts/test-all.sh

verify-device-matrix:
	node scripts/verify-device-matrix.mjs

test-generative:
	cd labs/advanced && npm test
	cd labs/go && ./scripts/run-fuzz.sh

test-python:
	cd labs/python && pytest --cov=checkout --cov-branch --cov-fail-under=100

test-python-parallel:
	cd labs/python && pytest -q -n 2

test-python-mutation:
	cd labs/python && python scripts/mutation_demo.py --require-all-killed

test-python-postgres:
	./labs/python/scripts/run-postgres-integration.sh

test-python-postgres-unavailable:
	./labs/python/scripts/verify-postgres-unavailable.sh

test-node:
	cd labs/node && npm test

test-node-semantics:
	cd labs/node && npm run test:semantics

test-node-unawaited:
	cd labs/node && npm run test:unawaited

test-system-api:
	cd labs/system && npm run test:api-schema

test-system-pact:
	cd labs/system && npm run test:pact

test-system-storybook:
	cd labs/system && npm run test:storybook

test-system-e2e-stability:
	cd labs/system && npm run test:e2e:stability

test-system-http-stability:
	cd labs/system && npm run test:http-stability

test-advanced:
	cd labs/advanced && npm test

test-mutation-policy:
	node --test 'labs/mutation/test/*.test.mjs'

test-mutation-changed:
	node labs/mutation/scripts/mutation-lanes.mjs plan --base origin/main --run

test-mutation-full:
	node labs/mutation/scripts/mutation-lanes.mjs plan --full --run

test-performance:
	cd labs/performance && node --test --test-concurrency=1 'test/*.test.mjs'

test-performance-report:
	node labs/performance/scripts/run-profiles.mjs --repeats 3

test-performance-bench:
	node labs/performance/bench/quote.bench.mjs

test-security:
	cd labs/security && node --test 'test/*.test.mjs'

test-security-sca:
	node labs/security/scripts/sca-triage.mjs

test-security-sbom:
	node labs/security/scripts/sbom.mjs

test-resilience:
	cd labs/resilience && node --test 'test/*.test.mjs'

test-ai-evals:
	cd labs/ai-evals && node --test 'test/*.test.mjs'

test-flakiness:
	cd labs/flakiness && node --test 'test/*.test.mjs'

flake-dashboard:
	node labs/flakiness/scripts/dashboard.mjs

test-acceptance:
	cd labs/acceptance && node --test 'test/*.test.mjs'

test-production:
	cd labs/production && node --test 'test/*.test.mjs'

test-research:
	cd labs/research && node --test 'test/*.test.mjs'

test-oracles:
	cd labs/oracles && node --test 'test/*.test.mjs'

test-combinatorial:
	cd labs/combinatorial && node --test 'test/*.test.mjs'

test-concurrency:
	cd labs/concurrency && node --test 'test/*.test.mjs'

test-cli:
	cd labs/cli && node --test 'test/*.test.mjs'

test-java:
	cd labs/java && gradle test --no-daemon

test-java-agent-matrix:
	./labs/java/scripts/verify-mockito-agent-matrix.sh

test-dotnet:
	cd labs/dotnet && dotnet test --project tests/NUnitTests/NUnitTests.csproj
	cd labs/dotnet && dotnet test --project tests/MSTestTests/MSTestTests.csproj

test-dotnet-runner-matrix:
	cd labs/dotnet && ./scripts/verify-runner-matrix.sh

test-dotnet-failure-diagnostics:
	cd labs/dotnet && ./scripts/verify-failure-diagnostics.sh

test-cpp:
	cmake --fresh -S labs/cpp -B labs/cpp/build -G Ninja -DCMAKE_CXX_COMPILER=clang++ && cmake --build labs/cpp/build && ctest --test-dir labs/cpp/build --output-on-failure --no-tests=error

test-cpp-ctest:
	cd labs/cpp && ./scripts/verify-ctest-orchestration.sh

test-cpp-benchmark:
	cd labs/cpp && ./scripts/measure-benchmark-noise.sh

test-cpp-compile-time:
	cd labs/cpp && ./scripts/compare-compile-time.sh

test-cpp-sanitizers:
	cd labs/cpp && ./scripts/run-sanitizer.sh address
	cd labs/cpp && ./scripts/run-sanitizer.sh undefined
	cd labs/cpp && ./scripts/run-sanitizer.sh thread

test-go:
	cd labs/go && go test -mod=readonly ./...

test-go-race:
	cd labs/go && go test -mod=readonly -race ./...

test-go-parallel:
	cd labs/go && ./scripts/verify-parallel-isolation.sh

test-go-fuzz:
	cd labs/go && ./scripts/run-fuzz.sh

test-go-generated:
	cd labs/go && ./scripts/verify-generated.sh

test-go-benchmark:
	cd labs/go && ./scripts/verify-benchmark.sh

test-go-failures:
	cd labs/go && ./scripts/verify-intentional-failures.sh

test-rust:
	cd labs/rust && cargo test --locked

test-rust-boundaries:
	cd labs/rust && ./scripts/verify-test-boundaries.sh

test-rust-quality:
	cd labs/rust && ./scripts/verify-quality.sh

test-rust-mutation:
	cd labs/rust && ./scripts/run-mutation.sh

test-php:
	cd labs/php && composer test

test-php-migration:
	cd labs/php && ./scripts/verify-phpunit-migration.sh

test-php-mutation:
	cd labs/php && ./scripts/run-mutation.sh

test-php-equivalent:
	cd labs/php && ./scripts/verify-equivalent-mutant.sh

issues-dry-run:
	./scripts/create-issues.sh --dry-run

notebooklm:
	./scripts/build-notebooklm.sh
