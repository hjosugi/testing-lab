from unittest.mock import create_autospec

from checkout import CartItem, CheckoutService
from checkout.domain import OrderRepository, PaymentGateway


def test_checkout_messages_without_specifying_a_global_call_order():
    payments = create_autospec(PaymentGateway, instance=True)
    orders = create_autospec(OrderRepository, instance=True)
    payments.capture.return_value = "payment-42"
    service = CheckoutService(payments, orders)

    result = service.checkout(
        "order-1", [CartItem("book", 2, 600)], "token-1"
    )

    payments.capture.assert_called_once_with(1200, "token-1")
    orders.save.assert_called_once_with(result)


def test_empty_cart_calls_no_collaborator():
    payments = create_autospec(PaymentGateway, instance=True)
    orders = create_autospec(OrderRepository, instance=True)
    service = CheckoutService(payments, orders)

    try:
        service.checkout("order-1", [], "token-1")
    except ValueError:
        pass

    payments.capture.assert_not_called()
    orders.save.assert_not_called()
