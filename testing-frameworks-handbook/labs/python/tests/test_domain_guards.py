import pytest

from checkout import CartItem, CheckoutService, NoDiscount
from fakes import FakePaymentGateway, InMemoryOrderRepository


@pytest.mark.parametrize(
    "item",
    [
        CartItem("zero-quantity", 0, 100),
        CartItem("negative-price", 1, -1),
    ],
)
def test_cart_item_rejects_invalid_values(item):
    with pytest.raises(
        ValueError,
        match="quantity must be positive and price non-negative",
    ):
        item.subtotal()


def test_no_discount_rejects_negative_subtotal():
    with pytest.raises(ValueError, match="subtotal must be non-negative"):
        NoDiscount().discount_for(-1)


class OverDiscount:
    def discount_for(self, subtotal):
        return subtotal + 1


def test_checkout_rejects_discount_larger_than_subtotal():
    payments = FakePaymentGateway()
    orders = InMemoryOrderRepository()
    service = CheckoutService(payments, orders, OverDiscount())

    with pytest.raises(
        ValueError,
        match="discount must be between zero and subtotal",
    ):
        service.checkout(
            "over-discounted",
            [CartItem("book", 1, 600)],
            "token",
        )

    assert payments.captured == []
    assert orders.find("over-discounted") is None
