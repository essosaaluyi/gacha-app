import sys
from pathlib import Path
from PIL import Image

if len(sys.argv) < 2:
    raise SystemExit("usage: tmp_clip_alpha.py IMAGE...")

for raw in sys.argv[1:]:
    path = Path(raw)
    image = Image.open(path).convert("RGBA")
    pixels = image.load()
    clipped = 0
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a < 32:
                pixels[x, y] = (r, g, b, 0)
                clipped += 1
    image.save(path, "PNG")
    print(f"saved={path}; clipped={clipped}")
