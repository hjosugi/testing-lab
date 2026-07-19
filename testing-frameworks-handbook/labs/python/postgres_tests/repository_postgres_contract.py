import pytest

from checkout_postgres import PostgresOrderRepository
from test_support.order_repository_contract import OrderRepositoryContract


class TestPostgresOrderRepository(OrderRepositoryContract):
    @pytest.fixture(autouse=True)
    def _use_postgres(self, postgres_url):
        self._postgres_url = postgres_url

    def make_repository(self):
        return PostgresOrderRepository(self._postgres_url)
