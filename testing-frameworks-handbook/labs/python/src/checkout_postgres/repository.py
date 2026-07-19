import psycopg
from psycopg.errors import UniqueViolation

from checkout import DuplicateOrderError, Order


class PostgresOrderRepository:
    def __init__(self, connection_url: str) -> None:
        self._connection_url = connection_url

    def save(self, order: Order) -> None:
        try:
            with psycopg.connect(
                self._connection_url,
                connect_timeout=5,
            ) as connection:
                connection.execute(
                    """
                    INSERT INTO orders (
                        order_id,
                        subtotal,
                        discount,
                        total,
                        status,
                        payment_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        order.order_id,
                        order.subtotal,
                        order.discount,
                        order.total,
                        order.status,
                        order.payment_id,
                    ),
                )
        except UniqueViolation as error:
            raise DuplicateOrderError(
                f"order already exists: {order.order_id}"
            ) from error

    def find(self, order_id: str) -> Order | None:
        with psycopg.connect(
            self._connection_url,
            connect_timeout=5,
        ) as connection:
            row = connection.execute(
                """
                SELECT
                    order_id,
                    subtotal,
                    discount,
                    total,
                    status,
                    payment_id
                FROM orders
                WHERE order_id = %s
                """,
                (order_id,),
            ).fetchone()

        if row is None:
            return None
        return Order(
            order_id=row[0],
            subtotal=row[1],
            discount=row[2],
            total=row[3],
            status=row[4],
            payment_id=row[5],
        )
