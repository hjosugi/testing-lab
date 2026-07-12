.PHONY: bootstrap test test-python test-node test-advanced test-java test-dotnet test-cpp test-go test-rust test-php issues-dry-run notebooklm

bootstrap:
	./scripts/bootstrap.sh

test:
	./scripts/test-all.sh

test-python:
	cd labs/python && pytest

test-node:
	cd labs/node && npm test

test-advanced:
	cd labs/advanced && npm test

test-java:
	cd labs/java && gradle test

test-dotnet:
	cd labs/dotnet && dotnet test

test-cpp:
	cmake -S labs/cpp -B labs/cpp/build -G Ninja && cmake --build labs/cpp/build && ctest --test-dir labs/cpp/build --output-on-failure

test-go:
	cd labs/go && go test ./...

test-rust:
	cd labs/rust && cargo test

test-php:
	cd labs/php && composer test

issues-dry-run:
	./scripts/create-issues.sh --dry-run

notebooklm:
	./scripts/build-notebooklm.sh
