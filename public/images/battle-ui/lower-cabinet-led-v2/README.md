# Lower Cabinet LED V2

Production background assets for the lower battle cabinet. The live card table remains a separate interactive layer mounted above these images.

## Runtime assets

| File | Native size | Use |
| --- | --- | --- |
| `lower-cabinet-led-on-v2.webp` | 1920 x 350 | Default powered-on background with neutral white LED illumination. |
| `lower-cabinet-led-off-v2.webp` | 1920 x 350 | Powered-off background with the same geometry and subtly visible artwork. |
| `lower-cabinet-led-on-v2.png` | 1920 x 350 | Lossless ON master. |
| `lower-cabinet-led-off-v2.png` | 1920 x 350 | Lossless OFF master. |

## Placement

- Mount the background at `x: 0`, `y: 0` inside the existing 1920 x 350 lower cabinet region.
- Render the existing live table above it at the current centered 1120 px mounting width.
- Keep cards, holders, landing effects, and hit targets in the live table layer; none are baked into the runtime LED assets.
- Crossfade ON/OFF assets without moving or rescaling them. Their silhouettes and engravings are pixel-aligned.
- The left and right panels use opposite halves of the title-page key art. `DESTINY WARS` is a small engraved cabinet mark, not gameplay text.

## Review files

- `lower-cabinet-led-on-v2-with-table-preview.png`: ON-state composite using the current table transform.
- `lower-cabinet-led-off-v2-with-table-preview.png`: OFF-state composite using the current table transform.
- `lower-cabinet-led-v2-concept-sheet.png`: original two-state visual direction sheet.
- `lower-cabinet-led-on-v2-source.png`: uncropped generation source; do not use at runtime.

The preview composites are review references only and must not replace the interactive table assembly.
