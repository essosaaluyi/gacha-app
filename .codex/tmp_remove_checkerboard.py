from collections import deque
import sys
from pathlib import Path
from PIL import Image

if len(sys.argv) != 3:
    raise SystemExit("usage: tmp_remove_checkerboard.py INPUT OUTPUT")
src = Path(sys.argv[1])
dst = Path(sys.argv[2])

image = Image.open(src).convert("RGBA")
width, height = image.size
pixels = image.load()

def is_checkerboard(rgb):
    r, g, b = rgb
    return max(rgb) - min(rgb) <= 8 and min(rgb) >= 180

background = bytearray(width * height)
queue = deque()

def enqueue(x, y):
    index = y * width + x
    if not background[index] and is_checkerboard(pixels[x, y][:3]):
        background[index] = 1
        queue.append((x, y))

for x in range(width):
    enqueue(x, 0)
    enqueue(x, height - 1)
for y in range(height):
    enqueue(0, y)
    enqueue(width - 1, y)

while queue:
    x, y = queue.popleft()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height:
                enqueue(nx, ny)

removed = 0
for y in range(height):
    for x in range(width):
        index = y * width + x
        if background[index]:
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 0)
            removed += 1

image.save(dst, "PNG")
print(f"saved={dst}; size={width}x{height}; removed={removed}")
