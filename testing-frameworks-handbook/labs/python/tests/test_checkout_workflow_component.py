from checkout import CartItem, CheckoutService, CheckoutWorkflow
from fakes import (
    FakePaymentGateway,
    InMemoryOrderConfirmationNotifier,
    InMemoryOrderRepository,
)


def test_real_checkout_service_is_wired_to_the_confirmation_notifier():
    payments = FakePaymentGateway()
    orders = InMemoryOrderRepository()
    notifications = InMemoryOrderConfirmationNotifier()
    checkout = CheckoutService(payments, orders)
    workflow = CheckoutWorkflow(checkout, notifications)

    result = workflow.checkout(
        "order-component",
        [CartItem("book", 2, 600)],
        "token-component",
    )

    assert result.status == "CONFIRMED"
    assert payments.captured == [(1200, "token-component")]
    assert orders.find(result.order_id) == result
    assert notifications.confirmations == [result]
