from pathlib import Path
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = (
    ROOT
    / "public"
    / "images"
    / "battle-ui"
    / "phrase-inserts"
    / "r4-young-knight"
    / "monochrome-sweep-v2"
)
SOURCE = OUT / "source"
SIZE = (1250, 618)
FONT_PATH = Path(r"C:\Windows\Fonts\impact.ttf")


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGB")
    ratio = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize(
        (round(image.width * ratio), round(image.height * ratio)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def fit_font(text: str, max_width: int, max_size: int) -> ImageFont.FreeTypeFont:
    for size in range(max_size, 40, -2):
        font = ImageFont.truetype(str(FONT_PATH), size)
        box = font.getbbox(text)
        if box[2] - box[0] <= max_width:
            return font
    return ImageFont.truetype(str(FONT_PATH), 40)


def distressed_title_mask() -> Image.Image:
    mask = Image.new("L", SIZE, 0)
    draw = ImageDraw.Draw(mask)
    lines = (
        ("DESTINY", 132, 58, 152),
        ("BATTLE", 166, 78, 304),
    )
    for text, max_size, x, y in lines:
        font = fit_font(text, 500, max_size)
        draw.text((x, y), text, font=font, fill=255, stroke_width=2, stroke_fill=255)

    rng = random.Random(240805)
    for _ in range(260):
        x = rng.randint(45, 590)
        y = rng.randint(135, 485)
        width = rng.randint(4, 35)
        height = rng.randint(1, 5)
        draw.rectangle((x, y, x + width, y + height), fill=rng.randint(0, 80))
    for _ in range(85):
        x = rng.randint(50, 580)
        y = rng.randint(135, 490)
        radius = rng.randint(1, 6)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=0)
    return mask


def registered_character(path: Path) -> Image.Image:
    source = Image.open(path).convert("RGBA")
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    layer.alpha_composite(source, (196, 0))
    return layer


def title_layer(mask: Image.Image, positive: bool) -> Image.Image:
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    echo_mask = ImageChops.offset(mask.filter(ImageFilter.GaussianBlur(1.2)), 12, 9)
    echo_color = (92, 92, 92, 175) if positive else (165, 165, 165, 175)
    echo = Image.new("RGBA", SIZE, echo_color)
    echo.putalpha(echo_mask.point(lambda value: round(value * 0.62)))
    layer.alpha_composite(echo)

    face_color = (238, 238, 236, 255) if positive else (16, 16, 18, 255)
    face = Image.new("RGBA", SIZE, face_color)
    face.putalpha(mask)
    layer.alpha_composite(face)
    return layer


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    background_positive = cover(
        Image.open(SOURCE / "manga-ink-background-generated.png"),
        SIZE,
    )
    background_negative = ImageOps.invert(background_positive)
    background_positive.save(OUT / "01-background-positive.png", optimize=True)
    background_negative.save(OUT / "05-background-negative.png", optimize=True)

    mask = distressed_title_mask()
    title_positive = title_layer(mask, True)
    title_negative = title_layer(mask, False)
    title_positive.save(OUT / "02-title-destiny-battle-positive.png", optimize=True)
    title_negative.save(OUT / "06-title-destiny-battle-negative.png", optimize=True)

    character_positive = registered_character(SOURCE / "young-knight-positive.png")
    character_negative = registered_character(SOURCE / "young-knight-negative.png")
    character_positive.save(OUT / "03-character-positive.png", optimize=True)
    character_negative.save(OUT / "07-character-negative.png", optimize=True)

    positive = background_positive.convert("RGBA")
    positive.alpha_composite(title_positive)
    positive.alpha_composite(character_positive)
    positive.convert("RGB").save(OUT / "04-composite-positive.png", optimize=True)

    negative = background_negative.convert("RGBA")
    negative.alpha_composite(title_negative)
    negative.alpha_composite(character_negative)
    negative.convert("RGB").save(OUT / "08-composite-negative.png", optimize=True)

    comparison = Image.new("RGB", (1250, 1280), (12, 12, 12))
    comparison.paste(positive.convert("RGB"), (0, 0))
    comparison.paste(negative.convert("RGB"), (0, 662))
    draw = ImageDraw.Draw(comparison)
    font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 28)
    draw.text((24, 624), "POSITIVE MONOCHROME PLATE", font=font, fill=(240, 240, 240))
    draw.text((24, 628 + 618), "INVERTED MONOCHROME PLATE", font=font, fill=(240, 240, 240))
    comparison.save(OUT / "r4-monochrome-plate-comparison.jpg", quality=93)


if __name__ == "__main__":
    main()
