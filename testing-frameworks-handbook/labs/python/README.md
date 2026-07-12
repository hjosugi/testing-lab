# Python: pytest

```bash
pytest -q
pytest -q tests/test_classical.py
pytest -q tests/test_london.py
pytest --cov=checkout --cov-branch
```

Classical testはreal domain objectsとin-memory fakeの最終状態を検証します。London testは`PaymentGateway`と`OrderRepository`への重要interactionをspyで検証します。

