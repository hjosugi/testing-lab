from abc import ABC, abstractmethod
from dataclasses import replace

import pytest

from checkout import DuplicateOrderError, Order
from checkout.domain import OrderRepository


class OrderRepositoryContract(ABC):
    @abstractmethod
    def make_repository(self) -> OrderRepository:
        """Return a clean repository for one contract test."""
        raise NotImplementedError

    @staticmethod
    def contract_order() -> Order:
        return Order(
            order_id="order-contract",
            subtotal=1200,
            discount=120,
            total=1080,
            status="CONFIRMED",
            payment_id="payment-contract",
        )

    def test_saved_order_can_be_found(self):
        repository = self.make_repository()
        order = self.contract_order()

        repository.save(order)

        assert repository.find(order.order_id) == order

    def test_unknown_order_is_absent(self):
        repository = self.make_repository()

        assert repository.find("missing") is None

    def test_duplicate_order_id_is_rejected_without_replacing_original(self):
        repository = self.make_repository()
        original = self.contract_order()
        duplicate = replace(original, payment_id="replacement-payment")
        repository.save(original)

        with pytest.raises(
            DuplicateOrderError,
            match="order already exists: order-contract",
        ):
            repository.save(duplicate)

        assert repository.find(original.order_id) == original
