from fakes import InMemoryOrderRepository
from repository_contract import OrderRepositoryContract


class TestInMemoryOrderRepository(OrderRepositoryContract):
    def make_repository(self):
        return InMemoryOrderRepository()
