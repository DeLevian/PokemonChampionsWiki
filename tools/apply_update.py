#!/usr/bin/env python3
"""Apply a normalized update package to the current database with rollback on failure."""

from __future__ import annotations

import argparse
import copy
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from generate_release_manifest import build_manifest
from validate_data import VALID_TYPES, validate

TARGET_FILES = {
    "roster": Path("data/database/current/pokemon/roster.json"),
    "stats": Path("data/database/current/pokemon/base-stats.json"),
    "learnsets": Path("data/database/current/learnsets/learnsets.json"),
    "moves": Path("data/database/current/moves/moves.json"),
    "abilities": Path("data/database/current/abilities/abilities.json"),
    "items": Path("data/database/current/items/items.json"),
    "version": Path("data/database/current/meta/version.json"),
    "locale_pokemon": Path("data/locales/it/pokemon.json"),
    "locale_moves": Path("data/locales/it/moves.json"),
    "locale_abilities": Path("data/locales/it/abilities.json"),
    "locale_items": Path("data/locales/it/items.json"),
    "release": Path("data/releases/current.json"),
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def encoded(value: Any, *, ensure_ascii: bool = False) -> bytes:
    return (json.dumps(value, ensure_ascii=ensure_ascii, indent=2) + "\n").encode("utf-8")


def replace_record(records: list[dict[str, Any]], record: dict[str, Any], operation: str, label: str) -> None:
    name = record["name"]
    index = next((i for i, current in enumerate(records) if current.get("name") == name), None)
    if operation == "add":
        if index is not None:
            raise ValueError(f"{label} {name}: operazione add ma il record esiste già")
        records.append(record)
    elif operation in {"update", "verify"}:
        if index is None:
            raise ValueError(f"{label} {name}: operazione {operation} ma il record non esiste")
        records[index] = record
    elif operation == "remove":
        if index is None:
            raise ValueError(f"{label} {name}: impossibile rimuovere un record inesistente")
        records.pop(index)
    else:
        raise ValueError(f"{label} {name}: operazione sconosciuta {operation!r}")


def apply_package(root: Path, package: dict[str, Any], sources: dict[str, Any]) -> dict[str, Any]:
    state = {name: load_json(root / path) for name, path in TARGET_FILES.items()}
    state = copy.deepcopy(state)
    changes = package["changes"]

    # Add abilities first so roster references can be validated in the final state.
    for change in changes["abilities"]:
        replace_record(state["abilities"], copy.deepcopy(change["data"]), change["operation"], "Abilità")
        localization = change.get("localization", {}).get("it")
        if localization:
            state["locale_abilities"][change["canonicalName"]] = copy.deepcopy(localization)

    for change in changes["moves"]:
        data = copy.deepcopy(change["data"])
        if change["operation"] == "remove" and data.get("name"):
            data["inChampions"] = False
            replace_record(state["moves"], data, "update", "Mossa")
        else:
            replace_record(state["moves"], data, change["operation"], "Mossa")
        localization = change.get("localization", {}).get("it")
        if localization:
            state["locale_moves"][change["canonicalName"]] = copy.deepcopy(localization)

    for change in changes["items"]:
        data = copy.deepcopy(change["data"])
        if change["operation"] == "remove" and data.get("name"):
            data["inChampions"] = False
            replace_record(state["items"], data, "update", "Strumento")
        else:
            replace_record(state["items"], data, change["operation"], "Strumento")
        localization = change.get("localization", {}).get("it")
        if localization:
            state["locale_items"][change["canonicalName"]] = copy.deepcopy(localization)

    for change in changes["pokemon"]:
        operation = change["operation"]
        name = change["canonicalName"]
        if operation == "remove":
            replace_record(state["roster"], {"name": name}, "remove", "Pokémon")
            replace_record(state["stats"], {"name": name}, "remove", "Statistiche")
            state["learnsets"].pop(name, None)
            continue
        replace_record(state["roster"], copy.deepcopy(change["roster"]), operation, "Pokémon")
        replace_record(state["stats"], copy.deepcopy(change["baseStats"]), operation, "Statistiche")
        learnset = change["learnset"]
        inherited_from = learnset.get("inheritFrom")
        move_names = learnset.get("moves", [])
        if inherited_from:
            source = state["learnsets"].get(inherited_from)
            if source is None:
                raise ValueError(f"{name}: learnset ereditato da Pokémon inesistente: {inherited_from}")
            move_names = [entry["name"] for entry in source.get("moves", [])]
        state["learnsets"][name] = {
            "dexNumber": change["roster"]["dexNumber"],
            "form": change["roster"]["form"],
            "championsVerified": bool(learnset.get("championsVerified")),
            "source": learnset.get("source", "update-package"),
            "moves": [{"name": move} for move in move_names],
            "moveCount": len(move_names),
        }
        localization = change.get("localization", {}).get("it")
        if localization:
            state["locale_pokemon"][name] = copy.deepcopy(localization)

    release = package["release"]
    verified_moves = sum(move.get("championsVerified") is True for move in state["moves"])
    in_champions = sum(move.get("inChampions") is True for move in state["moves"])
    verified_pokemon = sum(pokemon.get("championsVerified") is True for pokemon in state["roster"])
    verified_abilities = sum(ability.get("championsVerified") is True for ability in state["abilities"])
    verified_learnsets = sum(ls.get("championsVerified") is True for ls in state["learnsets"].values())
    state["release"] = build_manifest(package)
    state["version"] = {
        "version": release["id"],
        "lastUpdated": release["researchCompletedAt"],
        "gameVersion": release["gameVersion"],
        "regulation": release["title"],
        "dataFormat": "JSON",
        "sources": [
            {"id": source["id"], "title": source["title"], "url": source["url"]}
            for source in sources["sources"]
        ],
        "verification": {
            "description": "Dati correnti integrati tramite un pacchetto normalizzato, con fonti e report conservati nel repository.",
            "stats": {
                "pokemon_verified": verified_pokemon,
                "pokemon_total": len(state["roster"]),
                "abilities_verified": verified_abilities,
                "abilities_total": len(state["abilities"]),
                "moves_verified": verified_moves,
                "moves_in_champions": in_champions,
                "moves_total": len(state["moves"]),
                "learnsets_verified": verified_learnsets,
                "learnsets_total": len(state["learnsets"]),
            },
        },
        "counts": {
            "pokemon": len(state["roster"]),
            "movesInChampions": in_champions,
            "movesTotal": len(state["moves"]),
            "abilities": len(state["abilities"]),
            "items": len(state["items"]),
            "itemsInChampions": sum(item.get("inChampions") is True for item in state["items"]),
            "natures": 25,
            "types": len(VALID_TYPES),
        },
    }
    return state


def stage_and_replace(root: Path, state: dict[str, Any]) -> dict[Path, bytes]:
    backups = {path: (root / path).read_bytes() for path in TARGET_FILES.values()}
    stage_root = Path(tempfile.mkdtemp(prefix="champions-update-", dir=root))
    try:
        for name, relative in TARGET_FILES.items():
            staged = stage_root / relative
            staged.parent.mkdir(parents=True, exist_ok=True)
            # The upstream moves file historically stores Unicode arrows as escapes.
            staged.write_bytes(encoded(state[name], ensure_ascii=(name == "moves")))
        for relative in TARGET_FILES.values():
            destination = root / relative
            os.replace(stage_root / relative, destination)
    finally:
        shutil.rmtree(stage_root, ignore_errors=True)
    return backups


def restore(root: Path, backups: dict[Path, bytes]) -> None:
    for relative, content in backups.items():
        destination = root / relative
        temporary = destination.with_suffix(destination.suffix + ".rollback")
        temporary.write_bytes(content)
        os.replace(temporary, destination)


def summary(state: dict[str, Any]) -> str:
    counts = state["version"]["counts"]
    return (
        f"Pokémon={counts['pokemon']}, mosse disponibili={counts['movesInChampions']}, "
        f"abilità={counts['abilities']}, strumenti={counts['items']}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path, help="Percorso di update.json")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--approve-conflicts", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    package_path = args.package if args.package.is_absolute() else root / args.package
    package = load_json(package_path)
    sources_path = package_path.with_name("sources.json")
    sources = load_json(sources_path)
    required = package.get("review", {}).get("required", [])
    if required and not args.approve_conflicts:
        print(f"[ERRORE] Il pacchetto contiene {len(required)} conflitti da approvare.")
        print("Rieseguire con --approve-conflicts dopo la revisione di report.md.")
        return 2
    try:
        state = apply_package(root, package, sources)
    except (KeyError, ValueError, TypeError) as exc:
        print(f"[ERRORE] Patch non applicabile: {exc}")
        return 1
    if args.dry_run:
        print(f"Anteprima valida: {summary(state)}")
        return 0

    backups = stage_and_replace(root, state)
    validation, _ = validate(root)
    if validation.errors:
        restore(root, backups)
        print("[ERRORE] Validazione fallita; file originali ripristinati.")
        for error in validation.errors:
            print(f"- {error}")
        return 1

    application = {
        "package": package["release"]["id"],
        "appliedAtUtc": datetime.now(timezone.utc).isoformat(),
        "conflictsApproved": bool(required and args.approve_conflicts),
        "counts": state["version"]["counts"],
        "validation": {"errors": 0, "warnings": len(validation.warnings)},
    }
    (package_path.parent / "application.json").write_text(
        json.dumps(application, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    report_path = package_path.with_name("report.md")
    if report_path.is_file():
        report = report_path.read_text(encoding="utf-8")
        report = report.replace(
            "## Conflitti da approvare",
            "## Conflitti approvati dal manutentore"
        )
        report = report.replace(
            "- Applicazione al database corrente: `pending`",
            "- Applicazione al database corrente: `passed`"
        )
        report_path.write_text(report, encoding="utf-8")
    print(f"Aggiornamento applicato: {summary(state)}")
    print(f"Validazione: 0 errori, {len(validation.warnings)} warning")
    return 0


if __name__ == "__main__":
    sys.exit(main())
