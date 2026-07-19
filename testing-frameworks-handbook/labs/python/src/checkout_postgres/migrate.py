from hashlib import sha256
from importlib.resources import files
from os import environ
from typing import NamedTuple

import psycopg


class MigrationDriftError(RuntimeError):
    pass


class Migration(NamedTuple):
    version: str
    checksum: str
    sql: str


def _migrations() -> tuple[Migration, ...]:
    migration_root = files("checkout_postgres.migrations")
    discovered = []
    for resource in sorted(
        migration_root.iterdir(),
        key=lambda candidate: candidate.name,
    ):
        if resource.name.endswith(".sql"):
            sql = resource.read_text(encoding="utf-8")
            discovered.append(
                Migration(
                    version=resource.name,
                    checksum=sha256(sql.encode()).hexdigest(),
                    sql=sql,
                )
            )
    return tuple(discovered)


def apply_migrations(connection_url: str) -> tuple[str, ...]:
    applied = []
    with psycopg.connect(
        connection_url,
        autocommit=True,
        connect_timeout=5,
    ) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        for migration in _migrations():
            row = connection.execute(
                """
                SELECT checksum
                FROM schema_migrations
                WHERE version = %s
                """,
                (migration.version,),
            ).fetchone()
            if row is not None:
                if row[0] != migration.checksum:
                    raise MigrationDriftError(
                        f"migration checksum changed: {migration.version}"
                    )
                continue

            with connection.transaction():
                connection.execute(migration.sql)
                connection.execute(
                    """
                    INSERT INTO schema_migrations (version, checksum)
                    VALUES (%s, %s)
                    """,
                    (migration.version, migration.checksum),
                )
            applied.append(migration.version)

    return tuple(applied)


def main() -> int:
    connection_url = environ.get("DATABASE_URL")
    if not connection_url:
        raise SystemExit(
            "DATABASE_URL is required to apply Postgres migrations"
        )

    applied = apply_migrations(connection_url)
    if applied:
        print(f"applied Postgres migrations: {', '.join(applied)}")
    else:
        print("Postgres schema is already current")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
