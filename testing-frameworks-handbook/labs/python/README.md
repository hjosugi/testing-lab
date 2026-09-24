# Python: pytest

## Fast suite

```bash
nix develop .#python --command make test-python
nix develop .#python --command make test-python-parallel
nix develop .#python --command make test-python-mutation
```

Classical testはreal domain objectsとin-memory fakeの最終状態を検証します。London testは`PaymentGateway`と`OrderRepository`への重要interactionをspyで検証します。

discount ruleのRed-Green-Refactor、sociable unitとintegrationの境界、repository contract、failure局所性は[CLASSICAL-TDD.md](CLASSICAL-TDD.md)で追跡できます。

notification collaboratorをoutside-inで発見する流れ、role/message、責務分割、call-order coupling、component wiringは[LONDON-TDD.md](LONDON-TDD.md)で追跡できます。

fixture scope、xdist parallel safety、Hypothesis、lookup-site patch、branch coverageとmutationの比較は[PYTEST-LAB.md](PYTEST-LAB.md)にあります。

## Real Postgres integration

Docker-compatible daemonをhostで起動したうえで、handbook rootから実行します。Python、pytest、Psycopg 3.3.4、Testcontainers 4.14.2、Docker CLIはすべてNix shellが供給します。

```bash
nix develop .#python --command make test-python-postgres
```

`container-images.env`はPostgres 18.4 bookwormとTestcontainers Ryuk 0.8.1をtagだけでなくSHA-256 digestまで固定します。runnerはimageをpullしてから次を検証します。

- `test_support/order_repository_contract.py`の同一suiteをin-memory fakeと`PostgresOrderRepository`へ実行
- productionと同じ`python -m checkout_postgres.migrate`経路でversioned migrationを適用
- duplicate unique constraint、失敗transactionのrollback、2 connection間のrow lock、`TIMESTAMPTZ`とUTC
- `pg_isready`による明示readiness
- session container、nested lifecycle fixture、anonymous volume、Ryukのcleanup

通常のfast suiteはDockerを起動しません。real Postgres suiteは専用Linux CI laneでrequiredにし、Docker daemonが使えない場合はskipではなくexit code 2で失敗します。その契約だけをcontainerなしで確認するcommandもあります。

```bash
nix develop .#python --command make test-python-postgres-unavailable
```

adapter、migration、container lifecycle support、共有contract、Postgres engine固有testを別moduleに分けています。domain coverageは`checkout`だけを対象にし、real infrastructureの保証は専用integration suiteのobservable behaviorで扱います。

## Passしても保証しないこと

- coverage 100%は全branchを実行したことだけを示し、assertionの強さは示しません（mutation laneと`labs/oracles`で補完）。
- in-memory fakeとPostgresのshared contractは記述したbehaviorだけを揃えます。contractにないSQL semanticsは`postgres_tests`だけが見ます。
- Hypothesisの探索はprofileのexample数の範囲です。
