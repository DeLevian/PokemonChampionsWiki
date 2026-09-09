#!/usr/bin/env python3
"""Generate the compact frontend manifest for the latest data release."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def build_manifest(package: dict[str, Any]) -> dict[str, Any]:
    release = package["release"]
    entities = {
        entity_type: [change["canonicalName"] for change in package["changes"][entity_type]]
        for entity_type in ("pokemon", "moves", "abilities", "items")
    }
    return {
        "schemaVersion": 1,
        "id": release["id"],
        "title": release["title"],
        "date": release["effectiveAt"] or release["researchCompletedAt"],
        "summary": release["summary"],
        "counts": {entity_type: len(names) for entity_type, names in entities.items()},
        "entities": entities,
    }


def write_manifest(package_path: Path, output_path: Path) -> None:
    package = json.loads(package_path.read_text(encoding="utf-8"))
    manifest = build_manifest(package)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/releases/current.json"))
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    package = args.package if args.package.is_absolute() else root / args.package
    output = args.output if args.output.is_absolute() else root / args.output
    write_manifest(package, output)
    print(f"Creato: {output.relative_to(root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
