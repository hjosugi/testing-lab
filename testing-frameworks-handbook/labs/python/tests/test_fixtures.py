from dataclasses import FrozenInstanceError

import pytest


@pytest.mark.parametrize("order_id", ["fixture-a", "fixture-b"])
def test_function_scoped_component_starts_clean(
    checkout_component,
    immutable_catalog,
    order_id,
):
    payments, orders, service = checkout_component

    assert payments.captured == []
    assert orders.find(order_id) is None

    result = service.checkout(order_id, [immutable_catalog[0]], "token")

    assert orders.find(order_id) == result


def test_module_scoped_policy_is_safe_to_share(ten_percent_discount):
    assert ten_percent_discount.discount_for(1200) == 120

    with pytest.raises(FrozenInstanceError):
        ten_percent_discount.percentage = 20


def test_session_scoped_catalog_is_immutable(immutable_catalog):
    assert tuple(item.sku for item in immutable_catalog) == ("book", "pen")


@pytest.mark.parametrize("case", range(4))
def test_parallel_cases_receive_unique_tmp_paths(tmp_path, worker_id, case):
    artifact = tmp_path / f"{worker_id}-{case}.txt"

    artifact.write_text(str(case), encoding="utf-8")

    assert artifact.read_text(encoding="utf-8") == str(case)
