from typing import Protocol

from .domain import CartItem, Order


class CheckoutPort(Protocol):
    def checkout(
        self,
        order_id: str,
        items: list[CartItem],
        token: str,
    ) -> Order: ...


class OrderConfirmationNotifier(Protocol):
    def send_confirmation(self, order: Order) -> None: ...


class CheckoutWorkflow:
    def __init__(
        self,
        checkout: CheckoutPort,
        notifications: OrderConfirmationNotifier,
    ) -> None:
        self._checkout = checkout
        self._notifications = notifications

    def checkout(
        self,
        order_id: str,
        items: list[CartItem],
        token: str,
    ) -> Order:
        order = self._checkout.checkout(order_id, items, token)
        self._notifications.send_confirmation(order)
        return order
