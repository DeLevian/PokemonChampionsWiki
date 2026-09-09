#!/usr/bin/env python3
"""Generate the compact frontend manifest for the latest data release."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ENTITY_TYPES = ("pokemon", "moves", "abilities", "items")
OPERATIONS = ("add", "update", "remove", "verify")


def build_release_label(release: dict[str, Any]) -> str:
    if release.get("label"):
        return release["label"].strip()
    title = release["title"].strip()
    prefix = "regolamento "
    if title.lower().startswith(prefix):
        return title[len(prefix):].strip()
    return release["id"].replace("regulation-", "").upper()


def build_manifest(package: dict[str, Any]) -> dict[str, Any]:
    release = package["release"]
    entities = {
        entity_type: [change["canonicalName"] for change in package["changes"][entity_type]]
        for entity_type in ENTITY_TYPES
    }
    operations = {
        entity_type: {
            operation: [
                change["canonicalName"]
                for change in package["changes"][entity_type]
                if change["operation"] == operation
            ]
            for operation in OPERATIONS
            if any(change["operation"] == operation for change in package["changes"][entity_type])
        }
        for entity_type in ENTITY_TYPES
    }
    return {
        "schemaVersion": 1,
        "id": release["id"],
        "title": release["title"],
        "label": build_release_label(release),
        "date": release["effectiveAt"] or release["researchCompletedAt"],
        "summary": release["summary"],
        "counts": {entity_type: len(names) for entity_type, names in entities.items()},
        "entities": entities,
        "operations": operations,
    }


def update_release_index(index: dict[str, Any], manifest: dict[str, Any]) -> dict[str, Any]:
    """Append or refresh one immutable release entry and mark it as current."""
    entry = {
        "id": manifest["id"],
        "title": manifest["title"],
        "label": manifest["label"],
        "date": manifest["date"],
        "summary": manifest["summary"],
        "manifest": f"{manifest['id']}.json",
        "counts": manifest["counts"],
    }
    releases = [
        current for current in index.get("releases", [])
        if current.get("id") != manifest["id"]
    ]
    releases.append(entry)
    return {
        "schemaVersion": 1,
        "current": manifest["id"],
        "releases": releases,
    }


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_manifest(package_path: Path, output_path: Path) -> None:
    package = json.loads(package_path.read_text(encoding="utf-8"))
    write_json(output_path, build_manifest(package))


def write_release_history(package_path: Path, releases_dir: Path) -> tuple[Path, Path, Path]:
    package = json.loads(package_path.read_text(encoding="utf-8"))
    manifest = build_manifest(package)
    index_path = releases_dir / "index.json"
    index = (
        json.loads(index_path.read_text(encoding="utf-8"))
        if index_path.is_file()
        else {"schemaVersion": 1, "current": None, "releases": []}
    )
    current_path = releases_dir / "current.json"
    archive_path = releases_dir / f"{manifest['id']}.json"
    if archive_path.is_file():
        archived = json.loads(archive_path.read_text(encoding="utf-8"))
        if archived != manifest:
            raise ValueError(
                f"La release {manifest['id']} è già archiviata con contenuto diverso"
            )
    write_json(current_path, manifest)
    write_json(archive_path, manifest)
    write_json(index_path, update_release_index(index, manifest))
    return current_path, archive_path, index_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    parser.add_argument(
        "--output", type=Path,
        help="Scrive un solo manifest nel percorso indicato; senza opzione aggiorna tutto lo storico",
    )
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    package = args.package if args.package.is_absolute() else root / args.package
    if args.output is not None:
        output = args.output if args.output.is_absolute() else root / args.output
        write_manifest(package, output)
        print(f"Creato: {output.relative_to(root)}")
    else:
        paths = write_release_history(package, root / "data/releases")
        for path in paths:
            print(f"Creato: {path.relative_to(root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
