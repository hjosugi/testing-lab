# Python: pytest

```bash
pytest -q
pytest -q tests/test_classical.py
pytest -q tests/test_discount_rule.py
pytest -q tests/test_repository_contract.py
pytest -q tests/test_london.py
pytest --cov=checkout --cov-branch
```

Classical testはreal domain objectsとin-memory fakeの最終状態を検証します。London testは`PaymentGateway`と`OrderRepository`への重要interactionをspyで検証します。

discount ruleのRed-Green-Refactor、sociable unitとintegrationの境界、repository contract、failure局所性は[CLASSICAL-TDD.md](CLASSICAL-TDD.md)で追跡できます。
