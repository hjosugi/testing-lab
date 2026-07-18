from hypothesis import given, settings
from hypothesis import strategies as st

from checkout import CartItem, CheckoutService, ThresholdPercentageDiscount
from fakes import FakePaymentGateway, InMemoryOrderRepository


item_strategy = st.builds(
    CartItem,
    sku=st.text(
        alphabet=st.characters(
            whitelist_categories=("Ll", "Lu", "Nd"),
        ),
        min_size=1,
        max_size=12,
    ),
    quantity=st.integers(min_value=1, max_value=100),
    unit_price=st.integers(min_value=0, max_value=100_000),
)


@settings(max_examples=100, deadline=None)
@given(
    items=st.lists(item_strategy, min_size=1, max_size=12),
    minimum_subtotal=st.integers(min_value=0, max_value=1_000_000),
    percentage=st.integers(min_value=0, max_value=100),
)
def test_checkout_total_invariants(
    items,
    minimum_subtotal,
    percentage,
):
    payments = FakePaymentGateway()
    orders = InMemoryOrderRepository()
    discount = ThresholdPercentageDiscount(
        minimum_subtotal=minimum_subtotal,
        percentage=percentage,
    )
    service = CheckoutService(payments, orders, discount)

    result = service.checkout("property-order", items, "property-token")

    assert result.subtotal == sum(item.subtotal() for item in items)
    assert 0 <= result.discount <= result.subtotal
    assert result.total == result.subtotal - result.discount
    assert 0 <= result.total <= result.subtotal
    assert payments.captured == [(result.total, "property-token")]
    assert orders.find(result.order_id) == result
