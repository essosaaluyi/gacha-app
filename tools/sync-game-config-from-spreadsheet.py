import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "game-config" / "game-config.xlsx"
OUTPUT = ROOT / "lib" / "game-config" / "generated.ts"

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def col_to_index(cell_ref: str) -> int:
    letters = re.match(r"([A-Z]+)", cell_ref).group(1)
    index = 0
    for char in letters:
        index = index * 26 + ord(char) - ord("A") + 1
    return index - 1


def read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []

    strings: list[str] = []
    for item in root.findall("main:si", NS):
        parts = [node.text or "" for node in item.findall(".//main:t", NS)]
        strings.append("".join(parts))
    return strings


def cell_value(cell: ET.Element, shared_strings: list[str]):
    cell_type = cell.attrib.get("t")
    value = cell.find("main:v", NS)

    if cell_type == "inlineStr":
        text = cell.find(".//main:t", NS)
        return text.text if text is not None else ""

    if value is None:
        return ""

    raw = value.text or ""
    if cell_type == "s":
        return shared_strings[int(raw)]
    if cell_type == "b":
        return raw == "1"
    if raw == "":
        return ""

    try:
        number = float(raw)
        return int(number) if number.is_integer() else number
    except ValueError:
        return raw


def sheet_matrix(zf: zipfile.ZipFile, sheet_path: str, shared_strings: list[str]) -> list[list[object]]:
    root = ET.fromstring(zf.read(sheet_path))
    rows: list[list[object]] = []

    for row in root.findall(".//main:sheetData/main:row", NS):
        row_index = int(row.attrib["r"]) - 1
        while len(rows) <= row_index:
            rows.append([])

        values = rows[row_index]
        for cell in row.findall("main:c", NS):
            index = col_to_index(cell.attrib["r"])
            while len(values) <= index:
                values.append("")
            values[index] = cell_value(cell, shared_strings)

    return rows


def load_workbook(path: Path) -> dict[str, list[list[object]]]:
    with zipfile.ZipFile(path) as zf:
        shared_strings = read_shared_strings(zf)
        workbook = ET.fromstring(zf.read("xl/workbook.xml"))
        rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        rel_targets = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rels.findall("pkgrel:Relationship", NS)
        }

        sheets: dict[str, list[list[object]]] = {}
        for sheet in workbook.findall("main:sheets/main:sheet", NS):
            name = sheet.attrib["name"]
            rel_id = sheet.attrib[f"{{{NS['rel']}}}id"]
            target = rel_targets[rel_id]
            normalized_target = target.replace("\\", "/").lstrip("/")
            sheet_path = (
                normalized_target
                if normalized_target.startswith("xl/")
                else "xl/" + normalized_target
            )
            sheets[name] = sheet_matrix(zf, sheet_path, shared_strings)
        return sheets


def table_rows(sheet: list[list[object]], required_headers: list[str]) -> list[dict[str, object]]:
    header_row_index = -1
    headers: list[str] = []

    for idx, row in enumerate(sheet):
        normalized = [str(value).strip() for value in row]
        if all(header in normalized for header in required_headers):
            header_row_index = idx
            headers = normalized
            break

    if header_row_index < 0:
        raise ValueError(f"Missing table headers: {required_headers}")

    rows: list[dict[str, object]] = []
    for raw_row in sheet[header_row_index + 1 :]:
        padded = raw_row + [""] * max(0, len(headers) - len(raw_row))
        record = {headers[index]: padded[index] for index in range(len(headers))}
        if any(value != "" for value in record.values()):
            rows.append(record)
    return rows


def number(value: object, fallback: float = 0) -> float:
    if value == "" or value is None:
        return fallback
    return float(value)


def integer(value: object, fallback: int = 0) -> int:
    return int(number(value, fallback))


def text(value: object) -> str:
    return str(value).strip()


def row_text(row: dict[str, object], key: str, fallback: str = "") -> str:
    return text(row.get(key, fallback))


def image_path(row: dict[str, object]) -> str:
    file_name = row_text(row, "file_name")
    if file_name:
        return file_name if file_name.startswith("/") else f"/images/{file_name}"
    return row_text(row, "image")


def ts(value) -> str:
    return json.dumps(value, indent=2)


