from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "public" / "images" / "cards"
DESIGN = ROOT / "design-source" / "cards"
ARCHIVE = DESIGN / "archive" / "pre-card-system-redesign-2026-07-21"
PRE_POLISHED_R_ARCHIVE = DESIGN / "archive" / "pre-polished-r1-r2-promotion-2026-07-21"
PRE_POLISHED_R3_R4_ARCHIVE = DESIGN / "archive" / "pre-polished-r3-r4-v2-promotion-2026-07-21"
PRE_POLISHED_SR1_SR2_ARCHIVE = DESIGN / "archive" / "pre-polished-sr1-sr2-promotion-2026-07-21"
PRE_POLISHED_SR3_SR4_ARCHIVE = DESIGN / "archive" / "pre-polished-sr3-sr4-v2-promotion-2026-07-21"
PRE_POLISHED_SSR3_ARCHIVE = DESIGN / "archive" / "pre-polished-ssr3-v2-promotion-2026-07-21"
PRE_POLISHED_SSR_V3_ARCHIVE = DESIGN / "archive" / "pre-polished-ssr1-ssr2-ssr4-v3-promotion-2026-07-21"
QA = DESIGN / "qa" / "card-system-v2"
SIZE = (600, 900)
PLAYER_ART_BOX = (30, 98, 570, 655)

