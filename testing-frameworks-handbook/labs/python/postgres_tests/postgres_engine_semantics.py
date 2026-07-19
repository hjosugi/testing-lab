from datetime import timedelta

import psycopg
import pytest
from docker import errors as docker_errors
from docker import from_env
from psycopg.errors import CheckViolation, LockNotAvailable

from checkout import Order
from checkout_postgres import PostgresOrderRepository, apply_migrations
from postgres_tests.support import (
    IMAGE_PINS,
    PostgresService,
    build_postgres_container,
    container_volume_names,
)


def make_order(order_id: str, **changes: int | str) -> Order:
    values = {
        "order_id": order_id,
        "subtotal": 1200,
        "discount": 120,
        "total": 1080,
        "status": "CONFIRMED",
        "payment_id": f"payment-{order_id}",
    }
    values.update(changes)
    return Order(**values)


def test_pinned_container_passes_explicit_readiness(
    postgres_service: PostgresService,
):
    assert postgres_service.image == IMAGE_PINS.postgres_image
    assert IMAGE_PINS.postgres_image.startswith(
        f"postgres:{IMAGE_PINS.postgres_version}-bookworm@sha256:"
    )
    assert IMAGE_PINS.ryuk_image.startswith(
        f"testcontainers/ryuk:{IMAGE_PINS.ryuk_version}@sha256:"
    )
    readiness = postgres_service.container.exec(
        [
            "pg_isready",
            "--username",
            "testing_lab",
            "--dbname",
            "testing_lab",
            "--host",
            "127.0.0.1",
        ]
    )
    assert readiness.exit_code == 0

    with psycopg.connect(postgres_service.connection_url) as connection:
        version = connection.execute("SHOW server_version").fetchone()[0]
    assert version.split(maxsplit=1)[0] == IMAGE_PINS.postgres_version


def test_production_migration_is_recorded_and_idempotent(postgres_url):
    with psycopg.connect(postgres_url) as connection:
        rows = connection.execute(
            """
            SELECT version, checksum, applied_at
            FROM schema_migrations
            ORDER BY version
            """
        ).fetchall()

    assert len(rows) == 1
    assert rows[0][0] == "0001_create_orders.sql"
    assert len(rows[0][1]) == 64
    assert rows[0][2].utcoffset() == timedelta(0)
    assert apply_migrations(postgres_url) == ()


def test_failed_repository_transaction_rolls_back(postgres_url):
    repository = PostgresOrderRepository(postgres_url)
    inconsistent = make_order("rollback", total=999)

    with pytest.raises(CheckViolation) as raised:
        repository.save(inconsistent)

    assert raised.value.diag.constraint_name == "orders_total_matches"
    assert repository.find(inconsistent.order_id) is None


def test_row_lock_blocks_a_second_transaction_until_release(postgres_url):
    repository = PostgresOrderRepository(postgres_url)
    repository.save(make_order("locked"))

    with (
        psycopg.connect(postgres_url) as first,
        psycopg.connect(postgres_url) as second,
    ):
        with first.transaction():
            first.execute(
                "SELECT order_id FROM orders WHERE order_id = %s FOR UPDATE",
                ("locked",),
            )
            second.execute("SET lock_timeout = '150ms'")
            with pytest.raises(LockNotAvailable):
                second.execute(
                    """
                    SELECT order_id
                    FROM orders
                    WHERE order_id = %s
                    FOR UPDATE
                    """,
                    ("locked",),
                )
            second.rollback()

    with psycopg.connect(postgres_url) as after_release:
        assert after_release.execute(
            "SELECT order_id FROM orders WHERE order_id = %s FOR UPDATE",
            ("locked",),
        ).fetchone() == ("locked",)


def test_timestamptz_round_trip_uses_utc(postgres_url):
    repository = PostgresOrderRepository(postgres_url)
    repository.save(make_order("timezone"))

    with psycopg.connect(postgres_url) as connection:
        created_at, timezone = connection.execute(
            """
            SELECT created_at, current_setting('TIMEZONE')
            FROM orders
            WHERE order_id = %s
            """,
            ("timezone",),
        ).fetchone()

    assert timezone == "UTC"
    assert created_at.utcoffset() == timedelta(0)


def test_context_cleanup_removes_container_and_anonymous_volume():
    docker_client = from_env()
    try:
        container = build_postgres_container("cleanup-contract")

        with container:
            wrapped = container.get_wrapped_container()
            container_id = wrapped.id
            volume_names = container_volume_names(container)
            with psycopg.connect(
                container.get_connection_url(driver=None)
            ) as connection:
                assert connection.execute("SELECT 1").fetchone() == (1,)

        with pytest.raises(docker_errors.NotFound):
            docker_client.containers.get(container_id)
        for volume_name in volume_names:
            with pytest.raises(docker_errors.NotFound):
                docker_client.volumes.get(volume_name)
    finally:
        docker_client.close()
