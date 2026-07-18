from unittest.mock import Mock, call, create_autospec

import pytest

from checkout import CartItem, Order, PaymentError
from checkout.application import (
    CheckoutPort,
    CheckoutWorkflow,
    OrderConfirmationNotifier,
)


def test_workflow_checks_out_before_sending_the_confirmation():
    checkout = create_autospec(CheckoutPort, instance=True)
    notifications = create_autospec(
        OrderConfirmationNotifier,
        instance=True,
    )
    timeline = Mock()
    timeline.attach_mock(checkout, "checkout")
    timeline.attach_mock(notifications, "notifications")
    items = [CartItem("book", 2, 600)]
    order = Order(
        order_id="order-1",
        subtotal=1200,
        discount=0,
        total=1200,
        status="CONFIRMED",
        payment_id="payment-1",
    )
    checkout.checkout.return_value = order
    workflow = CheckoutWorkflow(checkout, notifications)

    result = workflow.checkout("order-1", items, "token-1")

    assert result == order
    assert timeline.mock_calls == [
        call.checkout.checkout("order-1", items, "token-1"),
        call.notifications.send_confirmation(order),
    ]


def test_workflow_does_not_notify_when_checkout_fails():
    checkout = create_autospec(CheckoutPort, instance=True)
    notifications = create_autospec(
        OrderConfirmationNotifier,
        instance=True,
    )
    checkout.checkout.side_effect = PaymentError("declined")
    workflow = CheckoutWorkflow(checkout, notifications)

    with pytest.raises(PaymentError, match="declined"):
        workflow.checkout(
            "order-1",
            [CartItem("book", 2, 600)],
            "bad-token",
        )

    notifications.send_confirmation.assert_not_called()
