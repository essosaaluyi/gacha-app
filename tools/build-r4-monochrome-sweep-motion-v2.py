from pathlib import Path
from functools import lru_cache
import math

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps


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
PARENT = OUT.parent
POSITIVE = OUT / "04-composite-positive.png"
NEGATIVE = OUT / "08-composite-negative.png"
ENERGY_DIVIDER = PARENT / "07-energy-divider.png"
FOREGROUND_FOIL = PARENT / "08-foreground-foil.png"
MONOCHROME_FOIL = OUT / "09-foreground-foil-monochrome-holographic-v2.png"
ANIMATION = OUT / "r4-monochrome-v2-selected-extended-v6.webp"
KEYFRAMES = OUT / "r4-monochrome-v2-selected-extended-keyframes-v6.jpg"
SIZE = (1250, 618)
FPS = 30
FRAME_COUNT = 88
CONTACT = 24
BURST_START = 30
BURST_END = 46
EXIT_START = 75


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def smoothstep(value: float) -> float:
    value = clamp(value)
    return value * value * (3.0 - 2.0 * value)


def shard_mask(width: int, height: int, left: bool, phase: int) -> Image.Image:
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    teeth = (5, 18, 9, 23)
    edge = [teeth[(phase + index) % len(teeth)] for index in range(4)]
    if left:
        points = [
            (0, 0),
            (width - edge[0], 0),
            (width - edge[1], height // 3),
            (width - edge[2], (height * 2) // 3),
            (width - edge[3], height),
            (0, height),
        ]
    else:
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


def door_close(plate: Image.Image, frame_index: int) -> Image.Image:
    canvas = Image.new("RGB", SIZE, (0, 0, 0))
    half = SIZE[0] // 2
    stagger = (0, 3, 1, 4, 2, 5, 2, 4)
    for band in range(8):
        top = round(SIZE[1] * band / 8)
        bottom = min(SIZE[1], round(SIZE[1] * (band + 1) / 8) + 2)
        start = stagger[band]
        progress = smoothstep((frame_index - start) / max(1, CONTACT - start))
        y_shift = round((1.0 - progress) * (6 if band % 2 == 0 else -6))
        left_piece = plate.crop((0, top, half, bottom))
        right_piece = plate.crop((half, top, SIZE[0], bottom))
        left_x = round(-half + progress * half)
        right_x = round(SIZE[0] - progress * half)
        canvas.paste(
            left_piece,
            (left_x, top + y_shift),
            shard_mask(left_piece.width, left_piece.height, True, band),
        )
        canvas.paste(
            right_piece,
            (right_x, top - y_shift),
            shard_mask(right_piece.width, right_piece.height, False, band),
        )
    return canvas


def rising_mask(
    progress: float,
    feather: int = 14,
) -> Image.Image:
    progress = clamp(progress)
    mask = Image.new("L", SIZE, 0)
    pixels = mask.load()
    boundary = SIZE[1] - progress * SIZE[1]
    for y in range(SIZE[1]):
        distance = y - boundary
        if distance >= feather:
            value = 255
        elif distance <= -feather:
            value = 0
        else:
            value = round(
                255 * smoothstep((distance + feather) / (feather * 2))
            )
        for x in range(SIZE[0]):
            pixels[x, y] = value
    return mask


def sweep(previous: Image.Image, incoming: Image.Image, progress: float) -> Image.Image:
    return Image.composite(incoming, previous, rising_mask(progress))


def alternating_plate(positive: Image.Image, negative: Image.Image, frame_index: int) -> Image.Image:
    transitions = (
        (30, 34, positive, negative),
        (34, 38, negative, positive),
        (38, 42, positive, negative),
        (42, 46, negative, positive),
    )
    if frame_index < BURST_START:
        return positive.copy()
    for start, end, previous, incoming in transitions:
        if start <= frame_index < end:
            progress = (frame_index - start + 1) / (end - start)
            return sweep(previous, incoming, progress)
    return positive.copy()


def flash(frame: Image.Image, frame_index: int) -> Image.Image:
    amount = {
        24: 0.20,
        25: 0.55,
        26: 1.0,
        27: 0.75,
        28: 0.35,
        29: 0.10,
    }.get(frame_index, 0.0)
    if not amount:
        return frame
    return Image.blend(frame, Image.new("RGB", SIZE, (255, 255, 255)), amount)


def overlay_opacity(
    base: Image.Image, layer: Image.Image, opacity: float
) -> Image.Image:
    if opacity <= 0:
        return base
    foreground = layer.copy()
    if opacity < 1:
        alpha = foreground.getchannel("A").point(
            lambda value: round(value * opacity)
        )
        foreground.putalpha(alpha)
    result = base.convert("RGBA")
    result.alpha_composite(foreground)
    return result.convert("RGB")


def foreground_opacity(frame_index: int, foil: bool = False) -> float:
    if frame_index < CONTACT or frame_index >= FRAME_COUNT:
        return 0.0
    if frame_index <= 29:
        ramp = smoothstep((frame_index - CONTACT + 1) / 6.0)
        return ramp * (0.75 if foil else 1.0)
    return 0.90 if foil else 1.0


def monochrome_foil(source: Image.Image) -> Image.Image:
    alpha = source.getchannel("A")
    gray = ImageOps.grayscale(source.convert("RGB"))
    gray = ImageOps.autocontrast(gray, cutoff=1)
    gray = ImageEnhance.Contrast(gray).enhance(1.65)
    gray = gray.point(
        lambda value: 0
        if value < 64
        else 92
        if value < 128
        else 196
        if value < 208
        else 255
    )
    result = Image.merge("RGBA", (gray, gray, gray, alpha))
    result.save(MONOCHROME_FOIL)
    return result


def animate_energy_divider(
    source: Image.Image, frame_index: int
) -> Image.Image:
    phase = frame_index % 8
    brightness = (0.88, 1.12, 0.96, 1.25, 0.91, 1.06, 0.84, 1.18)[phase]
    bright = source.copy()
    rgb = ImageEnhance.Brightness(bright.convert("RGB")).enhance(brightness)
    bright = Image.merge("RGBA", (*rgb.split(), bright.getchannel("A")))

    result = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    slice_count = 12
    jitter = (-4, 2, 0, 5, -2, 3, -3, 1)
    for band in range(slice_count):
        top = round(SIZE[1] * band / slice_count)
        bottom = round(SIZE[1] * (band + 1) / slice_count)
        dx = jitter[(phase + band * 3) % len(jitter)]
        dy = 1 if (phase + band) % 5 == 0 else 0
        piece = bright.crop((0, top, SIZE[0], bottom))
        result.alpha_composite(piece, (dx, top + dy))

    echo = result.copy()
    echo_alpha = echo.getchannel("A").point(lambda value: round(value * 0.18))
    echo.putalpha(echo_alpha)
    composite = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    composite.alpha_composite(echo, (-6 if phase % 2 else 6, 0))
    composite.alpha_composite(result)
    return composite


def foil_band_mask(frame_index: int) -> Image.Image:
    sample_width = 320
    sample_height = round(sample_width * SIZE[1] / SIZE[0])
    mask = Image.new("L", (sample_width, sample_height), 0)
    pixels = mask.load()
    progress = (frame_index % 24) / 23.0
    center = -0.35 + progress * 1.70
    for y in range(sample_height):
        ny = y / max(1, sample_height - 1)
        for x in range(sample_width):
            nx = x / max(1, sample_width - 1)
            distance = abs((ny + nx * 0.28) - center)
            pixels[x, y] = round(255 * (1.0 - smoothstep(distance / 0.16)))
    return mask.resize(SIZE, Image.Resampling.BICUBIC)


def animate_monochrome_foil(
    source: Image.Image, frame_index: int
) -> Image.Image:
    rgb = source.convert("RGB")
    inverted = ImageOps.invert(rgb)
    shimmer = Image.composite(inverted, rgb, foil_band_mask(frame_index))
    pulse = 0.92 + 0.08 * math.sin(frame_index * math.pi / 4.0)
    shimmer = ImageEnhance.Brightness(shimmer).enhance(pulse)
    return Image.merge("RGBA", (*shimmer.split(), source.getchannel("A")))


def shift_channel(channel: Image.Image, dx: int, dy: int) -> Image.Image:
    shifted = Image.new("L", channel.size, 0)
    shifted.paste(channel, (dx, dy))
    return shifted


@lru_cache(maxsize=4)
def corner_mask(corner_x: int, corner_y: int) -> Image.Image:
    sample_width = 320
    sample_height = round(sample_width * SIZE[1] / SIZE[0])
    mask = Image.new("L", (sample_width, sample_height), 0)
    pixels = mask.load()
    for y in range(sample_height):
        ny = y / max(1, sample_height - 1)
        edge_y = (0.30 - ny) / 0.30 if corner_y < 0 else (ny - 0.70) / 0.30
        edge_y = smoothstep(edge_y)
        for x in range(sample_width):
            nx = x / max(1, sample_width - 1)
            edge_x = (0.24 - nx) / 0.24 if corner_x < 0 else (nx - 0.76) / 0.24
            edge_x = smoothstep(edge_x)
            pixels[x, y] = round(255 * edge_x * edge_y)
    return mask.resize(SIZE, Image.Resampling.BICUBIC)


def chromatic_aberration(
    frame: Image.Image, frame_index: int
) -> Image.Image:
    if frame_index < CONTACT or frame_index >= FRAME_COUNT:
        return frame
    if frame_index <= 29:
        offset = 6
        strength = 0.78
    elif frame_index < BURST_END:
        offset = 11
        strength = 1.0
    elif frame_index < EXIT_START:
        pulse = 0.5 + 0.5 * math.sin(frame_index * math.pi / 5.0)
        offset = 5 + round(2 * pulse)
        strength = 0.72 + 0.18 * pulse
    else:
        progress = (FRAME_COUNT - 1 - frame_index) / (FRAME_COUNT - EXIT_START)
        offset = max(1, round(6 * progress))
        strength = max(0.0, progress) * 0.75

    result = frame
    for corner_x, corner_y in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        red, green, blue = result.split()
        aberrated = Image.merge(
            "RGB",
            (
                shift_channel(red, corner_x * offset, corner_y * offset),
                green,
                shift_channel(blue, -corner_x * offset, -corner_y * offset),
            ),
        )
        result = Image.composite(
            aberrated,
            result,
            corner_mask(corner_x, corner_y).point(
                lambda value: round(value * strength)
            ),
        )
    return result


def exit_shatter(plate: Image.Image, frame_index: int) -> Image.Image:
    progress = smoothstep((frame_index - EXIT_START) / (FRAME_COUNT - 1 - EXIT_START))
    if progress <= 0:
        return plate
    half = SIZE[0] // 2
    distance = round(progress * (half + 20))
    canvas = Image.new("RGB", SIZE, (0, 0, 0))
    canvas.paste(plate.crop((0, 0, half, SIZE[1])), (-distance, 0))
    canvas.paste(plate.crop((half, 0, SIZE[0], SIZE[1])), (half + distance, 0))
    return canvas


def make_frame(
    positive: Image.Image,
    negative: Image.Image,
    energy_divider: Image.Image,
    foreground_foil: Image.Image,
    frame_index: int,
) -> Image.Image:
    if frame_index < CONTACT:
        return door_close(positive, frame_index)
    plate = alternating_plate(positive, negative, frame_index)
    plate = flash(plate, frame_index)
    plate = overlay_opacity(
        plate,
        animate_energy_divider(energy_divider, frame_index),
        foreground_opacity(frame_index),
    )
    plate = overlay_opacity(
        plate,
        animate_monochrome_foil(foreground_foil, frame_index),
        foreground_opacity(frame_index, foil=True),
    )
    plate = chromatic_aberration(plate, frame_index)
    if frame_index >= EXIT_START:
        plate = exit_shatter(plate, frame_index)
    return plate


def save_keyframes(frames: list[Image.Image]) -> None:
    indices = (8, 21, 26, 32, 36, 40, 44, 58)
    labels = (
        "SHARDS CLOSE",
        "PRE-CONTACT",
        "ANIMATED DIVIDER FLASH",
        "V2 HORIZONTAL FLIP 1",
        "V2 HORIZONTAL FLIP 2",
        "V2 HORIZONTAL FLIP 3",
        "V2 HORIZONTAL FLIP 4",
        "LONG B/W HOLOGRAPHIC HOLD",
    )
    thumb_size = (375, 185)
    sheet = Image.new("RGB", (1500, 430), (10, 10, 10))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 20)
    for index, (frame_index, label) in enumerate(zip(indices, labels)):
        column = index % 4
        row = index // 4
        x = column * thumb_size[0]
        y = row * 215
        sheet.paste(
            frames[frame_index].resize(thumb_size, Image.Resampling.LANCZOS),
            (x, y),
        )
        draw.text((x + 8, y + 188), label, font=font, fill=(240, 240, 240))
    sheet.save(KEYFRAMES, quality=93)


def main() -> None:
    positive = Image.open(POSITIVE).convert("RGB")
    negative = Image.open(NEGATIVE).convert("RGB")
    energy_divider = Image.open(ENERGY_DIVIDER).convert("RGBA")
    foreground_foil = monochrome_foil(
        Image.open(FOREGROUND_FOIL).convert("RGBA")
    )
    frames = [
        make_frame(
            positive,
            negative,
            energy_divider,
            foreground_foil,
            index,
        )
        for index in range(FRAME_COUNT)
    ]
    frames[0].save(
        ANIMATION,
        save_all=True,
        append_images=frames[1:],
        duration=round(1000 / FPS),
        loop=0,
        quality=80,
        method=2,
    )
    save_keyframes(frames)


if __name__ == "__main__":
    main()
