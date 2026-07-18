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
    subtotal: int
    discount: int
    total: int
    status: str
    payment_id: str


class DiscountRule(Protocol):
    def discount_for(self, subtotal: int) -> int: ...


@dataclass(frozen=True)
class NoDiscount:
    def discount_for(self, subtotal: int) -> int:
        if subtotal < 0:
            raise ValueError("subtotal must be non-negative")
        return 0


@dataclass(frozen=True)
class ThresholdPercentageDiscount:
    minimum_subtotal: int
    percentage: int

    def __post_init__(self) -> None:
        if self.minimum_subtotal < 0:
            raise ValueError("minimum subtotal must be non-negative")
        if not 0 <= self.percentage <= 100:
            raise ValueError("percentage must be between 0 and 100")

    def discount_for(self, subtotal: int) -> int:
        if subtotal < 0:
            raise ValueError("subtotal must be non-negative")
        if subtotal < self.minimum_subtotal:
            return 0
        return subtotal * self.percentage // 100


@dataclass(frozen=True)
class _PriceBreakdown:
    subtotal: int
    discount: int
    total: int


class PaymentGateway(Protocol):
    def capture(self, amount: int, token: str) -> str: ...


class OrderRepository(Protocol):
    def save(self, order: Order) -> None: ...


class CheckoutService:
    def __init__(
        self,
        payments: PaymentGateway,
        orders: OrderRepository,
        discount_rule: DiscountRule | None = None,
    ) -> None:
        self._payments = payments
        self._orders = orders
        self._discount_rule = (
            discount_rule if discount_rule is not None else NoDiscount()
        )

    def checkout(self, order_id: str, items: list[CartItem], token: str) -> Order:
        if not items:
            raise ValueError("cart must not be empty")
        price = self._price(items)
        payment_id = self._payments.capture(price.total, token)
        order = Order(
            order_id=order_id,
            subtotal=price.subtotal,
            discount=price.discount,
            total=price.total,
            status="CONFIRMED",
            payment_id=payment_id,
        )
        self._orders.save(order)
        return order

    def _price(self, items: list[CartItem]) -> _PriceBreakdown:
        subtotal = sum(item.subtotal() for item in items)
        discount = self._discount_rule.discount_for(subtotal)
        if not 0 <= discount <= subtotal:
            raise ValueError("discount must be between zero and subtotal")
        return _PriceBreakdown(
            subtotal=subtotal,
            discount=discount,
            total=subtotal - discount,
        )
