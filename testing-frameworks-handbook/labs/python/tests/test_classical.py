import pytest

from checkout import CartItem, CheckoutService, PaymentError
from fakes import FakePaymentGateway, InMemoryOrderRepository


@pytest.mark.parametrize(
    ("items", "expected"),
    [
        ([CartItem("book", 2, 600)], 1200),
        ([CartItem("a", 1, 100), CartItem("b", 3, 50)], 250),
    ],
)
def test_checkout_confirms_and_persists_the_order(items, expected):
    payments = FakePaymentGateway()
    orders = InMemoryOrderRepository()
    service = CheckoutService(payments, orders)

    result = service.checkout("order-1", items, "token-1")

    assert result.status == "CONFIRMED"
    assert result.total == expected
    assert orders.orders["order-1"] == result
    assert payments.captured == [(expected, "token-1")]


def test_declined_payment_does_not_persist_an_order():
    orders = InMemoryOrderRepository()
    service = CheckoutService(FakePaymentGateway(should_fail=True), orders)

    with pytest.raises(PaymentError, match="declined"):
        service.checkout("order-1", [CartItem("book", 1, 1200)], "bad-token")

    assert orders.orders == {}

