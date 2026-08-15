# R4 Destiny Battle Monochrome Sweep V2

Canvas: 1250 x 618

This revision replaces the colored holographic wash with two complete monochrome
plates. The positive and inverted plates share identical registration and are
alternated by the selected horizontal bottom-to-top mask.

Selected motion direction: V2 horizontal four-frame sweep, combined with the
animated divider, monochrome foil, strong corner aberration, and extended
2.93-second presentation.

Two approved transparent color accents from the parent folder remain above the
plate pair:

- `../07-energy-divider.png`
- `../08-foreground-foil.png`

The active foil render is `09-foreground-foil-monochrome-holographic-v2.png`.
The parent blue/yellow foil is retained only as source geometry.

## Plate layers

1. `01-background-positive.png`
2. `02-title-destiny-battle-positive.png`
3. `03-character-positive.png`
4. `04-composite-positive.png`
5. `05-background-negative.png`
6. `06-title-destiny-battle-negative.png`
7. `07-character-negative.png`
8. `08-composite-negative.png`

## Motion rule

- Close the positive plate from both sides as staggered shards.
- Use the full-frame white flash only at center contact.
- Stack `08-composite-negative.png` over `04-composite-positive.png`.
- Reveal the top plate horizontally from bottom to top.
- Use a narrow 14 px smooth feather.
- Complete each reveal in four frames at 30 fps.
- Swap plate order and repeat immediately.
- Run four alternating sweeps, then hold the positive plate.
- Animate `../07-energy-divider.png` with segmented electrical jitter above both
  plates; it does not invert with them.
- Animate a black/white reflective shimmer through
  `09-foreground-foil-monochrome-holographic-v2.png`.
- Use strong, clearly visible chromatic aberration at the four corners of the
  full 1250 x 618 upper battle screen, then clear it on exit.
- Do not add hue rotation, rainbow color, or a broad white sweep after contact.

## Outputs

- `r4-monochrome-v2-selected-extended-v6.webp` - current selected animation preview
- `r4-monochrome-v2-selected-extended-keyframes-v6.jpg` - current review sheet
- `r4-monochrome-diagonal-animated-divider-bwfoil-strong-ca-v5.webp` - rejected diagonal comparison
- `r4-monochrome-diagonal-animated-divider-bwfoil-strong-ca-keyframes-v5.jpg` - rejected V5 review sheet
- `09-foreground-foil-monochrome-holographic-v2.png` - current foil asset
- `r4-monochrome-diagonal-soft-machinegun-v4.webp` - superseded short-duration preview
- `r4-monochrome-diagonal-soft-machinegun-keyframes-v4.jpg` - superseded V4 review sheet
- `r4-monochrome-mask-sweep-energy-foil-ca-v3.webp` - superseded horizontal preview
- `r4-monochrome-mask-sweep-energy-foil-ca-keyframes-v3.jpg` - superseded horizontal sheet
- `r4-monochrome-plate-comparison.jpg`
- `r4-monochrome-mask-sweep-v2.webp` - superseded pre-accent comparison
- `r4-monochrome-mask-sweep-keyframes-v2.jpg` - superseded pre-accent comparison

Rebuild with:

- `tools/build-r4-monochrome-sweep-v2.py`
- `tools/build-r4-monochrome-sweep-motion-v2.py`