PLAYER_NAMES = {
    "R1": "TRIPLETS BABY DRAGON", "R2": "GREEN SCALE DRAGON",
    "R3": "DRAGON RAIDER", "R4": "YOUNG KNIGHT", "SR1": "NECRO RUNNER",
    "SR2": "RED TORN DRAGON", "SR3": "VIGILANTE", "SR4": "NIGHT CRAWLER",
    "SSR1": "GREAT THUNDER DRAGON", "SSR2": "BLOOD MAN",
    "SSR3": "GHOST OF EMPEROR", "SSR4": "WHITE SWORD MAN", "UR1": "MAMI",
    "UR2": "DOUBLE STRIKER", "UR3": "ABANDONED DOLL",
}
POLISHED_PLAYER_ART = {
    "R1": "references/triplets-baby-dragon-original-polished-premium-hdr-v1.png",
    "R2": "references/green-scale-dragon-original-polished-premium-hdr-v1.png",
    "R3": "references/dragon-raider-original-polished-premium-hdr-v2-face-proportion.png",
    "R4": "references/young-knight-original-faithful-polished-premium-hdr-v2.png",
}
APPROVED_PLAYER_COMPOSITES = {
    "SR1": "card-redesign-polished-v1.png",
    "SR2": "card-redesign-polished-v1.png",
    "SR3": "card-redesign-polished-v2.png",
    "SR4": "card-redesign-polished-v2.png",
    "SSR1": "card-redesign-polished-v3.png",
    "SSR2": "card-redesign-polished-v3.png",
    "SSR3": "card-redesign-polished-v2.png",
    "SSR4": "card-redesign-polished-v3.png",
}
PRE_POLISHED_R_HASHES = {
    "R1": {
        "png": "8fe7bbf814353e662b1abee544ffff337fcc4344a76c231f4d500b06769c08ff",
        "webp": "ad15096b2f83d6c2d21dc7b0920938d61fbc9955f4a4c6d04ccc8bc68c6adda2",
    },
    "R2": {
        "png": "a21eddfad3077dc6c961df7d77d775507ed4b8c3c7221bac46990d99b01bc7a8",
        "webp": "aaa825ed4890bd073dec6b229b145655fe2a000f7f0fd7c1076f53fc1d8fa539",
    },
}
PRE_POLISHED_R3_R4_HASHES = {
    "R3": {
        "png": "5dc3127dc23aa6a3728d4c117fdd3111f19d5d72e833eee0e2f0afe72652e4a7",
        "webp": "f24ddbcb073db70779e0ab491dd9a4f11a87d67bcb286455bea3c11152afd7fc",
    },
    "R4": {
        "png": "0dacd36e5bd4760cd933ba4aabafc7938ccf70569753f063a5abd0dd3c817641",
        "webp": "a8d2bd7f3192f367f2c59fa011bbfdc15209663e6492edbe766559e48630bdaf",
    },
}
PRE_POLISHED_SR1_SR2_HASHES = {
    "SR1": {
        "png": "44663959dad004ef7a15140332f1af1af0e06e7058ace3aa9d177406112a25b7",
        "webp": "e20e956fe77c65c852f876d1b19bab2fca33c22c4182f1d9549f427c77bd8699",
    },
    "SR2": {
        "png": "214112d51f54d4aa9723b451498c7e6161b4396dd15d6f90988bfc6c11eff902",
        "webp": "35490fd1057cd25dead23f3612362be5cf743e98b22043f25985c6416e198211",
    },
}
PRE_POLISHED_SR3_SR4_HASHES = {
    "SR3": {
        "png": "32ac3f78f18e6781a20a59d6ebbb17c7459ef242de034ea6e3ccd26bad22f9ee",
        "webp": "75156505f8bd726220311b4e62d9c74b2e365499dcbe2f6290074a2fccd99f54",
    },
    "SR4": {
        "png": "952b1ec3673a7aaf90b160e71a84912a83333718aaa807b3163f16fba30d73be",
        "webp": "95d132becf640485219ffebdb4ef29e60d3cbcf3a079f3b9931ea32b3ed45ca8",
    },
}
PRE_POLISHED_SSR3_HASHES = {
    "SSR3": {
        "png": "d74be5cab54e131e591c21ee3a4c3efec207e5de0763535a2f96188920b03cce",
        "webp": "c7ef80be0a8a10636e803b00f4e1ed5e6bc0e7a2fd185fab46bdb08ef06df908",
    },
}
PRE_POLISHED_SSR_V3_HASHES = {
    "SSR1": {
        "png": "e12c6b998fe088578646923ec290762d785400ef07a76b14e3c0323f61159681",
        "webp": "ddb982a7664b56f28c92411539ebda01a8ff2a1a279a7ce41a2f5904992d6f99",
    },
    "SSR2": {
        "png": "a752abb2b8cd07507b3248be5db36be9aeb745dca95b7e0589e2d4d85ae167ef",
        "webp": "54c9f919f66f8f90b64184d0ec52291081bb98820fbfd7bcca631151fad33ad1",
    },
    "SSR4": {
        "png": "640351fb7ed479446bc28d0f33f26c2a53ae000ec0ef9a6f089075f434ae45e8",
        "webp": "a02744b637feddf58e8f6ef29632172b736485a13504b67d416c05338f965944",
    },
}
ENEMY_NAMES = {
    "enemy1": "MOURNING TALON - ELIAS", "enemy2": "RIFT STALKER",
    "enemy3": "VOIDSCALE TYRANT", "enemy4": "CRIMSON REGENT - MARCUS",
    "enemy5": "SKYMAW HARRIER", "enemy6": "ROSEBLOOD NOBLE - JULIAN",
    "enemy7": "REDLINE ASSASSIN - KIRA", "enemy8": "MOONPLATE SENTINEL",
    "enemy9": "GHOSTBLADE RONIN - REN", "enemy10": "VELVET TRICKSTER - FELIX",
    "enemy11": "RUINROOT TITAN", "enemy12": "HALO EXECUTIONER - DIANA",
    "enemy13": "LANTERN RONIN - SORA",
}
WIN_RATES = {"R": 10, "SR": 40, "SSR": 80, "UR": 100}
STYLE = {
    "R": ((194, 103, 49), (255, 176, 108), (238, 158, 102)),
    "SR": ((126, 177, 219), (222, 239, 255), (148, 206, 247)),
    "SSR": ((208, 157, 45), (255, 225, 139), (246, 201, 76)),
    "UR": ((193, 221, 235), (255, 255, 255), (244, 218, 150)),
}
REGULAR = Path("C:/Windows/Fonts/bahnschrift.ttf")
BOLD = Path("C:/Windows/Fonts/arialbd.ttf")


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def rarity(card_id: str) -> str:
    return re.sub(r"\d+$", "", card_id)


