from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = (
    ROOT / "public" / "images" / "battle-ui" / "phrase-inserts" / "r4-young-knight"
)
SOURCE = ASSET_DIR / "r4-phrase-insert-composite-preview.png"
OUT = ASSET_DIR / "r4-destiny-battle-motion-preview.webp"
KEYFRAMES = ASSET_DIR / "r4-destiny-battle-motion-keyframes.jpg"
SIZE = (1250, 618)
FPS = 30
FRAME_COUNT = 48
CONTACT_FRAME = 12


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def smoothstep(value: float) -> float:
    value = clamp(value)
    return value * value * (3.0 - 2.0 * value)


def shard_mask(width: int, height: int, left_side: bool, phase: int) -> Image.Image:
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    teeth = [8, 20, 5, 16]
    if left_side:
        edge = [width - teeth[(phase + index) % len(teeth)] for index in range(4)]
        points = [
            (0, 0),
            (edge[0], 0),
            (edge[1], height // 3),
            (edge[2], (height * 2) // 3),
            (edge[3], height),
            (0, height),
        ]
    else:
        edge = [teeth[(phase + index) % len(teeth)] for index in range(4)]
        points = [
            (edge[0], 0),
            (width, 0),
            (width, height),
            (edge[3], height),
            (edge[2], (height * 2) // 3),
            (edge[1], height // 3),
        ]
    draw.polygon(points, fill=255)
    return mask


def closing_frame(final: Image.Image, frame_index: int) -> Image.Image:
    canvas = Image.new("RGB", SIZE, (0, 0, 0))
    band_count = 8
    stagger = [0, 3, 1, 4, 2, 5, 2, 4]
    half = SIZE[0] // 2

    for band in range(band_count):
        top = round(SIZE[1] * band / band_count)
        bottom = round(SIZE[1] * (band + 1) / band_count) + 2
        height = bottom - top
        start = stagger[band]
        progress = smoothstep((frame_index - start) / max(1, CONTACT_FRAME - start))
        settle_y = round((1.0 - progress) * (6 if band % 2 == 0 else -6))

        left_piece = final.crop((0, top, half, min(bottom, SIZE[1])))
        right_piece = final.crop((half, top, SIZE[0], min(bottom, SIZE[1])))
        left_mask = shard_mask(left_piece.width, left_piece.height, True, band)
        right_mask = shard_mask(right_piece.width, right_piece.height, False, band)
        left_x = round(-half + progress * half)
        right_x = round(SIZE[0] - progress * half)
        canvas.paste(left_piece, (left_x, top + settle_y), left_mask)
        canvas.paste(right_piece, (right_x, top - settle_y), right_mask)

    return canvas


def flash_amount(frame_index: int) -> float:
    values = {12: 0.25, 13: 0.80, 14: 1.0, 15: 0.72, 16: 0.35, 17: 0.10}
    return values.get(frame_index, 0.0)


def inversion_mask(frame_index: int) -> Image.Image:
    mask = Image.new("L", SIZE, 0)
    pixels = mask.load()
    starts = (15, 20, 25)
    duration = 9
    band_radius = 130
    for start in starts:
        progress = (frame_index - start) / duration
        if not 0.0 <= progress <= 1.0:
            continue
        center = round(SIZE[1] + band_radius - progress * (SIZE[1] + band_radius * 2))
        for y in range(max(0, center - band_radius), min(SIZE[1], center + band_radius)):
            strength = 1.0 - abs(y - center) / band_radius
            value = round(255 * smoothstep(strength))
            for x in range(SIZE[0]):
                pixels[x, y] = max(pixels[x, y], value)
    return mask


def holographic_sweep(frame: Image.Image, mask: Image.Image, frame_index: int) -> Image.Image:
    color_cycle = (
        (105, 205, 235),
        (60, 175, 225),
        (185, 205, 225),
        (210, 165, 80),
    )
    color = color_cycle[frame_index % len(color_cycle)]
    overlay = Image.new("RGB", SIZE, color)
    soft_mask = mask.point(lambda value: round(value * 0.52))
    overlay = Image.composite(
        overlay,
        Image.new("RGB", SIZE, (0, 0, 0)),
        soft_mask,
    )
    return ImageChops.screen(frame, overlay)


def glint_pulse(frame: Image.Image, foil: Image.Image, frame_index: int) -> Image.Image:
    if frame_index < 28:
        return frame
    phase = (frame_index - 28) % 8
    amount = max(0.0, 1.0 - abs(phase - 3) / 3.0)
    if amount <= 0:
        return frame
    bright = ImageEnhance.Brightness(foil.convert("RGBA")).enhance(1.8)
    alpha = bright.getchannel("A").point(lambda value: round(value * 0.55 * amount))
    bright.putalpha(alpha)
    base = frame.convert("RGBA")
    base.alpha_composite(bright)
    return base.convert("RGB")


def exit_frame(final: Image.Image, frame_index: int) -> Image.Image:
    progress = smoothstep((frame_index - 40) / 7.0)
    if progress <= 0:
        return final.copy()
    half = SIZE[0] // 2
    distance = round(progress * (half + 30))
    canvas = Image.new("RGB", SIZE, (0, 0, 0))
    left = final.crop((0, 0, half, SIZE[1]))
    right = final.crop((half, 0, SIZE[0], SIZE[1]))
    canvas.paste(left, (-distance, 0))
    canvas.paste(right, (half + distance, 0))
    return canvas


def make_frame(final: Image.Image, foil: Image.Image, frame_index: int) -> Image.Image:
    if frame_index < CONTACT_FRAME:
        frame = closing_frame(final, frame_index)
    elif frame_index >= 40:
        frame = exit_frame(final, frame_index)
    else:
        frame = final.copy()

    flash = flash_amount(frame_index)
    if flash:
        white = Image.new("RGB", SIZE, (255, 255, 255))
        frame = Image.blend(frame, white, flash)

    mask = inversion_mask(frame_index)
    if mask.getbbox():
        grayscale = ImageOps.autocontrast(ImageOps.grayscale(final))
        binary = grayscale.point(lambda value: 255 if value >= 122 else 0).convert("RGB")
        negative = ImageOps.invert(final)
        treatment = negative if frame_index % 2 == 0 else binary
        frame = Image.composite(treatment, frame, mask)
        frame = holographic_sweep(frame, mask, frame_index)

    return glint_pulse(frame, foil, frame_index)


def save_keyframes(frames: list[Image.Image]) -> None:
    indices = (3, 7, 11, 14, 18, 24, 32, 45)
    thumb_size = (375, 185)
    sheet = Image.new("RGB", (1500, 430), (13, 17, 23))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 22)
    labels = (
        "SHARDS ENTER",
        "DOORS CLOSING",
        "PRE-CONTACT",
        "HUGE FLASH",
        "INVERSION WAVE 1",
        "INVERSION WAVE 3",
        "FOIL HOLD",
        "SHATTER EXIT",
    )
    for index, (frame_index, label) in enumerate(zip(indices, labels)):
        column = index % 4
        row = index // 4
        x = column * thumb_size[0]
        y = row * 215
        thumb = frames[frame_index].resize(thumb_size, Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x, y))
        draw.text((x + 10, y + 188), label, font=font, fill=(237, 242, 248))
    sheet.save(KEYFRAMES, quality=92)


def main() -> None:
    final = Image.open(SOURCE).convert("RGB").resize(SIZE, Image.Resampling.LANCZOS)
    foil = Image.open(ASSET_DIR / "08-foreground-foil.png").convert("RGBA")
    frames = [make_frame(final, foil, index) for index in range(FRAME_COUNT)]
    frames[0].save(
        OUT,
        save_all=True,
        append_images=frames[1:],
        duration=round(1000 / FPS),
        loop=0,
        quality=82,
        method=6,
    )
    save_keyframes(frames)


if __name__ == "__main__":
    main()
