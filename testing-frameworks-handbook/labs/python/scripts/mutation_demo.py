#!/usr/bin/env python3
import argparse
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Mutation:
    name: str
    path: str
    original: str
    replacement: str


MUTATIONS = (
    Mutation(
        name="accept zero quantity",
        path="src/checkout/domain.py",
        original="self.quantity <= 0",
        replacement="self.quantity < 0",
    ),
    Mutation(
        name="make discount threshold exclusive",
        path="src/checkout/domain.py",
        original="subtotal < self.minimum_subtotal",
        replacement="subtotal <= self.minimum_subtotal",
    ),
    Mutation(
        name="reject a free cart under the default rule",
        path="src/checkout/domain.py",
        original=(
            "        if subtotal < 0:\n"
            '            raise ValueError("subtotal must be non-negative")\n'
            "        return 0\n"
        ),
        replacement=(
            "        if subtotal <= 0:\n"
            '            raise ValueError("subtotal must be non-negative")\n'
            "        return 0\n"
        ),
    ),
    Mutation(
        name="disable over-discount guard",
        path="src/checkout/domain.py",
        original="if not 0 <= discount <= subtotal:",
        replacement="if False:",
    ),
    Mutation(
        name="corrupt persisted payment id",
        path="src/checkout/domain.py",
        original="payment_id=payment_id,",
        replacement='payment_id="mutated-payment",',
    ),
    Mutation(
        name="allow empty checkout",
        path="src/checkout/domain.py",
        original="if not items:",
        replacement="if False:",
    ),
    Mutation(
        name="omit order confirmation",
        path="src/checkout/application.py",
        original="self._notifications.send_confirmation(order)",
        replacement="# mutation: notification omitted",
    ),
)


def copy_lab(source: Path, destination: Path) -> None:
    shutil.copytree(
        source,
        destination,
        ignore=shutil.ignore_patterns(
            ".coverage",
            ".hypothesis",
            ".pytest_cache",
            "__pycache__",
        ),
    )


def apply_mutation(lab: Path, mutation: Mutation) -> None:
    target = lab / mutation.path
    content = target.read_text(encoding="utf-8")
    occurrences = content.count(mutation.original)
    if occurrences != 1:
        raise RuntimeError(
            f"{mutation.name}: expected one target, found {occurrences}"
        )
    target.write_text(
        content.replace(mutation.original, mutation.replacement, 1),
        encoding="utf-8",
    )


def run_mutation(lab_root: Path, mutation: Mutation) -> tuple[str, str]:
    with tempfile.TemporaryDirectory(prefix="testing-handbook-mutant-") as temp:
        mutant_lab = Path(temp) / "python"
        copy_lab(lab_root, mutant_lab)
        apply_mutation(mutant_lab, mutation)
        result = subprocess.run(
            [sys.executable, "-m", "pytest", "-q"],
            cwd=mutant_lab,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
    status = "SURVIVED" if result.returncode == 0 else "KILLED"
    summary = result.stdout.strip().splitlines()[-1]
    return status, summary


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run the handbook's deterministic Python mutation sample."
    )
    parser.add_argument(
        "--require-all-killed",
        action="store_true",
        help="Return non-zero when at least one mutant survives.",
    )
    args = parser.parse_args()

    lab_root = Path(__file__).resolve().parents[1]
    killed = 0
    survivors: list[str] = []

    for mutation in MUTATIONS:
        status, summary = run_mutation(lab_root, mutation)
        print(f"{status:8} {mutation.name} ({summary})")
        if status == "KILLED":
            killed += 1
        else:
            survivors.append(mutation.name)

    total = len(MUTATIONS)
    print(f"mutation score: {killed}/{total} ({killed / total:.0%})")
    if survivors:
        print(f"survivors: {', '.join(survivors)}")

    if args.require_all_killed and survivors:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
