from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "images" / "battle-ui" / "phrase-inserts" / "r4-young-knight"
SIZE = (1250, 618)
DISPLAY_TITLE = ("DESTINY", "BATTLE")
FONT_PATH = Path(r"C:\Windows\Fonts\impact.ttf")


def contain_crop(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGBA")
    ratio = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize(
        (round(image.width * ratio), round(image.height * ratio)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def crop_alpha(image: Image.Image, padding: int = 0) -> Image.Image:
    image = image.convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(image.width, bbox[2] + padding)
    bottom = min(image.height, bbox[3] + padding)
    return image.crop((left, top, right, bottom))


def fit_font(text: str, max_width: int, max_size: int) -> ImageFont.FreeTypeFont:
    size = max_size
    while size > 24:
        font = ImageFont.truetype(str(FONT_PATH), size)
        bbox = font.getbbox(text, stroke_width=0)
        if bbox[2] - bbox[0] <= max_width:
            return font
        size -= 2
    return ImageFont.truetype(str(FONT_PATH), size)


def make_text_mask() -> Image.Image:
    mask = Image.new("L", SIZE, 0)
    draw = ImageDraw.Draw(mask)
    max_width = 500
    line_specs = [
        (DISPLAY_TITLE[0], 134, 152),
        (DISPLAY_TITLE[1], 166, 304),
    ]
    for text, max_size, y in line_specs:
        font = fit_font(text, max_width, max_size)
        bbox = draw.textbbox((0, 0), text, font=font, stroke_width=0)
        width = bbox[2] - bbox[0]
        draw.text((84 + (max_width - width) // 2, y), text, font=font, fill=255)
    return mask


def tint_alpha(alpha: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    layer = Image.new("RGBA", SIZE, color)
    layer.putalpha(ImageChops.multiply(alpha, Image.new("L", SIZE, color[3])))
    return layer


def make_text_layers() -> tuple[Image.Image, Image.Image, Image.Image]:
    mask = make_text_mask()

    shadow_alpha = mask.filter(ImageFilter.GaussianBlur(12))
    shadow_alpha = ImageChops.offset(shadow_alpha, 15, 16)
    shadow = tint_alpha(shadow_alpha, (0, 0, 0, 150))

    ghost_alpha = mask.filter(ImageFilter.GaussianBlur(1.8))
    ghost_alpha = ImageChops.offset(ghost_alpha, -13, 8)
    ghost = tint_alpha(ghost_alpha, (72, 105, 139, 72))
    ghost_edge = mask.filter(ImageFilter.MaxFilter(19))
    ghost_edge = ImageChops.subtract(ghost_edge, mask.filter(ImageFilter.MaxFilter(7)))
    ghost_edge = ImageChops.offset(ghost_edge, 11, -5)
    ghost = Image.alpha_composite(ghost, tint_alpha(ghost_edge, (211, 233, 255, 55)))

    outer = mask.filter(ImageFilter.MaxFilter(13))
    inner_edge = mask.filter(ImageFilter.MaxFilter(5))
    main = tint_alpha(outer, (8, 16, 27, 240))
    main = Image.alpha_composite(main, tint_alpha(inner_edge, (218, 235, 249, 255)))

    gradient = Image.new("RGBA", SIZE)
    pixels = gradient.load()
    for y in range(SIZE[1]):
        if y < 230:
            color = (246, 251, 255, 255)
        elif y < 390:
            color = (109, 132, 157, 255)
        else:
            color = (220, 232, 242, 255)
        for x in range(SIZE[0]):
            pixels[x, y] = color
    gradient.putalpha(mask)
    main = Image.alpha_composite(main, gradient)

    highlight = ImageChops.subtract(mask, ImageChops.offset(mask, 0, 3))
    main = Image.alpha_composite(main, tint_alpha(highlight, (255, 255, 255, 210)))
    lowlight = ImageChops.subtract(mask, ImageChops.offset(mask, 0, -4))
    main = Image.alpha_composite(main, tint_alpha(lowlight, (24, 42, 64, 155)))
    return shadow, ghost, main


def make_character_layers() -> tuple[Image.Image, Image.Image]:
    source = crop_alpha(
        Image.open(OUT / "source" / "young-knight-alpha-master.png"),
        padding=8,
    )
    target_height = 940
    scale = target_height / source.height
    source = source.resize(
        (round(source.width * scale), target_height),
        Image.Resampling.LANCZOS,
    )
    x = 610
    y = -38

    character = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    character.alpha_composite(source, (x, y))

    alpha = character.getchannel("A")
    echo_fill = tint_alpha(ImageChops.offset(alpha, 14, 2), (106, 153, 194, 48))
    expanded = alpha.filter(ImageFilter.MaxFilter(17))
    rim = ImageChops.subtract(expanded, alpha)
    rim = ImageChops.offset(rim, 9, 0)
    echo = Image.alpha_composite(echo_fill, tint_alpha(rim, (225, 244, 255, 80)))
    return echo, character


def place_effect(path: Path, target_height: int, center_x: int, y: int = 0) -> Image.Image:
    effect = crop_alpha(Image.open(path), padding=4)
    scale = target_height / effect.height
    effect = effect.resize(
        (round(effect.width * scale), target_height),
        Image.Resampling.LANCZOS,
    )
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    layer.alpha_composite(effect, (center_x - effect.width // 2, y))
    return layer


def make_contact_sheet(layers: list[tuple[str, Image.Image]]) -> Image.Image:
    thumb_size = (500, 247)
    sheet = Image.new("RGB", (1060, 1130), (17, 21, 29))
    draw = ImageDraw.Draw(sheet)
    label_font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 24)
    for index, (label, layer) in enumerate(layers):
        column = index % 2
        row = index // 2
        x = 20 + column * 520
        y = 20 + row * 275
        checker = Image.new("RGBA", SIZE, (32, 38, 48, 255))
        checker.alpha_composite(layer)
        thumb = checker.convert("RGB").resize(thumb_size, Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x, y))
        draw.text((x, y + 249), label, font=label_font, fill=(229, 235, 242))
    return sheet


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    background = contain_crop(Image.open(OUT / "source" / "background-generated.png"), SIZE)
    background.save(OUT / "01-background-plate.png", optimize=True)

    text_shadow, text_ghost, text_main = make_text_layers()
    text_shadow.save(OUT / "02-text-shadow-depth.png", optimize=True)
    text_ghost.save(OUT / "03-text-ghost-depth.png", optimize=True)
    text_main.save(OUT / "04-text-main-destiny-battle.png", optimize=True)

    character_echo, character = make_character_layers()
    character_echo.save(OUT / "05-character-echo.png", optimize=True)
    character.save(OUT / "06-character-coated.png", optimize=True)

    divider = place_effect(
        OUT / "source" / "energy-divider-alpha-master.png",
        650,
        630,
        -16,
    )
    divider.save(OUT / "07-energy-divider.png", optimize=True)

    foil_source = crop_alpha(
        Image.open(OUT / "source" / "foil-flames-alpha-master.png"),
        padding=4,
    )
    foil_scale = 590 / foil_source.height
    foil_source = foil_source.resize(
        (round(foil_source.width * foil_scale), 590),
        Image.Resampling.LANCZOS,
    )
    foil = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    foil.alpha_composite(foil_source, (SIZE[0] - foil_source.width + 12, 20))
    foil.save(OUT / "08-foreground-foil.png", optimize=True)

    layers = [
        ("01 BACKGROUND PLATE", background),
        ("02 TEXT SHADOW", text_shadow),
        ("03 TEXT GHOST", text_ghost),
        ("04 TEXT MAIN", text_main),
        ("05 CHARACTER ECHO", character_echo),
        ("06 CHARACTER COATED", character),
        ("07 ENERGY DIVIDER", divider),
        ("08 FOREGROUND FOIL", foil),
    ]

    composite = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    for _, layer in layers:
        composite = Image.alpha_composite(composite, layer)
    composite.convert("RGB").save(OUT / "r4-phrase-insert-composite-preview.jpg", quality=94)
    composite.save(OUT / "r4-phrase-insert-composite-preview.png", optimize=True)
    make_contact_sheet(layers).save(OUT / "r4-layer-contact-sheet.jpg", quality=92)


if __name__ == "__main__":
    main()
