from fakes import InMemoryOrderRepository
from test_support.order_repository_contract import OrderRepositoryContract


class TestInMemoryOrderRepository(OrderRepositoryContract):
    def make_repository(self):
        return InMemoryOrderRepository()
