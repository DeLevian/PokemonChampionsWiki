#!/usr/bin/env python3
"""Validate normalized update packages before they can modify the current database."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Any

from validate_data import VALID_CATEGORIES, VALID_FORMS, VALID_TARGETS, VALID_TYPES

OPERATIONS = {"add", "update", "remove", "verify"}
CONFIDENCE = {"verified", "probable", "uncertain"}
ENTITY_TYPES = ("pokemon", "moves", "abilities", "items")


class Result:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def load(path: Path, result: Result) -> Any:
    try:
        text = path.read_text(encoding="utf-8")
        if "\ufffd" in text:
            result.error(f"{path}: contiene caratteri Unicode sostitutivi")
        return json.loads(text)
    except FileNotFoundError:
        result.error(f"File assente: {path}")
    except UnicodeDecodeError as exc:
        result.error(f"File non UTF-8: {path} ({exc})")
    except json.JSONDecodeError as exc:
        result.error(f"JSON non valido: {path}:{exc.lineno}:{exc.colno} ({exc.msg})")
    return None


def require_fields(value: Any, fields: set[str], label: str, result: Result) -> bool:
    if not isinstance(value, dict):
        result.error(f"{label}: atteso oggetto")
        return False
    missing = fields - set(value)
    if missing:
        result.error(f"{label}: campi obbligatori assenti: {', '.join(sorted(missing))}")
        return False
    return True


def find_placeholders(value: Any, prefix: str = "") -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_prefix = f"{prefix}.{key}" if prefix else key
            found.extend(find_placeholders(child, child_prefix))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(find_placeholders(child, f"{prefix}[{index}]"))
    elif isinstance(value, str) and "TODO" in value.upper():
        found.append(prefix)
    return found


def valid_date(value: Any) -> bool:
    if value is None:
        return True
    if not isinstance(value, str):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def current_names(root: Path, relative: str) -> set[str]:
    data = json.loads((root / relative).read_text(encoding="utf-8"))
    return set(data) if isinstance(data, dict) else {x["name"] for x in data}


def validate_package(path: Path, root: Path) -> Result:
    result = Result()
    package = load(path, result)
    sources_data = load(path.with_name("sources.json"), result)
    if package is None or sources_data is None:
        return result

    placeholders = find_placeholders(package, "update") + find_placeholders(sources_data, "sources")
    if placeholders:
        result.error(
            "Valori placeholder TODO non sostituiti: " + ", ".join(placeholders)
        )

    if not require_fields(package, {"schemaVersion", "release", "sourceRefs", "changes", "review"}, "package", result):
        return result
    if package["schemaVersion"] != 1:
        result.error(f"schemaVersion non supportata: {package['schemaVersion']!r}")

    release = package["release"]
    release_fields = {"id", "title", "gameVersion", "announcedAt", "effectiveAt", "researchCompletedAt", "summary"}
    if require_fields(release, release_fields, "release", result):
        if not isinstance(release["id"], str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", release["id"]):
            result.error("release.id deve usare solo minuscole ASCII, numeri e trattini")
        for field in ("announcedAt", "effectiveAt", "researchCompletedAt"):
            if not valid_date(release[field]):
                result.error(f"release.{field}: data non valida, usare YYYY-MM-DD o null")
        for field in ("title", "gameVersion", "summary"):
            if not isinstance(release[field], str) or not release[field].strip():
                result.error(f"release.{field}: stringa obbligatoria")

    if not require_fields(sources_data, {"researchCompletedAt", "sources"}, "sources.json", result):
        return result
    sources = sources_data["sources"]
    if not isinstance(sources, list) or not sources:
        result.error("sources.json.sources deve essere una lista non vuota")
        return result
    source_ids = []
    for index, source in enumerate(sources):
        label = f"sources[{index}]"
        required = {"id", "title", "url", "type", "official", "accessedAt", "appliesTo", "notes"}
        if not require_fields(source, required, label, result):
            continue
        source_ids.append(source["id"])
        if not isinstance(source["url"], str) or not source["url"].startswith(("https://", "http://")):
            result.error(f"{label}.url non valido")
        if not valid_date(source["accessedAt"]):
            result.error(f"{label}.accessedAt non valido")
    duplicates = [value for value, count in Counter(source_ids).items() if count > 1]
    if duplicates:
        result.error(f"ID fonte duplicati: {', '.join(sorted(duplicates))}")
    source_id_set = set(source_ids)

    top_refs = package["sourceRefs"]
    if not isinstance(top_refs, list) or not top_refs:
        result.error("sourceRefs deve essere una lista non vuota")
    else:
        unknown = set(top_refs) - source_id_set
        if unknown:
            result.error(f"sourceRefs sconosciuti: {', '.join(sorted(unknown))}")

    changes = package["changes"]
    if not require_fields(changes, set(ENTITY_TYPES), "changes", result):
        return result

    all_changes: dict[str, dict[str, dict[str, Any]]] = {}
    for entity_type in ENTITY_TYPES:
        records = changes[entity_type]
        if not isinstance(records, list):
            result.error(f"changes.{entity_type}: attesa lista")
            continue
        names = [x.get("canonicalName") for x in records if isinstance(x, dict)]
        duplicate_names = [value for value, count in Counter(names).items() if value and count > 1]
        if duplicate_names:
            result.error(f"changes.{entity_type}: nomi duplicati: {', '.join(sorted(duplicate_names))}")
        all_changes[entity_type] = {x.get("canonicalName"): x for x in records if isinstance(x, dict)}
        for index, change in enumerate(records):
            label = f"changes.{entity_type}[{index}]"
            required = {"operation", "canonicalName", "sourceRefs", "confidence"}
            if not require_fields(change, required, label, result):
                continue
            if change["operation"] not in OPERATIONS:
                result.error(f"{label}.operation non valida: {change['operation']!r}")
            if not isinstance(change["canonicalName"], str) or not change["canonicalName"].strip():
                result.error(f"{label}.canonicalName non valido")
            if change["confidence"] not in CONFIDENCE:
                result.error(f"{label}.confidence non valida: {change['confidence']!r}")
            if change["confidence"] == "uncertain":
                result.error(f"{label}: un elemento uncertain non può essere applicato")
            unknown_refs = set(change["sourceRefs"]) - source_id_set
            if unknown_refs:
                result.error(f"{label}: fonti sconosciute: {', '.join(sorted(unknown_refs))}")

    current = {
        "pokemon": current_names(root, "data/database/current/pokemon/roster.json"),
        "moves": current_names(root, "data/database/current/moves/moves.json"),
        "abilities": current_names(root, "data/database/current/abilities/abilities.json"),
        "items": current_names(root, "data/database/current/items/items.json"),
    }
    applied = path.with_name("application.json").is_file()
    if not applied:
        for entity_type, records in all_changes.items():
            for name, change in records.items():
                if change["operation"] == "add" and name in current[entity_type]:
                    result.error(f"{entity_type} {name}: add richiesto ma esiste già")
                if change["operation"] in {"update", "verify", "remove"} and name not in current[entity_type]:
                    result.error(f"{entity_type} {name}: {change['operation']} richiesto ma non esiste")

    future_moves = current["moves"] | set(all_changes["moves"])
    future_abilities = current["abilities"] | set(all_changes["abilities"])
    for index, change in enumerate(changes["pokemon"]):
        label = f"changes.pokemon[{index}]"
        required = {"roster", "baseStats", "learnset", "localization", "assets"}
        if not require_fields(change, required | {"operation", "canonicalName", "sourceRefs", "confidence"}, label, result):
            continue
        if change["operation"] == "remove":
            continue
        roster = change["roster"]
        stats = change["baseStats"]
        learnset = change["learnset"]
        if require_fields(roster, {"name", "dexNumber", "types", "form", "abilities", "championsVerified"}, f"{label}.roster", result):
            if roster["name"] != change["canonicalName"]:
                result.error(f"{label}: roster.name non coincide con canonicalName")
            if roster["form"] not in VALID_FORMS:
                result.error(f"{label}: forma non valida: {roster['form']!r}")
            if not isinstance(roster["types"], list) or not roster["types"] or set(roster["types"]) - VALID_TYPES:
                result.error(f"{label}: tipi non validi: {roster['types']!r}")
            if set(roster["abilities"].values()) - future_abilities:
                result.error(f"{label}: abilità referenziate inesistenti")
        stat_fields = {"name", "dexNumber", "form", "hp", "atk", "def", "spa", "spd", "spe", "total", "championsVerified"}
        if require_fields(stats, stat_fields, f"{label}.baseStats", result):
            values = [stats[key] for key in ("hp", "atk", "def", "spa", "spd", "spe")]
            if not all(isinstance(value, int) and not isinstance(value, bool) and value > 0 for value in values):
                result.error(f"{label}: statistiche non valide")
            elif sum(values) != stats["total"]:
                result.error(f"{label}: total statistiche errato")
        if require_fields(learnset, {"inheritFrom", "moves", "source", "championsVerified"}, f"{label}.learnset", result):
            if set(learnset["moves"]) - future_moves:
                result.error(f"{label}: learnset contiene mosse inesistenti")
        artwork = change["assets"].get("artworkFile")
        if artwork and not (root / "data/sprites/pokemon/artwork" / artwork).is_file():
            result.error(f"{label}: artwork inesistente: {artwork}")

    for index, change in enumerate(changes["moves"]):
        if change.get("operation") == "remove":
            continue
        data = change.get("data")
        label = f"changes.moves[{index}].data"
        fields = {"name", "type", "category", "description", "target", "inChampions", "championsVerified", "power", "accuracy", "pp", "priority"}
        if require_fields(data, fields, label, result):
            if data["type"] not in VALID_TYPES or data["category"] not in VALID_CATEGORIES or data["target"] not in VALID_TARGETS:
                result.error(f"{label}: tipo, categoria o target non valido")
            if not isinstance(data["pp"], int) or isinstance(data["pp"], bool) or data["pp"] <= 0:
                result.error(f"{label}: PP non validi")

    for entity_type in ("abilities", "items"):
        for index, change in enumerate(changes[entity_type]):
            if change.get("operation") == "remove":
                continue
            data = change.get("data")
            if not require_fields(data, {"name", "description"}, f"changes.{entity_type}[{index}].data", result):
                continue
            if data["name"] != change["canonicalName"]:
                result.error(f"changes.{entity_type}[{index}]: data.name non coincide con canonicalName")

    review = package["review"]
    if require_fields(review, {"required", "warnings", "notes"}, "review", result):
        if review["required"] and not applied:
            result.warn(f"Il pacchetto contiene {len(review['required'])} conflitti che richiedono approvazione")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("packages", nargs="+", type=Path)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    failed = False
    for value in args.packages:
        path = value if value.is_absolute() else root / value
        result = validate_package(path, root)
        print(f"Pacchetto: {path.relative_to(root)}")
        for error in result.errors:
            print(f"[ERRORE] {error}")
        for warning in result.warnings:
            print(f"[WARNING] {warning}")
        print(f"Esito: {'VALIDO' if not result.errors else 'NON VALIDO'} ({len(result.errors)} errori, {len(result.warnings)} warning)")
        failed = failed or bool(result.errors)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