def main() -> None:
    workbook_path = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else WORKBOOK
    if not workbook_path.exists():
        raise FileNotFoundError(f"Workbook not found: {workbook_path}")

    sheets = load_workbook(workbook_path)

    cards = [
        {
            "name": text(row["name"]),
            "rarity": text(row["rarity"]),
            "image": image_path(row),
        }
        for row in table_rows(sheets["Cards"], ["name", "rarity", "file_name"])
        if text(row["name"])
    ]

    rarity_rates = {
        text(row["rarity"]): number(row["rate_percent"])
        for row in table_rows(sheets["Rarity Rates"], ["rarity", "rate_percent"])
        if text(row["rarity"])
    }

    player_card_profiles = {
        text(row["rarity"]): {
            "title": text(row["title"]),
            "abilityName": text(row["ability_name"]),
            "abilityText": text(row["ability_text"]),
            "lifeValue": integer(row["life_value"], 1),
            "cutInLevel": text(row["cut_in_level"]),
        }
        for row in table_rows(
            sheets["Player Profiles"],
            ["rarity", "title", "ability_name", "ability_text", "life_value", "cut_in_level"],
        )
        if text(row["rarity"])
    }

    enemies = {
        str(integer(row["id"])): {
            "id": integer(row["id"]),
            "name": text(row["name"]),
            "image": image_path(row),
            "attackCounter": integer(row["attack_counter"]),
        }
        for row in table_rows(sheets["Enemies"], ["id", "name", "file_name", "attack_counter"])
        if text(row["id"])
    }

    enemy_groups = [
        {
            "phase": text(row["phase"]),
            "rounds": text(row["rounds"]),
            "group": text(row["group"]),
            "weight": number(row["weight"]),
            "enemyIds": [integer(part) for part in text(row["enemy_ids"]).split(",") if part.strip()],
        }
        for row in table_rows(
            sheets["Enemy Selection"],
            ["phase", "rounds", "group", "weight", "enemy_ids"],
        )
        if text(row["phase"]) and text(row["group"])
    ]

    battle_result_odds = [
        {
            "result": text(row["result"]),
            "odds": number(row["odds_1_in"]),
        }
        for row in table_rows(sheets["Battle Results"], ["result", "odds_1_in"])
        if text(row["result"]) and text(row["result"]) != "Empty"
    ]

    visual_patterns: dict[str, list[dict[str, object]]] = {}
    for row in table_rows(
        sheets["Battle Patterns"],
        ["result", "slot_1", "slot_2", "slot_3", "weight"],
    ):
        result = text(row["result"])
        if not result:
            continue
        visual_patterns.setdefault(result, []).append(
            {
                "cards": [text(row["slot_1"]), text(row["slot_2"]), text(row["slot_3"])],
                "weight": number(row["weight"]),
            }
        )

    bonus_points = {
        text(row["symbol"]): integer(row["points"])
        for row in table_rows(sheets["Bonus Points"], ["symbol", "points"])
        if text(row["symbol"])
    }

    bonus_rewards = {
        text(row["result"]): {
            "points": integer(row["points"]),
            "video": text(row["video"]),
        }
        for row in table_rows(sheets["Bonus Rewards"], ["result", "points", "video"])
        if text(row["result"])
    }

    app_numbers = {
        text(row["key"]): number(row["value"])
        for row in table_rows(sheets["App Config"], ["section", "key", "value"])
        if text(row["key"])
    }

    admin_settings = [
        {
            "key": text(row["setting_key"]),
            "defaultValue": number(row["default_value"]),
            "description": text(row["description"]),
        }
        for row in table_rows(sheets["Admin Settings"], ["setting_key", "default_value", "description"])
        if text(row["setting_key"])
    ]

    output = f"""// Generated by tools/sync-game-config-from-spreadsheet.py.
// Edit game-config/game-config.xlsx, then run `npm run sync:game-config`.

export const cards = {ts(cards)} as const;

export const rarityRates = {ts(rarity_rates)} as const;

export const playerCardProfiles = {ts(player_card_profiles)} as const;

export const battleEnemies = {ts(enemies)} as const;

export const enemySelectionGroups = {ts(enemy_groups)} as const;

export const battleResultOdds = {ts(battle_result_odds)} as const;

export const visualPatternsByResult = {ts(visual_patterns)} as const;

export const BONUS_POINTS = {ts(bonus_points)} as const;

export const bonusRewards = {ts(bonus_rewards)} as const;

export const APP_NUMBERS = {ts(app_numbers)} as const;

export const adminSettings = {ts(admin_settings)} as const;

export const CHANCE_RATE_PER_CARD = APP_NUMBERS.CHANCE_RATE_PER_CARD;

export const GAME = {{
  WIDTH: APP_NUMBERS.GAME_WIDTH,
  HEIGHT: APP_NUMBERS.GAME_HEIGHT,
}} as const;

export const STAGE = {{
  WIDTH: APP_NUMBERS.STAGE_WIDTH,
  HEIGHT: APP_NUMBERS.STAGE_HEIGHT,
}} as const;

export const UI = {{
  TABLE_X: APP_NUMBERS.TABLE_X,
  TABLE_Y: APP_NUMBERS.TABLE_Y,
  TABLE_SCALE: APP_NUMBERS.TABLE_SCALE,
  HOLDER_X: APP_NUMBERS.HOLDER_X,
  HOLDER_Y: APP_NUMBERS.HOLDER_Y,
  HOLDER_SCALE: APP_NUMBERS.HOLDER_SCALE,
  DRAW_BUTTON_X: APP_NUMBERS.DRAW_BUTTON_X,
  DRAW_BUTTON_Y: APP_NUMBERS.DRAW_BUTTON_Y,
  DRAW_BUTTON_SCALE: APP_NUMBERS.DRAW_BUTTON_SCALE,
  CARD_START_X: APP_NUMBERS.CARD_START_X,
  CARD_START_Y: APP_NUMBERS.CARD_START_Y,
  CARD_END_X: APP_NUMBERS.CARD_END_X,
  CARD_END_Y: APP_NUMBERS.CARD_END_Y,
  CARD_SCALE: APP_NUMBERS.CARD_SCALE,
  CARD_ROTATION: Math.PI / 2,
  RELEASE_DISTANCE: APP_NUMBERS.RELEASE_DISTANCE,
  SLOT1_X: APP_NUMBERS.SLOT1_X,
  SLOT1_Y: APP_NUMBERS.SLOT1_Y,
  SLOT2_X: APP_NUMBERS.SLOT2_X,
  SLOT2_Y: APP_NUMBERS.SLOT2_Y,
  SLOT3_X: APP_NUMBERS.SLOT3_X,
  SLOT3_Y: APP_NUMBERS.SLOT3_Y,
  CARD_PLACE_DURATION_1: APP_NUMBERS.CARD_PLACE_DURATION_1,
  CARD_PLACE_DURATION_2: APP_NUMBERS.CARD_PLACE_DURATION_2,
  CARD_PLACE_DURATION_3: APP_NUMBERS.CARD_PLACE_DURATION_3,
}} as const;
"""

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(output, encoding="utf-8")
    print(f"Updated {OUTPUT.relative_to(ROOT)} from {workbook_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
