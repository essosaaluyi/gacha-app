Night Arena Parallax Layers
===========================

Runtime layer order:

1. 01-far-background.png / .webp
2. 02-mid-background.png / .webp
3. 03-gameplay.png / .webp
4. 04-foreground.png / .webp

Canvas size: 3200x1200 for every layer.

Notes:

- Layer 1 is opaque.
- Layers 2-4 are transparent PNG/WebP overlays.
- These were generated as separate layer assets, not sliced from one composite image.
- Keep all layers aligned from the same top-left origin at runtime.
- The gameplay layer is intentionally positioned lower so the mid-arena structures remain visible behind the playable platform.
- Use the composite preview only for review, not as a runtime asset.

Preview files:

- night-arena-parallax-composite-preview.png
- outputs/battle-backgrounds/night-arena-parallax-realistic-16x9-preview.png
- outputs/battle-backgrounds/night-arena-parallax-realistic-shift-test-16x9-preview.png
