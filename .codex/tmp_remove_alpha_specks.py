import sys
from collections import deque
from pathlib import Path
from PIL import Image

if len(sys.argv) != 3:
    raise SystemExit("usage: tmp_remove_alpha_specks.py INPUT OUTPUT")

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
image = Image.open(src).convert("RGBA")
pixels = image.load()
width, height = image.size
seen = bytearray(width * height)
components = []

for y in range(height):
    for x in range(width):
        index = y * width + x
        if seen[index] or pixels[x, y][3] == 0:
            continue
        seen[index] = 1
        queue = deque([(x, y)])
        points = []
        while queue:
            px, py = queue.popleft()
            points.append((px, py))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = px + dx, py + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        ni = ny * width + nx
                        if not seen[ni] and pixels[nx, ny][3] > 0:
                            seen[ni] = 1
                            queue.append((nx, ny))
        components.append(points)

removed = 0
for points in components:
    if len(points) < 100:
        for px, py in points:
            r, g, b, _ = pixels[px, py]
            pixels[px, py] = (r, g, b, 0)
            removed += 1

image.save(dst, "PNG")
print(f"saved={dst}; components={len(components)}; removed={removed}")
