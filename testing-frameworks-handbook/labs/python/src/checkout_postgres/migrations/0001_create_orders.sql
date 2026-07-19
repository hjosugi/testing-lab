CREATE TABLE orders (
    order_id TEXT PRIMARY KEY,
    subtotal BIGINT NOT NULL CONSTRAINT orders_subtotal_non_negative
        CHECK (subtotal >= 0),
    discount BIGINT NOT NULL CONSTRAINT orders_discount_in_range
        CHECK (discount >= 0 AND discount <= subtotal),
    total BIGINT NOT NULL CONSTRAINT orders_total_matches
        CHECK (total >= 0 AND total = subtotal - discount),
    status TEXT NOT NULL CONSTRAINT orders_status_confirmed
        CHECK (status = 'CONFIRMED'),
    payment_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
