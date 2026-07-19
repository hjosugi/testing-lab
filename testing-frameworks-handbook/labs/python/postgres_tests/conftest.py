import psycopg
import pytest

from postgres_tests.support import (
    SESSION_ID,
    PostgresService,
    build_postgres_container,
    container_volume_names,
    run_production_migrations,
    write_lines,
)


@pytest.fixture(scope="session")
def postgres_service() -> PostgresService:
    write_lines("TESTCONTAINERS_SESSION_FILE", (SESSION_ID,))

    with build_postgres_container("session") as container:
        wrapped = container.get_wrapped_container()
        volume_names = container_volume_names(container)
        write_lines("TESTCONTAINERS_VOLUME_FILE", volume_names)
        connection_url = container.get_connection_url(driver=None)
        run_production_migrations(connection_url, container)

        yield PostgresService(
            connection_url=connection_url,
            image=wrapped.attrs["Config"]["Image"],
            container=container,
        )


@pytest.fixture
def postgres_url(postgres_service: PostgresService) -> str:
    return postgres_service.connection_url


@pytest.fixture(autouse=True)
def clean_orders(postgres_url: str) -> None:
    with psycopg.connect(postgres_url, autocommit=True) as connection:
        connection.execute("TRUNCATE TABLE orders")
