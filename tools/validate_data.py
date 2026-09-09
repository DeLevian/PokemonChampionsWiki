#!/usr/bin/env python3
"""Validate the static Pokémon Champions database without third-party packages."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

VALID_TYPES = {
    "Bug", "Dark", "Dragon", "Electric", "Fairy", "Fighting", "Fire",
    "Flying", "Ghost", "Grass", "Ground", "Ice", "Normal", "Poison",
    "Psychic", "Rock", "Steel", "Water",
}
VALID_FORMS = {"Base", "Mega", "Regional"}
VALID_CATEGORIES = {"Physical", "Special", "Status"}
VALID_TARGETS = {
    "adjacentAlly", "adjacentAllyOrSelf", "adjacentFoe", "all",
    "allAdjacent", "allAdjacentFoes", "allies", "allySide", "allyTeam",
    "any", "foeSide", "normal", "randomNormal", "scripted", "self",
}
DATA_FILES = {
    "roster": "data/database/current/pokemon/roster.json",
    "stats": "data/database/current/pokemon/base-stats.json",
    "learnsets": "data/database/current/learnsets/learnsets.json",
    "moves": "data/database/current/moves/moves.json",
    "abilities": "data/database/current/abilities/abilities.json",
    "items": "data/database/current/items/items.json",
    "natures": "data/database/current/natures/natures.json",
    "version": "data/database/current/meta/version.json",
    "species": "data/database/current/pokemon/species-data.json",
    "evolutions": "data/evolution_chains.json",
    "type_chart": "data/database/current/type-chart/effectiveness.json",
    "release": "data/releases/current.json",
    "release_index": "data/releases/index.json",
    "locale_pokemon": "data/locales/it/pokemon.json",
    "locale_moves": "data/locales/it/moves.json",
    "locale_abilities": "data/locales/it/abilities.json",
    "locale_items": "data/locales/it/items.json",
    "locale_natures": "data/locales/it/natures.json",
    "aliases": "data/mappings/entity-aliases.json",
}


class Validation:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def load_json(path: Path, result: Validation) -> Any:
    if not path.is_file():
        result.error(f"File obbligatorio assente: {path.as_posix()}")
        return None
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        result.error(f"File non UTF-8: {path.as_posix()} ({exc})")
        return None
    if "\ufffd" in text:
        result.error(f"Carattere Unicode sostitutivo presente: {path.as_posix()}")
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        result.error(f"JSON non valido: {path.as_posix()}:{exc.lineno}:{exc.colno} ({exc.msg})")
        return None


def expect_type(value: Any, kind: type, label: str, result: Validation) -> bool:
    if not isinstance(value, kind):
        result.error(f"{label}: atteso {kind.__name__}, trovato {type(value).__name__}")
        return False
    return True


def duplicate_values(records: list[dict[str, Any]], field: str) -> list[str]:
    values = [record.get(field) for record in records if record.get(field) is not None]
    return sorted(str(value) for value, count in Counter(values).items() if count > 1)


def validate(root: Path) -> tuple[Validation, dict[str, Any]]:
    result = Validation()
    data = {name: load_json(root / relative, result) for name, relative in DATA_FILES.items()}
    if result.errors:
        return result, data

    list_names = ("roster", "stats", "moves", "abilities", "items", "natures")
    dict_names = (
        "learnsets", "version", "species", "evolutions", "type_chart", "release", "release_index", "locale_pokemon",
        "locale_moves", "locale_abilities", "locale_items", "locale_natures", "aliases",
    )
    for name in list_names:
        expect_type(data[name], list, DATA_FILES[name], result)
    for name in dict_names:
        expect_type(data[name], dict, DATA_FILES[name], result)
    if result.errors:
        return result, data

    roster: list[dict[str, Any]] = data["roster"]
    stats: list[dict[str, Any]] = data["stats"]
    moves: list[dict[str, Any]] = data["moves"]
    abilities: list[dict[str, Any]] = data["abilities"]
    items: list[dict[str, Any]] = data["items"]
    learnsets: dict[str, Any] = data["learnsets"]

    for collection_name in ("roster", "stats", "moves", "abilities", "items", "natures"):
        for index, record in enumerate(data[collection_name]):
            if not isinstance(record, dict):
                result.error(f"{collection_name}[{index}]: il record deve essere un oggetto")
        duplicates = duplicate_values(data[collection_name], "name")
        if duplicates:
            result.error(f"{collection_name}: nomi duplicati: {', '.join(duplicates)}")

    roster_names = {record.get("name") for record in roster}
    stats_names = {record.get("name") for record in stats}
    learnset_names = set(learnsets)
    move_names = {record.get("name") for record in moves}
    ability_names = {record.get("name") for record in abilities}

    for label, missing in (
        ("Pokémon del roster senza statistiche", roster_names - stats_names),
        ("Statistiche senza Pokémon nel roster", stats_names - roster_names),
        ("Pokémon del roster senza learnset", roster_names - learnset_names),
        ("Learnset senza Pokémon nel roster", learnset_names - roster_names),
    ):
        if missing:
            result.error(f"{label}: {', '.join(sorted(str(x) for x in missing))}")

    for index, pokemon in enumerate(roster):
        prefix = f"roster[{index}]"
        name = pokemon.get("name")
        required = ("name", "dexNumber", "types", "form", "abilities", "championsVerified")
        for field in required:
            if field not in pokemon:
                result.error(f"{prefix}: campo obbligatorio assente: {field}")
        if not isinstance(name, str) or not name.strip():
            result.error(f"{prefix}: name non valido")
        if not isinstance(pokemon.get("dexNumber"), int) or pokemon.get("dexNumber", 0) <= 0:
            result.error(f"{prefix} {name}: dexNumber non valido")
        types = pokemon.get("types")
        if not isinstance(types, list) or not 1 <= len(types) <= 2:
            result.error(f"{prefix} {name}: types deve contenere uno o due tipi")
        else:
            invalid = set(types) - VALID_TYPES
            if invalid:
                result.error(f"{prefix} {name}: tipi non validi: {', '.join(sorted(invalid))}")
        if pokemon.get("form") not in VALID_FORMS:
            result.error(f"{prefix} {name}: forma non valida: {pokemon.get('form')!r}")
        pokemon_abilities = pokemon.get("abilities")
        if not isinstance(pokemon_abilities, dict) or not pokemon_abilities:
            result.error(f"{prefix} {name}: abilities deve essere un oggetto non vuoto")
        else:
            invalid_slots = set(pokemon_abilities) - {"0", "1", "H", "S"}
            if invalid_slots:
                result.error(f"{prefix} {name}: slot abilità non validi: {', '.join(invalid_slots)}")
            unknown = set(pokemon_abilities.values()) - ability_names
            if unknown:
                result.error(f"{prefix} {name}: abilità inesistenti: {', '.join(sorted(unknown))}")

    stats_by_name = {record.get("name"): record for record in stats}
    for name, record in stats_by_name.items():
        values: list[int] = []
        for field in ("hp", "atk", "def", "spa", "spd", "spe"):
            value = record.get(field)
            if not isinstance(value, int) or value <= 0:
                result.error(f"Statistiche di {name}: {field} non valido: {value!r}")
            else:
                values.append(value)
        if len(values) == 6 and record.get("total") != sum(values):
            result.error(
                f"Statistiche di {name}: total={record.get('total')}, somma calcolata={sum(values)}"
            )
        roster_record = next((p for p in roster if p.get("name") == name), None)
        if roster_record:
            for field in ("dexNumber", "form"):
                if record.get(field) != roster_record.get(field):
                    result.error(
                        f"Statistiche di {name}: {field} non coincide col roster "
                        f"({record.get(field)!r} != {roster_record.get(field)!r})"
                    )

    for name, learnset in learnsets.items():
        if not isinstance(learnset, dict):
            result.error(f"Learnset di {name}: atteso oggetto")
            continue
        entries = learnset.get("moves")
        if not isinstance(entries, list):
            result.error(f"Learnset di {name}: moves deve essere una lista")
            continue
        referenced: list[str] = []
        for index, entry in enumerate(entries):
            if not isinstance(entry, dict) or not isinstance(entry.get("name"), str):
                result.error(f"Learnset di {name}, mossa {index}: formato non valido")
            else:
                referenced.append(entry["name"])
        duplicates = [move for move, count in Counter(referenced).items() if count > 1]
        if duplicates:
            result.error(f"Learnset di {name}: mosse duplicate: {', '.join(sorted(duplicates))}")
        unknown = set(referenced) - move_names
        if unknown:
            result.error(f"Learnset di {name}: mosse inesistenti: {', '.join(sorted(unknown))}")
        if "moveCount" in learnset and learnset["moveCount"] != len(entries):
            result.error(
                f"Learnset di {name}: moveCount={learnset['moveCount']}, conteggio={len(entries)}"
            )

    for index, move in enumerate(moves):
        name = move.get("name", f"#{index}")
        required = (
            "name", "type", "category", "description", "target", "inChampions",
            "championsVerified", "power", "accuracy", "pp", "priority",
        )
        missing = [field for field in required if field not in move]
        if missing:
            result.error(f"Mossa {name}: campi assenti: {', '.join(missing)}")
            continue
        if move["type"] not in VALID_TYPES:
            result.error(f"Mossa {name}: tipo non valido: {move['type']!r}")
        if move["category"] not in VALID_CATEGORIES:
            result.error(f"Mossa {name}: categoria non valida: {move['category']!r}")
        if move["target"] not in VALID_TARGETS:
            result.error(f"Mossa {name}: target non valido: {move['target']!r}")
        for field in ("power", "accuracy"):
            value = move[field]
            if value is not None and (not isinstance(value, int) or value < 0):
                result.error(f"Mossa {name}: {field} non valido: {value!r}")
        if not isinstance(move["pp"], int) or move["pp"] <= 0:
            result.error(f"Mossa {name}: pp non validi: {move['pp']!r}")
        if not isinstance(move["priority"], int):
            result.error(f"Mossa {name}: priority non valida: {move['priority']!r}")

    for collection_name, collection in (("abilities", abilities), ("items", items)):
        for index, record in enumerate(collection):
            if not isinstance(record.get("name"), str) or not record["name"].strip():
                result.error(f"{collection_name}[{index}]: name non valido")
            has_description = isinstance(record.get("description"), str) and bool(record["description"].strip())
            localized_description = data["locale_items"].get(record.get("name"), {}).get("description", "")
            if collection_name == "abilities" and not has_description:
                result.warn(f"{collection_name}[{index}] {record.get('name')}: description assente")
            if collection_name == "items" and record.get("inChampions") is True and not (has_description or localized_description):
                result.warn(f"items[{index}] {record.get('name')}: descrizione assente in entrambe le lingue")
            if collection_name == "items" and not isinstance(record.get("inChampions"), bool):
                result.error(f"items[{index}] {record.get('name')}: inChampions deve essere booleano")

    type_chart = data["type_chart"].get("chart")
    if not isinstance(type_chart, dict):
        result.error("type-chart/effectiveness.json: chart deve essere un oggetto")
    else:
        for attack_type in VALID_TYPES:
            defenses = type_chart.get(attack_type)
            if not isinstance(defenses, dict):
                result.error(f"Type chart: riga assente per {attack_type}")
                continue
            missing_defenses = VALID_TYPES - set(defenses)
            if missing_defenses:
                result.error(
                    f"Type chart {attack_type}: tipi difensivi assenti: {', '.join(sorted(missing_defenses))}"
                )
            invalid_values = {
                defense: value for defense, value in defenses.items()
                if defense in VALID_TYPES and value not in {0, 0.5, 1, 2}
            }
            if invalid_values:
                result.error(f"Type chart {attack_type}: moltiplicatori non validi: {invalid_values}")

    release = data["release"]
    if release.get("schemaVersion") != 1:
        result.error("Release corrente: schemaVersion non supportata")
    if not isinstance(release.get("label"), str) or not release["label"].strip():
        result.error("Release corrente: label assente o non valida")
    if release.get("id") != data["version"].get("version"):
        result.error(
            f"Release corrente {release.get('id')!r} non coincide con version.json "
            f"({data['version'].get('version')!r})"
        )
    release_entities = release.get("entities", {})
    release_operations = release.get("operations", {})
    entity_sets = {
        "pokemon": roster_names,
        "moves": move_names,
        "abilities": ability_names,
        "items": {record.get("name") for record in items},
    }
    for entity_type, known_names in entity_sets.items():
        names = release_entities.get(entity_type)
        if not isinstance(names, list):
            result.error(f"Release corrente: entities.{entity_type} deve essere una lista")
            continue
        type_operations = release_operations.get(entity_type, {})
        if type_operations and not isinstance(type_operations, dict):
            result.error(f"Release corrente: operations.{entity_type} deve essere un oggetto")
            type_operations = {}
        operation_names = [
            name
            for operation, operation_entities in type_operations.items()
            if operation in {"add", "update", "remove", "verify"} and isinstance(operation_entities, list)
            for name in operation_entities
        ]
        if type_operations and (len(operation_names) != len(set(operation_names)) or set(operation_names) != set(names)):
            result.error(
                f"Release corrente: operations.{entity_type} non coincide con entities.{entity_type}"
            )
        removed_names = set(type_operations.get("remove", [])) if isinstance(type_operations, dict) else set()
        missing = set(names) - removed_names - known_names
        if missing:
            result.error(
                f"Release corrente: {entity_type} inesistenti: {', '.join(sorted(missing))}"
            )
        declared_count = release.get("counts", {}).get(entity_type)
        if declared_count != len(names):
            result.error(
                f"Release corrente: counts.{entity_type}={declared_count!r}, atteso {len(names)}"
            )

    release_index = data["release_index"]
    if release_index.get("schemaVersion") != 1:
        result.error("Indice release: schemaVersion non supportata")
    releases = release_index.get("releases")
    if not isinstance(releases, list):
        result.error("Indice release: releases deve essere una lista")
        releases = []
    release_ids = [entry.get("id") for entry in releases if isinstance(entry, dict)]
    if len(release_ids) != len(set(release_ids)):
        result.error("Indice release: ID duplicati")
    if release_index.get("current") != release.get("id"):
        result.error(
            f"Indice release: current={release_index.get('current')!r}, atteso {release.get('id')!r}"
        )
    for entry in releases:
        if not isinstance(entry, dict):
            result.error("Indice release: ogni voce deve essere un oggetto")
            continue
        release_id = entry.get("id")
        expected_file = f"{release_id}.json"
        if entry.get("manifest") != expected_file:
            result.error(
                f"Indice release {release_id}: manifest={entry.get('manifest')!r}, atteso {expected_file!r}"
            )
            continue
        archived = load_json(root / "data/releases" / expected_file, result)
        if not isinstance(archived, dict):
            continue
        if archived.get("id") != release_id:
            result.error(f"Archivio release {expected_file}: ID non coerente")
        if archived.get("counts") != entry.get("counts"):
            result.error(f"Archivio release {release_id}: conteggi diversi dall'indice")
        for field in ("title", "label", "date", "summary"):
            if archived.get(field) != entry.get(field):
                result.error(f"Archivio release {release_id}: campo {field} diverso dall'indice")
        archived_entities = archived.get("entities", {})
        for entity_type in entity_sets:
            names = archived_entities.get(entity_type)
            if not isinstance(names, list):
                result.error(f"Archivio release {release_id}: entities.{entity_type} non valido")
            elif archived.get("counts", {}).get(entity_type) != len(names):
                result.error(f"Archivio release {release_id}: conteggio {entity_type} non valido")
    current_entry = next(
        (entry for entry in releases if isinstance(entry, dict) and entry.get("id") == release.get("id")),
        None,
    )
    if current_entry is None:
        result.error("Indice release: la release corrente non è presente nello storico")
    else:
        archived_current = load_json(root / "data/releases" / current_entry["manifest"], result)
        if archived_current != release:
            result.error("La release corrente è diversa dalla copia archiviata")

    version = data["version"]
    counts = version.get("counts", {})
    expected_counts = {
        "pokemon": len(roster),
        "movesInChampions": sum(move.get("inChampions") is True for move in moves),
        "movesTotal": len(moves),
        "abilities": len(abilities),
        "items": len(items),
        "itemsInChampions": sum(item.get("inChampions") is True for item in items),
        "natures": len(data["natures"]),
        "types": len(VALID_TYPES),
    }
    for field, expected in expected_counts.items():
        if counts.get(field) != expected:
            result.error(f"version.counts.{field}={counts.get(field)!r}, atteso {expected}")

    locale_checks = (
        ("Pokémon", roster_names, data["locale_pokemon"]),
        ("abilità usate", {a for p in roster for a in p.get("abilities", {}).values()}, data["locale_abilities"]),
        (
            "mosse usate",
            {entry["name"] for ls in learnsets.values() for entry in ls.get("moves", []) if isinstance(entry, dict) and "name" in entry},
            data["locale_moves"],
        ),
    )
    for label, names, locale in locale_checks:
        missing = names - set(locale)
        if missing:
            result.warn(f"Traduzione italiana mancante per {len(missing)} {label}: {', '.join(sorted(missing))}")

    aliases = data["aliases"].get("pokemonArtwork", {})
    artwork_dir = root / "data/sprites/pokemon/artwork"
    missing_artwork = []
    bad_aliases = []
    for name in sorted(roster_names):
        filename = aliases.get(name, f"{name}.png")
        if not (artwork_dir / filename).is_file():
            missing_artwork.append(name)
    for name, filename in aliases.items():
        if not (artwork_dir / filename).is_file():
            bad_aliases.append(f"{name} -> {filename}")
    if missing_artwork:
        result.warn(f"Artwork Pokémon non risolto per {len(missing_artwork)} voci: {', '.join(missing_artwork)}")
    if bad_aliases:
        result.error(f"Alias artwork verso file inesistenti: {', '.join(bad_aliases)}")

    evolution_chains = data["evolutions"].get("chains", {})
    species_to_chain = data["evolutions"].get("species_to_chain", {})
    used_chain_ids = {
        str(species_to_chain.get(str(pokemon["dexNumber"])))
        for pokemon in roster
        if species_to_chain.get(str(pokemon["dexNumber"])) is not None
    }
    for chain_id, chain in evolution_chains.items():
        if str(chain_id) not in used_chain_ids:
            continue
        species_ids = [int(stage["species_id"]) for stage in chain]
        if len(species_ids) != len(set(species_ids)):
            result.error(f"Catena evolutiva {chain_id}: species_id duplicati")
        known_species = set(species_ids)
        for stage in chain:
            parent = stage.get("evolves_from")
            if parent is not None and int(parent) not in known_species:
                result.error(
                    f"Catena evolutiva {chain_id}: genitore {parent} di {stage['species_id']} assente"
                )
    for pokemon in roster:
        species_id = str(pokemon["dexNumber"])
        chain_id = species_to_chain.get(species_id)
        chain = evolution_chains.get(str(chain_id), []) if chain_id is not None else []
        if not any(str(stage.get("species_id")) == species_id for stage in chain):
            result.error(f"{pokemon['name']}: specie {species_id} assente dalle catene evolutive")

    stage_overrides = data["aliases"].get("evolutionStageOverrides", {})
    trigger_overrides = data["aliases"].get("evolutionTriggerOverrides", {})
    for pokemon_name, overrides in stage_overrides.items():
        pokemon = next((record for record in roster if record["name"] == pokemon_name), None)
        if pokemon is None:
            result.error(f"Override evolutivo per Pokémon inesistente: {pokemon_name}")
            continue
        chain_id = species_to_chain.get(str(pokemon["dexNumber"]))
        chain_species = {
            str(stage["species_id"])
            for stage in evolution_chains.get(str(chain_id), [])
        }
        unknown_stages = set(overrides) - chain_species
        if unknown_stages:
            result.error(
                f"Override evolutivo {pokemon_name}: stadi estranei alla catena: "
                f"{', '.join(sorted(unknown_stages))}"
            )
        for stage_id, override in overrides.items():
            artwork_file = override.get("artworkFile")
            if artwork_file and not (artwork_dir / artwork_file).is_file():
                result.error(
                    f"Override evolutivo {pokemon_name}/{stage_id}: artwork inesistente {artwork_file}"
                )
    unknown_trigger_pokemon = set(trigger_overrides) - roster_names
    if unknown_trigger_pokemon:
        result.error(
            "Override condizioni evolutive per Pokémon inesistenti: "
            + ", ".join(sorted(unknown_trigger_pokemon))
        )

    available_item_names = {record["name"] for record in items if record.get("inChampions") is True}
    item_locale_missing = available_item_names - set(data["locale_items"])
    if item_locale_missing:
        result.warn(
            f"Traduzione italiana mancante per {len(item_locale_missing)} strumenti disponibili: "
            f"{', '.join(sorted(item_locale_missing))}"
        )

    return result, data


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--json", action="store_true", help="Stampa l'esito come JSON")
    args = parser.parse_args()

    root = args.root.resolve()
    result, data = validate(root)
    summary = {
        "valid": not result.errors,
        "errors": result.errors,
        "warnings": result.warnings,
        "counts": {
            name: len(value)
            for name, value in data.items()
            if isinstance(value, (list, dict)) and name in {"roster", "stats", "learnsets", "moves", "abilities", "items"}
        },
    }
    if args.json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    else:
        print("Validazione database Pokémon Champions")
        print(f"Root: {root}")
        for error in result.errors:
            print(f"[ERRORE] {error}")
        for warning in result.warnings:
            print(f"[WARNING] {warning}")
        print(f"Esito: {'VALIDO' if not result.errors else 'NON VALIDO'} "
              f"({len(result.errors)} errori, {len(result.warnings)} warning)")
    return 0 if not result.errors else 1


if __name__ == "__main__":
    sys.exit(main())
