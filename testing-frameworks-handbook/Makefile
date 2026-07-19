.PHONY: bootstrap bootstrap-locked check-locks test test-python test-python-parallel test-python-mutation test-python-postgres test-python-postgres-unavailable test-node test-node-semantics test-node-unawaited test-system-api test-system-http-stability test-advanced test-java test-java-agent-matrix test-dotnet test-dotnet-runner-matrix test-dotnet-failure-diagnostics test-cpp test-cpp-ctest test-cpp-benchmark test-cpp-compile-time test-cpp-sanitizers test-go test-go-race test-go-parallel test-go-fuzz test-go-generated test-go-benchmark test-go-failures test-rust test-rust-boundaries test-rust-quality test-rust-mutation test-php test-php-migration test-php-mutation test-php-equivalent issues-dry-run notebooklm

bootstrap:
	./scripts/bootstrap.sh

bootstrap-locked:
	nix develop --command env STRICT=1 ./scripts/bootstrap.sh

check-locks:
	./scripts/check-lockfiles.sh

test:
	./scripts/test-all.sh

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

test-system-http-stability:
	cd labs/system && npm run test:http-stability

test-advanced:
	cd labs/advanced && npm test

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
