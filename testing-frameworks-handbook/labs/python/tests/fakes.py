from checkout.domain import Order, PaymentError


class FakePaymentGateway:
    def __init__(self, should_fail: bool = False) -> None:
        self.should_fail = should_fail
        self.captured: list[tuple[int, str]] = []

    def capture(self, amount: int, token: str) -> str:
        if self.should_fail:
            raise PaymentError("declined")
        self.captured.append((amount, token))
        return f"pay-{len(self.captured)}"


class InMemoryOrderRepository:
    def __init__(self) -> None:
        self.orders: dict[str, Order] = {}

    def save(self, order: Order) -> None:
        self.orders[order.order_id] = order

    def find(self, order_id: str) -> Order | None:
        return self.orders.get(order_id)


class InMemoryOrderConfirmationNotifier:
    def __init__(self) -> None:
        self.confirmations: list[Order] = []

    def send_confirmation(self, order: Order) -> None:
        self.confirmations.append(order)
