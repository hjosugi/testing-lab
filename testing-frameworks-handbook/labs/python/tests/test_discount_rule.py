import pytest

from checkout import NoDiscount, ThresholdPercentageDiscount


@pytest.mark.parametrize(
    ("subtotal", "expected_discount"),
    [
        (999, 0),
        (1000, 100),
        (1201, 120),
    ],
)
def test_threshold_percentage_discount(subtotal, expected_discount):
    rule = ThresholdPercentageDiscount(
        minimum_subtotal=1000,
        percentage=10,
    )

    assert rule.discount_for(subtotal) == expected_discount


@pytest.mark.parametrize(
    ("minimum_subtotal", "percentage"),
    [
        (-1, 10),
        (1000, -1),
        (1000, 101),
    ],
)
def test_discount_configuration_rejects_invalid_ranges(
    minimum_subtotal,
    percentage,
):
    with pytest.raises(ValueError):
        ThresholdPercentageDiscount(
            minimum_subtotal=minimum_subtotal,
            percentage=percentage,
        )


def test_discount_rejects_a_negative_subtotal():
    rule = ThresholdPercentageDiscount(
        minimum_subtotal=1000,
        percentage=10,
    )

    with pytest.raises(ValueError, match="subtotal must be non-negative"):
        rule.discount_for(-1)


def test_default_rule_accepts_a_free_cart():
    # mutmut spike survivor: `subtotal < 0` -> `subtotal <= 0` rejected
    # zero-priced carts under the default rule without failing any test.
    rule = NoDiscount()

    assert rule.discount_for(0) == 0
    with pytest.raises(ValueError, match="subtotal must be non-negative"):
        rule.discount_for(-1)
