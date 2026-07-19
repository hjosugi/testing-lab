from __future__ import annotations

import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

LAB_ROOT = Path(__file__).resolve().parents[1]
IMAGE_CONFIG = LAB_ROOT / "container-images.env"
ENABLED_VALUES = {"1", "true", "yes"}


@dataclass(frozen=True)
class ContainerImagePins:
    postgres_version: str
    postgres_image: str
    ryuk_version: str
    ryuk_image: str

    @classmethod
    def load(cls, path: Path) -> ContainerImagePins:
        values = {}
        for line in path.read_text(encoding="utf-8").splitlines():
            if line and not line.startswith("#"):
                key, separator, value = line.partition("=")
                if not separator or not key or not value:
                    raise ValueError(f"invalid container image config line: {line}")
                values[key] = value
        return cls(
            postgres_version=values["POSTGRES_VERSION"],
            postgres_image=values["POSTGRES_IMAGE"],
            ryuk_version=values["RYUK_VERSION"],
            ryuk_image=values["RYUK_CONTAINER_IMAGE"],
        )


IMAGE_PINS = ContainerImagePins.load(IMAGE_CONFIG)
os.environ["RYUK_CONTAINER_IMAGE"] = IMAGE_PINS.ryuk_image
os.environ["RYUK_RECONNECTION_TIMEOUT"] = "1s"

if os.environ.get("TESTCONTAINERS_RYUK_DISABLED", "").lower() in ENABLED_VALUES:
    raise RuntimeError(
        "Ryuk cleanup must remain enabled for the Postgres integration suite"
    )

# Testcontainers reads its configuration at import time, after the pinned
# cleanup image and timeout have been applied above.
from testcontainers.core.labels import SESSION_ID  # noqa: E402
from testcontainers.core.wait_strategies import ExecWaitStrategy  # noqa: E402
from testcontainers.postgres import PostgresContainer  # noqa: E402


@dataclass(frozen=True)
class PostgresService:
    connection_url: str
    image: str
    container: PostgresContainer


def build_postgres_container(label_suffix: str) -> PostgresContainer:
    run_id = os.environ.get(
        "TESTING_LAB_CONTAINER_RUN_ID",
        f"local-{uuid4()}",
    )
    container = PostgresContainer(
        image=IMAGE_PINS.postgres_image,
        username="testing_lab",
        password="testing_lab",
        dbname="testing_lab",
        driver=None,
    )
    container.with_env("TZ", "UTC")
    container.with_command(["postgres", "-c", "timezone=UTC"])
    container.with_kwargs(
        labels={
            "testing-lab.issue": "15",
            "testing-lab.run-id": run_id,
            "testing-lab.fixture": label_suffix,
        }
    )
    container.waiting_for(
        ExecWaitStrategy(
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
        .with_startup_timeout(45)
        .with_poll_interval(0.25)
    )
    return container


def container_volume_names(container: PostgresContainer) -> tuple[str, ...]:
    wrapped = container.get_wrapped_container()
    wrapped.reload()
    return tuple(
        mount["Name"]
        for mount in wrapped.attrs["Mounts"]
        if mount["Type"] == "volume"
    )


def run_production_migrations(
    connection_url: str,
    container: PostgresContainer,
) -> None:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = connection_url
    environment["PYTHONPATH"] = os.pathsep.join(
        filter(
            None,
            (str(LAB_ROOT / "src"), environment.get("PYTHONPATH")),
        )
    )
    migration = subprocess.run(
        [sys.executable, "-m", "checkout_postgres.migrate"],
        cwd=LAB_ROOT,
        env=environment,
        check=False,
        capture_output=True,
        text=True,
    )
    if migration.returncode == 0:
        return

    stdout, stderr = container.get_logs()
    raise RuntimeError(
        "production migration command failed\n"
        f"{migration.stdout}{migration.stderr}\n"
        f"container stdout:\n{stdout.decode()}\n"
        f"container stderr:\n{stderr.decode()}"
    )


def write_lines(path_variable: str, values: tuple[str, ...]) -> None:
    destination = os.environ.get(path_variable)
    if destination:
        Path(destination).write_text(
            "".join(f"{value}\n" for value in values),
            encoding="utf-8",
        )
