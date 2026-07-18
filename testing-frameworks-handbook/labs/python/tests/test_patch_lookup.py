import uuid
from uuid import UUID

import checkout.receipt as receipt


FIXED_UUID = UUID("12345678-1234-5678-1234-567812345678")


def fake_uuid4():
    return FIXED_UUID


def test_patching_definition_site_misses_an_imported_lookup(monkeypatch):
    imported_lookup = receipt.uuid4

    monkeypatch.setattr(uuid, "uuid4", fake_uuid4)

    assert uuid.uuid4 is fake_uuid4
    assert receipt.uuid4 is imported_lookup


def test_patch_the_name_used_at_the_lookup_site(monkeypatch):
    monkeypatch.setattr(receipt, "uuid4", fake_uuid4)

    assert receipt.new_receipt_id() == f"receipt-{FIXED_UUID.hex}"
