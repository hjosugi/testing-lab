import pytest

from checkout import CartItem, CheckoutService, ThresholdPercentageDiscount
from fakes import FakePaymentGateway, InMemoryOrderRepository


@pytest.fixture
def checkout_component():
    payments = FakePaymentGateway()
    orders = InMemoryOrderRepository()
    service = CheckoutService(payments, orders)
    return payments, orders, service


@pytest.fixture(scope="module")
def ten_percent_discount():
    return ThresholdPercentageDiscount(
        minimum_subtotal=1000,
        percentage=10,
    )


@pytest.fixture(scope="session")
def immutable_catalog():
    return (
        CartItem("book", 1, 600),
        CartItem("pen", 1, 100),
    )
