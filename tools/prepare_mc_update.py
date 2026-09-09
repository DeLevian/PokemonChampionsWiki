#!/usr/bin/env python3
"""Convert the supplied Regulation M-C TXT bundle into the standard update package."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

DEX_NUMBERS = {
    "Wigglytuff": 40, "Persian": 53, "Alolan Persian": 53, "Farfetch'd": 83,
    "Mr. Mime": 122, "Swalot": 317, "Mega Absol Z": 359, "Salamence": 373,
    "Mega Salamence": 373, "Mega Garchomp Z": 445, "Mega Lucario Z": 448,
    "Gogoat": 673, "Golisopod": 768, "Mega Golisopod": 768, "Rillaboom": 812,
    "Cinderace": 815, "Inteleon": 818, "Thievul": 828,
    "Toxtricity Amped": 849, "Toxtricity Low Key": 849, "Grapploct": 853,
    "Perrserker": 863, "Sirfetch'd": 865, "Pincurchin": 871,
    "Indeedee Male": 876, "Indeedee Female": 876, "Pawmot": 923,
    "Arboliva": 930, "Squawkabilly Green Plumage": 931,
    "Squawkabilly Blue Plumage": 931, "Squawkabilly White Plumage": 931,
    "Squawkabilly Yellow Plumage": 931, "Mabosstiff": 943, "Baxcalibur": 998,
    "Mega Baxcalibur": 998,
}

TYPE_IT_TO_EN = {
    "Normale": "Normal", "Fuoco": "Fire", "Acqua": "Water", "Elettro": "Electric",
    "Erba": "Grass", "Ghiaccio": "Ice", "Lotta": "Fighting", "Veleno": "Poison",
    "Terra": "Ground", "Volante": "Flying", "Psico": "Psychic",
    "Coleottero": "Bug", "Roccia": "Rock", "Spettro": "Ghost", "Drago": "Dragon",
    "Buio": "Dark", "Acciaio": "Steel", "Folletto": "Fairy",
}
CATEGORY_MAP = {"Fisica": "Physical", "Speciale": "Special", "Stato": "Status"}
FORM_OVERRIDES = {"Alolan Persian": "Regional"}
CANONICAL_OVERRIDES = {
    "Farfetch’d": "Farfetch'd", "Mr Mime": "Mr. Mime",
    "Sirfetch’d": "Sirfetch'd",
    "Toxtricity (Amped Form)": "Toxtricity Amped",
    "Toxtricity (Low Key Form)": "Toxtricity Low Key",
    "Indeedee (Male)": "Indeedee Male", "Indeedee (Female)": "Indeedee Female",
    "Squawkabilly (Green Plumage)": "Squawkabilly Green Plumage",
    "Squawkabilly (Blue Plumage)": "Squawkabilly Blue Plumage",
    "Squawkabilly (White Plumage)": "Squawkabilly White Plumage",
    "Squawkabilly (Yellow Plumage)": "Squawkabilly Yellow Plumage",
}
ABILITY_ENGLISH_DESCRIPTIONS = {
    "Aura Guard": "Halves damage taken from moves that make contact.",
    "Emergency Exit": "The Pokemon switches out when its HP falls to half or less after taking damage.",
    "Grass Pelt": "Boosts the Pokemon's Defense by 50% while Grassy Terrain is active.",
    "Grassy Surge": "Creates Grassy Terrain for 5 turns when the Pokemon enters battle.",
    "Guard Dog": "Prevents forced switching and raises Attack instead of having it lowered by Intimidate.",
    "Libero": "Before using a move, the Pokemon changes to that move's type. In Champions, this activates once per switch-in.",
    "Liquid Ooze": "Damages opponents that attempt to drain HP from this Pokemon instead of healing them.",
    "Psychic Surge": "Creates Psychic Terrain for 5 turns when the Pokemon enters battle.",
    "Punk Rock": "Boosts the power of sound-based moves by 30% and halves damage taken from sound-based moves.",
    "Rattled": "Raises Speed by 1 stage when hit by a Bug-, Dark-, or Ghost-type move or affected by Intimidate.",
    "Run Away": "In Champions, allows the Pokemon to ignore effects that would prevent it from switching out.",
    "Seed Sower": "Creates Grassy Terrain for 5 turns when the Pokemon takes damage from a move.",
    "Stakeout": "Doubles the power of moves used against a target that has just switched in.",
    "Steely Spirit": "Boosts the power of Steel-type moves used by the Pokemon and its allies by 50%.",
    "Thermal Exchange": "Raises Attack by 1 stage when hit by a Fire-type move and prevents burns.",
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def field(text: str, label: str) -> str:
    match = re.search(rf"^{re.escape(label)}:\s*(.+)$", text, re.MULTILINE)
    if not match:
        raise ValueError(f"Campo assente: {label}")
    return match.group(1).strip()


def section(text: str, heading: str, next_heading: str | None = None) -> str:
    start = text.find(f"{heading}\n")
    if start < 0:
        raise ValueError(f"Sezione assente: {heading}")
    start += len(heading) + 1
    if next_heading:
        end = text.find(f"\n\n{next_heading}", start)
    else:
        end = -1
    return text[start:] if end < 0 else text[start:end]


def description_section(text: str) -> str:
    value = section(text, "DESCRIZIONE")
    for marker in ("\n\nPOKÉMON M-C ASSOCIATI", "\n\nNota:"):
        if marker in value:
            value = value.split(marker, 1)[0]
    return " ".join(line.strip() for line in value.splitlines() if line.strip())


def canonical_name(name: str, aliases: dict[str, str]) -> str:
    return aliases.get(name, CANONICAL_OVERRIDES.get(name, name))


def parse_types(line: str) -> list[str]:
    result = re.findall(r"\(([^)]+)\)", line)
    if result:
        return result
    values = []
    for part in line.split("/"):
        key = part.strip()
        values.append(TYPE_IT_TO_EN.get(key, key))
    return values


def parse_ability_names(block: str) -> list[str]:
    names = []
    for line in block.splitlines():
        if not line.startswith("- ") or " / " not in line:
            continue
        english = line.split(" / ", 1)[1].split(" [", 1)[0].strip()
        names.append(english)
    return names


def ability_slots(names: list[str]) -> dict[str, str]:
    if len(names) == 1:
        return {"0": names[0]}
    if len(names) == 2:
        return {"0": names[0], "H": names[1]}
    if len(names) == 3:
        return {"0": names[0], "1": names[1], "H": names[2]}
    raise ValueError(f"Numero abilità non supportato: {len(names)}")


def parse_learnset(block: str) -> list[str]:
    names = []
    for line in block.splitlines():
        if line.startswith("- ") and " / " in line:
            names.append(line.split(" / ", 1)[1].strip())
    return names


def parse_number(value: str) -> int | None:
    value = value.strip().replace("%", "")
    if value in {"—", "Sempre / non applicabile", "non applicabile"}:
        return None
    return int(value)


def find_item_sprite(root: Path, english_name: str) -> str | None:
    slug = english_name.lower().replace(" ", "-").replace("'", "") + ".png"
    return slug if (root / "data/sprites/items" / slug).is_file() else None


def build_package(root: Path, package_dir: Path) -> dict[str, Any]:
    current = root / "data/database/current"
    roster = {x["name"]: x for x in read_json(current / "pokemon/roster.json")}
    stats = {x["name"]: x for x in read_json(current / "pokemon/base-stats.json")}
    learnsets = read_json(current / "learnsets/learnsets.json")
    moves = {x["name"]: x for x in read_json(current / "moves/moves.json")}
    abilities = {x["name"]: x for x in read_json(current / "abilities/abilities.json")}
    items = {x["name"]: x for x in read_json(current / "items/items.json")}
    alias_data = read_json(root / "data/mappings/entity-aliases.json")
    name_aliases = alias_data.get("pokemon", {})
    artwork_aliases = alias_data.get("pokemonArtwork", {})
    raw = package_dir / "raw"

    changes: dict[str, list[dict[str, Any]]] = {
        "pokemon": [], "moves": [], "abilities": [], "items": []
    }
    review: dict[str, list[Any]] = {
        "required": [],
        "warnings": [
            "I numeri Pokédex non erano presenti nei TXT e sono stati associati tramite la fonte di localizzazione PokéAPI.",
            "Le descrizioni inglesi delle nuove abilità sono traduzioni normalizzate dei testi italiani del pacchetto grezzo.",
        ],
        "notes": [],
    }

    for path in sorted((raw / "pokemon").glob("*.txt")):
        text = path.read_text(encoding="utf-8-sig")
        source_name = field(text, "Nome inglese")
        name = canonical_name(source_name, name_aliases)
        italian_name = field(text, "Nome italiano")
        dex_number = DEX_NUMBERS[name]
        form = FORM_OVERRIDES.get(name, "Mega" if name.startswith("Mega ") else "Base")
        type_line = section(text, "TIPO", "STATISTICHE BASE").strip()
        parsed_stats = {
            "hp": int(field(text, "PS / HP")),
            "atk": int(field(text, "Attacco / Attack")),
            "def": int(field(text, "Difesa / Defense")),
            "spa": int(field(text, "Attacco Speciale / Special Attack")),
            "spd": int(field(text, "Difesa Speciale / Special Defense")),
            "spe": int(field(text, "Velocità / Speed")),
        }
        total = int(field(text, "Totale / BST"))
        ability_names = parse_ability_names(
            section(text, "ABILITÀ / PASSIVE DISPONIBILI IN CHAMPIONS", "MOSSE DISPONIBILI IN POKÉMON CHAMPIONS")
        )
        move_names = parse_learnset(section(text, "MOSSE DISPONIBILI IN POKÉMON CHAMPIONS"))
        artwork_file = artwork_aliases.get(name, f"{name}.png")
        aliases = [source_name] if source_name != name else []
        operation = "update" if name in roster else "add"
        change = {
            "operation": operation,
            "canonicalName": name,
            "aliases": aliases,
            "roster": {
                "name": name, "dexNumber": dex_number, "types": parse_types(type_line),
                "form": form, "abilities": ability_slots(ability_names),
                "championsVerified": True,
            },
            "baseStats": {
                "name": name, "dexNumber": dex_number, "form": form, **parsed_stats,
                "total": total, "championsVerified": True,
            },
            "learnset": {
                "inheritFrom": None,
                "moves": move_names,
                "source": "showdown-champions-data",
                "championsVerified": True,
            },
            "localization": {"it": {"name": italian_name}},
            "assets": {"artworkFile": artwork_file},
            "sourceRefs": ["official-regulation-m-c", "pokemon-zone-regulation-m-c", "showdown-champions-data", "pokeapi-localizations"],
            "confidence": "verified",
            "notes": [],
        }
        if name in roster and (roster[name] != change["roster"] or stats.get(name) != change["baseStats"]):
            review["required"].append({
                "entityType": "pokemon", "entity": name, "field": "record",
                "currentValue": {"roster": roster[name], "baseStats": stats.get(name)},
                "recommendedValue": {"roster": change["roster"], "baseStats": change["baseStats"]},
                "reason": "Il pacchetto M-C differisce dal database corrente.",
            })
        changes["pokemon"].append(change)

    for path in sorted((raw / "moves").glob("*.txt")):
        text = path.read_text(encoding="utf-8-sig")
        name = field(text, "Nome inglese")
        italian_name = field(text, "Nome italiano")
        existing = moves.get(name)
        if existing is None:
            raise ValueError(f"La mossa {name} non esiste nel database generale")
        data = dict(existing)
        data.update({
            "name": name,
            "type": parse_types(field(text, "Tipo"))[0],
            "category": CATEGORY_MAP[field(text, "Categoria")],
            "inChampions": True,
            "championsVerified": True,
            "power": parse_number(field(text, "Potenza / Base Power")),
            "accuracy": parse_number(field(text, "Precisione / Accuracy")),
            "pp": int(field(text, "PP")),
            "priority": int(field(text, "Priorità")),
        })
        technical_conflicts = []
        for key in ("type", "category", "power", "accuracy", "pp", "priority"):
            if existing.get(key) != data.get(key):
                technical_conflicts.append({"field": key, "current": existing.get(key), "recommended": data.get(key)})
        if technical_conflicts:
            review["required"].append({
                "entityType": "move", "entity": name, "field": "technicalData",
                "values": technical_conflicts,
                "recommendedValue": "Usare i valori del pacchetto M-C",
                "reason": "Valori specifici di Champions differenti dal database generale.",
            })
        changes["moves"].append({
            "operation": "update",
            "canonicalName": name,
            "data": data,
            "localization": {"it": {"name": italian_name, "description": description_section(text)}},
            "metadata": {
                "contact": field(text, "Contatto") == "Sì",
                "sound": field(text, "Mossa sonora") == "Sì",
                "targetDescription": field(text, "Bersaglio"),
            },
            "sourceRefs": ["official-regulation-m-c", "pokemon-zone-regulation-m-c", "showdown-champions-data", "pokeapi-localizations"],
            "confidence": "verified",
            "notes": [],
        })

    for path in sorted((raw / "abilities").glob("*.txt")):
        text = path.read_text(encoding="utf-8-sig")
        name = field(text, "Nome inglese")
        italian_name = field(text, "Nome italiano")
        associated_block = section(text, "POKÉMON M-C ASSOCIATI")
        associated_block = associated_block.split("\n\nNota:", 1)[0]
        associated = [canonical_name(line[2:].strip(), name_aliases) for line in associated_block.splitlines() if line.startswith("- ")]
        operation = "update" if name in abilities else "add"
        changes["abilities"].append({
            "operation": operation,
            "canonicalName": name,
            "data": {
                "name": name,
                "description": ABILITY_ENGLISH_DESCRIPTIONS[name],
                "championsVerified": True,
            },
            "localization": {"it": {"name": italian_name, "description": description_section(text)}},
            "associatedPokemon": associated,
            "sourceRefs": ["official-regulation-m-c", "pokemon-zone-regulation-m-c", "showdown-champions-data", "pokeapi-localizations"],
            "confidence": "verified",
            "notes": ["Descrizione inglese normalizzata dal testo italiano fornito."],
        })

    for path in sorted((raw / "items").glob("*.txt")):
        text = path.read_text(encoding="utf-8-sig")
        name = field(text, "Nome inglese")
        italian_name = field(text, "Nome italiano")
        existing = items.get(name)
        if existing is None:
            raise ValueError(f"Lo strumento {name} non esiste nel database generale")
        description_it = description_section(text)
        english_description = existing.get("description", "").strip()
        if not english_description:
            english_description = description_it
            review["warnings"].append(
                f"{name}: descrizione inglese assente nel database; il candidato mantiene temporaneamente il testo italiano."
            )
        sprite_file = find_item_sprite(root, name)
        if sprite_file is None:
            review["warnings"].append(f"{name}: sprite specifico non trovato; sarà usato il fallback del frontend.")
        changes["items"].append({
            "operation": "update",
            "canonicalName": name,
            "data": {"name": name, "description": english_description, "inChampions": True},
            "localization": {"it": {"name": italian_name, "description": description_it}},
            "metadata": {
                "category": field(text, "Categoria"),
                "consumable": field(text, "Monouso/consumato") != "No",
            },
            "assets": {"spriteFile": sprite_file},
            "sourceRefs": ["official-regulation-m-c", "pokemon-zone-regulation-m-c", "pokeapi-localizations"],
            "confidence": "verified",
            "notes": [],
        })

    return {
        "schemaVersion": 1,
        "release": {
            "id": "regulation-m-c",
            "title": "Regolamento M-C",
            "gameVersion": "Pokemon Champions",
            "announcedAt": "2026-09-02",
            "effectiveAt": None,
            "researchCompletedAt": "2026-09-09",
            "summary": "35 Pokémon o forme, 15 mosse, 15 abilità e 18 strumenti del Regolamento M-C.",
        },
        "sourceRefs": ["official-regulation-m-c", "pokemon-zone-regulation-m-c", "showdown-champions-data", "pokeapi-localizations"],
        "changes": changes,
        "review": review,
    }


def make_report(package: dict[str, Any]) -> str:
    changes = package["changes"]
    pokemon_added = sum(x["operation"] == "add" for x in changes["pokemon"])
    pokemon_updated = sum(x["operation"] == "update" for x in changes["pokemon"])
    moves_enabled = sum(x["data"].get("inChampions") is True for x in changes["moves"])
    ability_added = sum(x["operation"] == "add" for x in changes["abilities"])
    lines = [
        "# Report aggiornamento Regolamento M-C", "", "## Riepilogo",
        f"- Pokémon aggiunti: {pokemon_added}",
        f"- Pokémon aggiornati: {pokemon_updated}",
        f"- Mosse candidate come disponibili: {moves_enabled}",
        f"- Abilità aggiunte: {ability_added}",
        f"- Strumenti aggiornati/resi disponibili: {len(changes['items'])}",
        "", "## Pokémon", "",
    ]
    lines.extend(f"- `{x['operation']}` — {x['canonicalName']}" for x in changes["pokemon"])
    lines.extend(["", "## Mosse", ""])
    lines.extend(f"- `{x['operation']}` — {x['canonicalName']}" for x in changes["moves"])
    lines.extend(["", "## Abilità", ""])
    lines.extend(f"- `{x['operation']}` — {x['canonicalName']}" for x in changes["abilities"])
    lines.extend(["", "## Strumenti", ""])
    lines.extend(f"- `{x['operation']}` — {x['canonicalName']}" for x in changes["items"])
    lines.extend(["", "## Conflitti da approvare", ""])
    required = package["review"]["required"]
    if required:
        for item in required:
            lines.append(f"- **{item['entityType']} / {item['entity']} / {item['field']}**: {item['reason']}")
            for value in item.get("values", []):
                lines.append(f"  - {value['field']}: `{value['current']}` → `{value['recommended']}`")
    else:
        lines.append("- Nessuno.")
    lines.extend(["", "## Warning", ""])
    lines.extend(f"- {warning}" for warning in package["review"]["warnings"])
    lines.extend(["", "## Esito validazione", "", "- Pacchetto generato: `passed`", "- Applicazione al database corrente: `pending`", ""])
    return "\n".join(lines)


def validate_package(package: dict[str, Any], root: Path) -> list[str]:
    errors: list[str] = []
    changes = package["changes"]
    ability_names = {x["canonicalName"] for x in changes["abilities"]}
    current_abilities = {x["name"] for x in read_json(root / "data/database/current/abilities/abilities.json")}
    move_names = {x["canonicalName"] for x in changes["moves"]}
    current_moves = {x["name"] for x in read_json(root / "data/database/current/moves/moves.json")}
    for pokemon in changes["pokemon"]:
        name = pokemon["canonicalName"]
        stats = pokemon["baseStats"]
        calculated = sum(stats[k] for k in ("hp", "atk", "def", "spa", "spd", "spe"))
        if calculated != stats["total"]:
            errors.append(f"{name}: totale statistiche {stats['total']} != {calculated}")
        unknown_abilities = set(pokemon["roster"]["abilities"].values()) - ability_names - current_abilities
        if unknown_abilities:
            errors.append(f"{name}: abilità sconosciute: {sorted(unknown_abilities)}")
        unknown_moves = set(pokemon["learnset"]["moves"]) - move_names - current_moves
        if unknown_moves:
            errors.append(f"{name}: mosse sconosciute: {sorted(unknown_moves)}")
        artwork = root / "data/sprites/pokemon/artwork" / pokemon["assets"]["artworkFile"]
        if not artwork.is_file():
            errors.append(f"{name}: artwork assente: {artwork.name}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--package", type=Path, default=Path("data/imports/regulation-m-c"))
    parser.add_argument("--force", action="store_true", help="Rigenera anche un pacchetto già applicato")
    args = parser.parse_args()
    root = args.root.resolve()
    package_dir = args.package if args.package.is_absolute() else root / args.package
    if (package_dir / "application.json").is_file() and not args.force:
        print("[ERRORE] Pacchetto già applicato: rigenerazione bloccata per preservare lo storico.")
        print("Usare --force soltanto se si intende ricostruire consapevolmente il pacchetto.")
        return 2
    try:
        package = build_package(root, package_dir)
        errors = validate_package(package, root)
        if errors:
            for error in errors:
                print(f"[ERRORE] {error}")
            return 1
        write_json(package_dir / "update.json", package)
        (package_dir / "report.md").write_text(make_report(package), encoding="utf-8")
    except (KeyError, ValueError, OSError, json.JSONDecodeError) as exc:
        print(f"[ERRORE] Impossibile preparare il pacchetto: {exc}")
        return 1
    print(f"Creato: {(package_dir / 'update.json').relative_to(root)}")
    print(f"Creato: {(package_dir / 'report.md').relative_to(root)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
