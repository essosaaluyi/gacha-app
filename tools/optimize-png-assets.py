from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_IMAGES = PROJECT_ROOT / "public" / "images"

SKIP_DIR_NAMES = {
    "references",
    "character-sheet",
}

SKIP_PATH_PARTS = {
    "characters",  # design/source archive, not currently referenced by the app
}


@dataclass(frozen=True)
class OptimizationProfile:
    quality: int
    max_width: int | None = None
    max_height: int | None = None


def profile_for(path: Path) -> OptimizationProfile:
    rel = path.relative_to(PUBLIC_IMAGES)
    parts = rel.parts
    name = path.name.lower()

    if "cards" in parts and name == "card.png":
        return OptimizationProfile(quality=82, max_width=600, max_height=900)

    if "round-inserts" in parts:
        return OptimizationProfile(quality=82, max_width=1920, max_height=1080)

    if name == "chanceicon.png":
        return OptimizationProfile(quality=85, max_width=1024, max_height=1024)

    if name in {"pack-1.png", "pack-10.png"}:
        return OptimizationProfile(quality=82, max_width=1400, max_height=1400)

    if name in {
        "static-bg.png",
        "result-bg.png",
        "home-bg.png",
        "gachabanner.png",
        "widebanner.png",
        "team-c-title.png",
        "battle-assets/bg1.png",
    }:
        return OptimizationProfile(quality=82, max_width=1920, max_height=1080)

    return OptimizationProfile(quality=82, max_width=1920, max_height=1080)


def should_skip(path: Path) -> bool:
    rel = path.relative_to(PUBLIC_IMAGES)
    parts = set(rel.parts)
    return bool(parts & SKIP_DIR_NAMES) or bool(parts & SKIP_PATH_PARTS)


def resize_to_fit(image: Image.Image, max_width: int | None, max_height: int | None) -> Image.Image:
    if not max_width and not max_height:
        return image

    width, height = image.size
    target_width = max_width or width
    target_height = max_height or height
    scale = min(target_width / width, target_height / height, 1)

    if scale >= 1:
        return image

    next_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    return image.resize(next_size, Image.Resampling.LANCZOS)


def optimize_png(path: Path, dry_run: bool) -> dict[str, str | int | float]:
    profile = profile_for(path)
    output = path.with_suffix(".webp")

    with Image.open(path) as opened:
        image = opened.convert("RGBA")
        original_width, original_height = image.size
        optimized = resize_to_fit(image, profile.max_width, profile.max_height)
        next_width, next_height = optimized.size

        if not dry_run:
            optimized.save(
                output,
                "WEBP",
                quality=profile.quality,
                method=6,
                lossless=False,
                exact=True,
            )

    original_bytes = path.stat().st_size
    output_bytes = output.stat().st_size if output.exists() else 0
    savings = 0 if not output_bytes else 1 - (output_bytes / original_bytes)

    return {
        "source": str(path.relative_to(PROJECT_ROOT)),
        "output": str(output.relative_to(PROJECT_ROOT)),
        "original_mb": round(original_bytes / 1024 / 1024, 3),
        "optimized_mb": round(output_bytes / 1024 / 1024, 3),
        "savings_pct": round(savings * 100, 1),
        "original_dimensions": f"{original_width}x{original_height}",
        "optimized_dimensions": f"{next_width}x{next_height}",
        "quality": profile.quality,
        "dry_run": str(dry_run),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Create optimized WebP copies of runtime PNG assets.")
    parser.add_argument("--dry-run", action="store_true", help="Report what would be converted without writing WebP files.")
    parser.add_argument(
        "--report",
        default=str(PROJECT_ROOT / "outputs" / "asset-optimization" / "png-webp-report.csv"),
        help="CSV report output path.",
    )
    args = parser.parse_args()

    pngs = sorted(PUBLIC_IMAGES.rglob("*.png"))
    rows = []
    skipped = []

    for path in pngs:
        if should_skip(path):
            skipped.append(path)
            continue
        rows.append(optimize_png(path, dry_run=args.dry_run))

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    with report_path.open("w", newline="", encoding="utf-8") as file:
        fieldnames = [
            "source",
            "output",
            "original_mb",
            "optimized_mb",
            "savings_pct",
            "original_dimensions",
            "optimized_dimensions",
            "quality",
            "dry_run",
        ]
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    total_original = sum(float(row["original_mb"]) for row in rows)
    total_optimized = sum(float(row["optimized_mb"]) for row in rows)
    total_savings = 0 if total_optimized == 0 else 1 - (total_optimized / total_original)

    print(f"Converted candidates: {len(rows)}")
    print(f"Skipped source/design PNGs: {len(skipped)}")
    print(f"Original candidate size: {total_original:.2f} MB")
    print(f"Optimized WebP size: {total_optimized:.2f} MB")
    print(f"Estimated savings: {total_savings * 100:.1f}%")
    print(f"Report: {report_path}")


if __name__ == "__main__":
    main()