def load_font(size: int, bold: bool = False):
    return ImageFont.truetype(str(BOLD if bold else REGULAR), size=size)


def fitted_font(text: str, width: int, start: int, minimum: int, bold: bool = False):
    for size in range(start, minimum - 1, -1):
        selected = load_font(size, bold)
        if selected.getlength(text) <= width:
            return selected
    return load_font(minimum, bold)


def wrap(text: str, draw: ImageDraw.ImageDraw, selected_font, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = word if not current else f"{current} {word}"
        if draw.textlength(candidate, font=selected_font) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def ability_lines(text: str, draw: ImageDraw.ImageDraw):
    for size in range(18, 10, -1):
        selected = load_font(size)
        lines = wrap(text, draw, selected, 498)
        leading = size + 3
        if len(lines) * leading <= 102:
            return selected, lines, leading
    selected = load_font(10)
    return selected, wrap(text, draw, selected, 498)[:10], 12


def ability(card_id: str) -> str:
    path = CARDS / "player" / card_id / f"{PLAYER_NAMES[card_id]}.md"
    match = re.search(r"^Ability:\s*(.+)$", path.read_text(encoding="utf-8"), re.MULTILINE)
    if not match:
        raise RuntimeError(f"Missing Ability metadata: {path}")
    return match.group(1).strip()


def attack_counts() -> dict[str, int]:
    source = (ROOT / "lib" / "game-config" / "generated.ts").read_text(encoding="utf-8")
    result: dict[str, int] = {}
    for number in range(1, 14):
        match = re.search(
            rf'"{number}"\s*:\s*\{{.*?"id"\s*:\s*{number}.*?"attackCounter"\s*:\s*(\d+)',
            source,
            re.DOTALL,
        )
        if not match:
            raise RuntimeError(f"Missing attackCounter: enemy{number}")
        result[f"enemy{number}"] = int(match.group(1))
    return result


def archive_assets() -> None:
    manifest = ARCHIVE / "manifest.json"
    if manifest.exists():
        return
    records = []
    for side, names in (("player", PLAYER_NAMES), ("enemy", ENEMY_NAMES)):
        for card_id in names:
            for extension in ("png", "webp"):
                source = CARDS / side / card_id / f"card.{extension}"
                target = ARCHIVE / side / card_id / source.name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
                records.append({"source": source.relative_to(ROOT).as_posix(), "archive": target.relative_to(ROOT).as_posix(), "bytes": source.stat().st_size, "sha256": digest(source)})
    for extension in ("png", "webp"):
        source = ROOT / "public" / "images" / f"card-back.{extension}"
        target = ARCHIVE / "player" / f"legacy-shared-card-back.{extension}"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        records.append({"source": source.relative_to(ROOT).as_posix(), "archive": target.relative_to(ROOT).as_posix(), "bytes": source.stat().st_size, "sha256": digest(source)})
    manifest.write_text(json.dumps({"created": "2026-07-21", "description": "Pre-redesign rendered card archive", "files": records}, indent=2) + "\n", encoding="utf-8")


def glow_line(layer: Image.Image, points, color, width: int = 2) -> None:
    halo = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    ImageDraw.Draw(halo).line(points, fill=(*color, 150), width=width + 4, joint="curve")
    layer.alpha_composite(halo.filter(ImageFilter.GaussianBlur(7)))
    ImageDraw.Draw(layer).line(points, fill=(*color, 238), width=width, joint="curve")


def outer_frame(layer: Image.Image, primary, secondary, enemy: bool = False) -> None:
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle((8, 8, 592, 892), radius=19, outline=(220, 228, 234, 245), width=3)
    draw.rounded_rectangle((15, 15, 585, 885), radius=15, outline=(*primary, 242), width=3)
    draw.rounded_rectangle((24, 24, 576, 876), radius=11, outline=(*secondary, 190), width=1)
    glow_line(layer, [(22, 122), (22, 42), (54, 18), (202, 18)], primary)
    glow_line(layer, [(578, 150), (578, 42), (546, 18), (408, 18)], primary)
    glow_line(layer, [(22, 750), (22, 858), (55, 882), (210, 882)], primary)
    glow_line(layer, [(578, 750), (578, 858), (545, 882), (390, 882)], primary)
    for offset in (0, 9):
        draw.line((36 + offset, 106, 36 + offset, 643), fill=(*primary, 175), width=1)
        draw.line((564 - offset, 145, 564 - offset, 643), fill=(*primary, 175), width=1)
    if enemy:
        for y in range(70, 640, 26):
            draw.line((29, y, 43, y - 14), fill=(*primary, 92), width=1)
            draw.line((571, y, 557, y - 14), fill=(*primary, 92), width=1)


def prismatic_text(layer: Image.Image, xy, text: str, selected_font) -> None:
    mask = Image.new("L", SIZE, 0)
    ImageDraw.Draw(mask).text(xy, text, font=selected_font, fill=255, stroke_width=1, stroke_fill=255)
    gradient = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    pixels = gradient.load()
    colors = [(87, 229, 255), (255, 132, 211), (255, 235, 116), (143, 255, 207)]
    for y in range(20, 120):
        for x in range(420, 575):
            pixels[x, y] = (*colors[((x + y) // 42) % len(colors)], 255)
    glow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    glow.paste((110, 214, 255, 190), mask=mask.filter(ImageFilter.GaussianBlur(7)))
    layer.alpha_composite(glow)
    layer.paste(gradient, mask=mask)


def player_ui(card_id: str) -> Image.Image:
    tier = rarity(card_id)
    primary, secondary, text_color = STYLE[tier]
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    # Only legacy title/rank/panel regions are replaced. The central character-art pixels remain untouched.
    draw.polygon([(28, 28), (430, 28), (430, 98), (28, 98)], fill=(5, 8, 10, 255))
    draw.rectangle((28, 655, 572, 875), fill=(10, 12, 14, 255))
    for y in range(666, 871, 11):
        draw.line((31, y, 569, y - 18), fill=(*primary, 20), width=1)
    outer_frame(layer, primary, secondary)
    draw.rectangle((30, 655, 570, 733), outline=(*secondary, 215), width=2)
    draw.line((421, 655, 421, 733), fill=(*secondary, 215), width=2)
    draw.polygon([(30, 740), (558, 740), (570, 752), (570, 873), (30, 873)], outline=(*secondary, 195), fill=(8, 11, 14, 246))
    tab = [(430, 20), (574, 20), (574, 134), (515, 134), (478, 98), (430, 98)]
    draw.polygon(tab, fill=(8, 10, 13, 250), outline=(*secondary, 245))
    draw.line((430, 28, 565, 28, 565, 122, 519, 122, 484, 90, 430, 90), fill=(*primary, 230), width=3)
    rank_font = fitted_font(tier, 125, 56, 42, True)
    rank_xy = (int(552 - rank_font.getlength(tier)), 35)
    if tier == "UR":
        prismatic_text(layer, rank_xy, tier, rank_font)
    else:
        draw.text(rank_xy, tier, font=rank_font, fill=text_color, stroke_width=2, stroke_fill=(20, 20, 22))
    name = PLAYER_NAMES[card_id]
    draw.text((45, 676), name, font=fitted_font(name, 365, 29, 18, True), fill=text_color, stroke_width=1, stroke_fill=(0, 0, 0))
    draw.text((454, 665), "W RATE", font=load_font(15), fill=(226, 229, 232))
    rate = f"{WIN_RATES[tier]}%"
    rate_font = fitted_font(rate, 126, 38, 28, True)
    draw.text((492, 687), rate, font=rate_font, fill=text_color, anchor="ma", stroke_width=1, stroke_fill=(0, 0, 0))
    draw.text((47, 752), "ABILITY", font=load_font(18, True), fill=secondary)
    selected, lines, leading = ability_lines(ability(card_id), draw)
    y = 779
    for line in lines:
        draw.text((47, y), line, font=selected, fill=(236, 240, 242))
        y += leading
    return layer


def archive_pre_polished_r_cards(
    target_archive: Path,
    expected_hashes: dict[str, dict[str, str]],
    description: str,
) -> None:
    manifest = target_archive / "manifest.json"
    if manifest.exists():
        return

    records = []
    for card_id, expected in expected_hashes.items():
        original = Image.open(ARCHIVE / "player" / card_id / "card.png").convert("RGB")
        composite = Image.alpha_composite(
            original.convert("RGBA"), player_ui(card_id)
        ).convert("RGB")
        output = target_archive / "player" / card_id
        output.mkdir(parents=True, exist_ok=True)
        png, webp = output / "card.png", output / "card.webp"
        composite.save(png, "PNG", optimize=True)
        composite.save(webp, "WEBP", quality=92, method=6)
        actual = {"png": digest(png), "webp": digest(webp)}
        if actual != expected:
            raise RuntimeError(
                f"Pre-polished {card_id} reconstruction hash mismatch: {actual}"
            )
        records.append({
            "card": card_id,
            "files": {
                "png": png.relative_to(ROOT).as_posix(),
                "webp": webp.relative_to(ROOT).as_posix(),
            },
            "sha256": actual,
        })

    manifest.write_text(json.dumps({
        "created": "2026-07-21",
        "description": description,
        "files": records,
    }, indent=2) + "\n", encoding="utf-8")


def fit_cover(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_width, target_height = size
    scale = max(target_width / source.width, target_height / source.height)
    resized = source.resize(
        (round(source.width * scale), round(source.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - target_width) // 2
    top = (resized.height - target_height) // 2
    return resized.crop((left, top, left + target_width, top + target_height))


def player_art_base(card_id: str) -> tuple[Image.Image, Path]:
    relative_source = POLISHED_PLAYER_ART.get(card_id)
    if not relative_source:
        source = ARCHIVE / "player" / card_id / "card.png"
        return Image.open(source).convert("RGB"), source

    source = CARDS / "player" / card_id / relative_source
    polished = Image.open(source).convert("RGB")
    left, top, right, bottom = PLAYER_ART_BOX
    transformed = fit_cover(polished, (right - left, bottom - top))
    base = Image.new("RGB", SIZE, (5, 8, 10))
    base.paste(transformed, (left, top))
    return base, source


def enemy_ui(card_id: str, count: int) -> Image.Image:
    primary, secondary = (126, 61, 183), (205, 164, 244)
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.polygon([(28, 28), (320, 28), (290, 92), (28, 92)], fill=(8, 5, 13, 255))
    draw.rectangle((28, 655, 572, 875), fill=(9, 7, 14, 255))
    outer_frame(layer, primary, secondary, enemy=True)
    draw.rectangle((30, 655, 570, 733), outline=(*secondary, 220), width=2)
    draw.line((420, 655, 420, 733), fill=(*secondary, 220), width=2)
    draw.polygon([(30, 740), (558, 740), (570, 752), (570, 873), (30, 873)], outline=(*primary, 195), fill=(7, 6, 11, 253))
    tab = [(425, 20), (574, 20), (574, 128), (510, 128), (470, 91), (425, 91)]
    draw.polygon(tab, fill=(10, 7, 16, 250), outline=(*secondary, 245))
    draw.line((425, 28, 565, 28, 565, 116, 515, 116, 476, 82, 425, 82), fill=(*primary, 235), width=3)
    draw.text((552, 42), "ENEMY", font=fitted_font("ENEMY", 126, 38, 28, True), fill=(220, 180, 250), anchor="ra", stroke_width=2, stroke_fill=(26, 9, 39))
    name = ENEMY_NAMES[card_id]
    draw.text((44, 678), name, font=fitted_font(name, 363, 27, 15, True), fill=(216, 183, 242), stroke_width=1, stroke_fill=(0, 0, 0))
    draw.text((447, 663), "ATTACK COUNT", font=load_font(13), fill=(222, 213, 231))
    count_font = fitted_font(str(count), 105, 40, 30, True)
    draw.text((495, 689), str(count), font=count_font, fill=(205, 135, 255), anchor="ma", stroke_width=1, stroke_fill=(24, 4, 36))
    return layer


def export_front(
    source: Path | Image.Image,
    overlay: Image.Image,
    output: Path,
    art_source: Path | None = None,
) -> dict[str, object]:
    original = (
        Image.open(source).convert("RGB")
        if isinstance(source, Path)
        else source.convert("RGB")
    )
    if original.size != SIZE:
        raise RuntimeError(f"Expected 600x900: {source}")
    composite = Image.alpha_composite(original.convert("RGBA"), overlay).convert("RGB")
    output.mkdir(parents=True, exist_ok=True)
    png, webp = output / "card.png", output / "card.webp"
    composite.save(png, "PNG", optimize=True)
    composite.save(webp, "WEBP", quality=92, method=6)
    protected = [(75, 105, 420, 645), (420, 155, 540, 645)]
    exact = all(original.crop(box).tobytes() == composite.crop(box).tobytes() for box in protected)
    result = {"png": png.relative_to(ROOT).as_posix(), "webp": webp.relative_to(ROOT).as_posix(), "width": 600, "height": 900, "protectedArtworkPixelExact": exact, "pngSha256": digest(png), "webpSha256": digest(webp)}
    if art_source:
        with Image.open(art_source) as polished:
            result.update({
                "artSource": art_source.relative_to(ROOT).as_posix(),
                "artSourceSha256": digest(art_source),
                "artInputSize": list(polished.size),
                "artPlacement": list(PLAYER_ART_BOX),
            })
    return result


def export_approved_composite(source: Path, output: Path) -> dict[str, object]:
    approved = Image.open(source).convert("RGB")
    runtime = approved.resize(SIZE, Image.Resampling.LANCZOS)
    output.mkdir(parents=True, exist_ok=True)
    png, webp = output / "card.png", output / "card.webp"
    runtime.save(png, "PNG", optimize=True)
    runtime.save(webp, "WEBP", quality=92, method=6)
    return {
        "png": png.relative_to(ROOT).as_posix(),
        "webp": webp.relative_to(ROOT).as_posix(),
        "width": 600,
        "height": 900,
        "approvedComposite": source.relative_to(ROOT).as_posix(),
        "approvedCompositeSha256": digest(source),
        "approvedCompositeInputSize": list(approved.size),
        "pngSha256": digest(png),
        "webpSha256": digest(webp),
    }


def export_player_back() -> dict[str, object]:
    master = Image.open(DESIGN / "redesign-concepts" / "card-system-hybrid-06-rarity-text-color-hierarchy.png").convert("RGB")
    back = master.crop((790, 36, 1438, 1010)).resize(SIZE, Image.Resampling.LANCZOS)
    png, webp = CARDS / "player" / "card-back.png", CARDS / "player" / "card-back.webp"
    back.save(png, "PNG", optimize=True)
    back.save(webp, "WEBP", quality=94, method=6)
    return {"png": png.relative_to(ROOT).as_posix(), "webp": webp.relative_to(ROOT).as_posix(), "width": 600, "height": 900, "pngSha256": digest(png), "webpSha256": digest(webp)}


def qa_sheets(records: list[tuple[str, Path]]) -> list[str]:
    QA.mkdir(parents=True, exist_ok=True)
    grid = Image.new("RGB", (980, ((len(records) + 4) // 5) * 312), (4, 5, 7))
    for index, (label, path) in enumerate(records):
        card = Image.open(path).convert("RGB").resize((180, 270), Image.Resampling.LANCZOS)
        x, y = (index % 5) * 196 + 8, (index // 5) * 312 + 6
        grid.paste(card, (x, y))
        draw = ImageDraw.Draw(grid)
        draw.text((x + 90, y + 282), label, font=fitted_font(label, 170, 16, 10, True), fill=(240, 240, 240), anchor="ma")
    grid_path = QA / "all-fronts-and-player-back-grid.png"
    grid.save(grid_path, optimize=True)
    paths = [grid_path.relative_to(ROOT).as_posix()]
    for start in range(0, len(records), 3):
        page = Image.new("RGB", (1800, 950), (4, 5, 7))
        draw = ImageDraw.Draw(page)
        for column, (label, path) in enumerate(records[start:start + 3]):
            page.paste(Image.open(path).convert("RGB"), (column * 600, 0))
            draw.text((column * 600 + 300, 918), label, font=load_font(20, True), fill=(245, 245, 245), anchor="ma")
        path = QA / f"full-size-review-{start // 3 + 1:02d}.png"
        page.save(path, optimize=True)
        paths.append(path.relative_to(ROOT).as_posix())
    return paths


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    archive_assets()
    archive_pre_polished_r_cards(
        PRE_POLISHED_R_ARCHIVE,
        PRE_POLISHED_R_HASHES,
        "Byte-identical reconstruction of the R1/R2 production files immediately before polished-art promotion",
    )
    archive_pre_polished_r_cards(
        PRE_POLISHED_R3_R4_ARCHIVE,
        PRE_POLISHED_R3_R4_HASHES,
        "Byte-identical reconstruction of the R3/R4 production files immediately before approved v2 polished-art promotion",
    )
    archive_pre_polished_r_cards(
        PRE_POLISHED_SR1_SR2_ARCHIVE,
        PRE_POLISHED_SR1_SR2_HASHES,
        "Byte-identical reconstruction of the SR1/SR2 production files immediately before approved polished-composite promotion",
    )
    archive_pre_polished_r_cards(
        PRE_POLISHED_SR3_SR4_ARCHIVE,
        PRE_POLISHED_SR3_SR4_HASHES,
        "Byte-identical reconstruction of the SR3/SR4 production files immediately before approved v2 polished-composite promotion",
    )
    archive_pre_polished_r_cards(
        PRE_POLISHED_SSR3_ARCHIVE,
        PRE_POLISHED_SSR3_HASHES,
        "Byte-identical reconstruction of the SSR3 production files immediately before approved v2 polished-composite promotion",
    )
    archive_pre_polished_r_cards(
        PRE_POLISHED_SSR_V3_ARCHIVE,
        PRE_POLISHED_SSR_V3_HASHES,
        "Byte-identical reconstruction of the SSR1/SSR2/SSR4 production files immediately before approved v3 polished-composite promotion",
    )
    counts = attack_counts()
    report: dict[str, object] = {"cardSize": [600, 900], "enemyBackCreated": False, "playerFronts": {}, "enemyFronts": {}}
    if not args.verify_only:
        for card_id in PLAYER_NAMES:
            approved_composite = APPROVED_PLAYER_COMPOSITES.get(card_id)
            if approved_composite:
                report["playerFronts"][card_id] = export_approved_composite(
                    CARDS / "player" / card_id / approved_composite,
                    CARDS / "player" / card_id,
                )
                continue
            base, art_source = player_art_base(card_id)
            report["playerFronts"][card_id] = export_front(
                base,
                player_ui(card_id),
                CARDS / "player" / card_id,
                art_source if card_id in POLISHED_PLAYER_ART else None,
            )
        for card_id in ENEMY_NAMES:
            report["enemyFronts"][card_id] = export_front(ARCHIVE / "enemy" / card_id / "card.png", enemy_ui(card_id, counts[card_id]), CARDS / "enemy" / card_id)
        report["playerBack"] = export_player_back()
    records = [(card_id, CARDS / "player" / card_id / "card.png") for card_id in PLAYER_NAMES]
    records += [(card_id, CARDS / "enemy" / card_id / "card.png") for card_id in ENEMY_NAMES]
    records += [("PLAYER BACK", CARDS / "player" / "card-back.png")]
    report["qaSheets"] = qa_sheets(records)
    verification = QA / "verification.json"
    verification.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(verification.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
