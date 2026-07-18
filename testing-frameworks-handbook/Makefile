.PHONY: bootstrap bootstrap-locked check-locks test test-python test-python-parallel test-python-mutation test-node test-advanced test-java test-dotnet test-cpp test-go test-rust test-php issues-dry-run notebooklm

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

test-node:
	cd labs/node && npm test

test-advanced:
	cd labs/advanced && npm test

test-java:
	cd labs/java && gradle test --no-daemon

test-dotnet:
	cd labs/dotnet && dotnet test --project tests/NUnitTests/NUnitTests.csproj
	cd labs/dotnet && dotnet test --project tests/MSTestTests/MSTestTests.csproj

test-cpp:
	cmake --fresh -S labs/cpp -B labs/cpp/build -G Ninja -DCMAKE_CXX_COMPILER=clang++ && cmake --build labs/cpp/build && ctest --test-dir labs/cpp/build --output-on-failure

test-go:
	cd labs/go && go test -mod=readonly ./...

test-rust:
	cd labs/rust && cargo test --locked

test-php:
	cd labs/php && composer test

issues-dry-run:
	./scripts/create-issues.sh --dry-run

notebooklm:
	./scripts/build-notebooklm.sh
