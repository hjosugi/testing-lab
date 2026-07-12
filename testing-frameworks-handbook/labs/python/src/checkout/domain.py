from dataclasses import dataclass
from typing import Protocol


class PaymentError(RuntimeError):
    pass


@dataclass(frozen=True)
class CartItem:
    sku: str
    quantity: int
    unit_price: int

    def subtotal(self) -> int:
        if self.quantity <= 0 or self.unit_price < 0:
            raise ValueError("quantity must be positive and price non-negative")
        return self.quantity * self.unit_price


@dataclass(frozen=True)
class Order:
    order_id: str
    total: int
    status: str
    payment_id: str


class PaymentGateway(Protocol):
    def capture(self, amount: int, token: str) -> str: ...


class OrderRepository(Protocol):
    def save(self, order: Order) -> None: ...


class CheckoutService:
    def __init__(self, payments: PaymentGateway, orders: OrderRepository) -> None:
        self._payments = payments
        self._orders = orders

    def checkout(self, order_id: str, items: list[CartItem], token: str) -> Order:
        if not items:
            raise ValueError("cart must not be empty")
        total = sum(item.subtotal() for item in items)
        payment_id = self._payments.capture(total, token)
        order = Order(order_id, total, "CONFIRMED", payment_id)
        self._orders.save(order)
        return order

