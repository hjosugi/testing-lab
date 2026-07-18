from checkout import Order
from checkout.domain import OrderRepository


class OrderRepositoryContract:
    def make_repository(self) -> OrderRepository:
        raise NotImplementedError

    def test_saved_order_can_be_found(self):
        repository = self.make_repository()
        order = Order(
            order_id="order-contract",
            subtotal=1200,
            discount=120,
            total=1080,
            status="CONFIRMED",
            payment_id="payment-contract",
        )

        repository.save(order)

        assert repository.find(order.order_id) == order

    def test_unknown_order_is_absent(self):
        repository = self.make_repository()

        assert repository.find("missing") is None
