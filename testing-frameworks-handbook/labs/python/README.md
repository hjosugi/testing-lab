# Python: pytest

```bash
pytest -q
pytest -q tests/test_classical.py
pytest -q tests/test_discount_rule.py
pytest -q tests/test_repository_contract.py
pytest -q tests/test_london.py
pytest -q tests/test_london_workflow.py
pytest -q tests/test_checkout_workflow_component.py
pytest --cov=checkout --cov-branch
```

Classical testはreal domain objectsとin-memory fakeの最終状態を検証します。London testは`PaymentGateway`と`OrderRepository`への重要interactionをspyで検証します。

discount ruleのRed-Green-Refactor、sociable unitとintegrationの境界、repository contract、failure局所性は[CLASSICAL-TDD.md](CLASSICAL-TDD.md)で追跡できます。

notification collaboratorをoutside-inで発見する流れ、role/message、責務分割、call-order coupling、component wiringは[LONDON-TDD.md](LONDON-TDD.md)で追跡できます。
