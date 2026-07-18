from uuid import uuid4


def new_receipt_id() -> str:
    return f"receipt-{uuid4().hex}"
