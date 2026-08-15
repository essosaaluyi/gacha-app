# R4 Destiny Battle Animated Divider and Monochrome Foil V5

Status: rejected diagonal comparison; superseded by selected V2 motion
Date: 2026-08-05
Canvas: 1250 x 618
Preview: 30 fps
Duration: 88 frames / approximately 2.93 seconds

Current authority: `R4_MONOCHROME_SWEEP_V2_MOTION_SPEC.md`

## Archived V5 preview

- `r4-monochrome-diagonal-animated-divider-bwfoil-strong-ca-v5.webp`
- `r4-monochrome-diagonal-animated-divider-bwfoil-strong-ca-keyframes-v5.jpg`

## Timeline

| Frames | Stage | Direction |
| --- | --- | --- |
| 0-23 | Shard close | Close the positive plate from both sides with staggered horizontal shards. |
| 24-29 | Contact build | Animate the divider into the center and create the sequence's only full-frame white flash on frame 26. |
| 30-31 | Flip 1 | Positive to negative with the V4 diagonal mask. |
| 32-33 | Flip 2 | Negative to positive with the V4 diagonal mask. |
| 34-35 | Flip 3 | Positive to negative with the V4 diagonal mask. |
| 36-37 | Flip 4 | Negative to positive with the V4 diagonal mask. |
| 38-74 | Readable hold | Hold the positive plate while the divider flickers and the black/white foil shimmer travels. |
| 75-87 | Exit | Break the complete composition outward and clear every insert pixel. |

The four flips remain an eight-frame burst, approximately 267 ms at 30 fps. Do
not slow the individual flips to create the longer duration. At 60 fps, double
all frame counts while preserving the same real-time speed.

## Asset: Animated Energy Divider

- Asset name: R4 Destiny Battle Animated Energy Divider
- Purpose: Keep the center split electrically alive during contact, inversion,
  and the extended readable hold.
- Prompt: White-cyan vertical electrical tear, rapidly changing branch lengths,
  segmented horizontal displacement, irregular brightness pulses, narrow center
  silhouette, Japanese battle-machine motion graphic energy.
- Negative prompt: Static sticker, broad light column, rainbow lightning, soft
  fog, full-screen glow, slow breathing only, horizontal beam.
- Aspect ratio: 1250:618 full-canvas registration.
- Background requirement: Transparent alpha; no opaque black backing.
- Filename: `../07-energy-divider.png` is the registered source layer.
- Developer notes: Animate twelve horizontal slices with alternating 1-5 px
  displacement, an eight-frame brightness cycle, and a faint offset echo. Keep
  the divider above both monochrome plates and do not invert it with the mask.

## Asset: Monochrome Holographic Foreground Foil

- Asset name: R4 Destiny Battle Black/White Holographic Foil
- Purpose: Frame R4 with a premium reflective accent without restoring the
  rejected cyan/yellow foil palette.
- Prompt: Pure monochrome engraved foil flames, black, silver, and white only,
  hard reflective facets, alternating positive and negative shimmer, crisp
  transparent game-overlay linework.
- Negative prompt: Blue, cyan, yellow, gold, rainbow, prismatic color, warm tint,
  colored bloom, opaque background.
- Aspect ratio: 1250:618 full-canvas registration.
- Background requirement: Transparent alpha.
- Filename: `09-foreground-foil-monochrome-holographic-v2.png`.
- Developer notes: The earlier `../08-foreground-foil.png` is source geometry
  only. Use the corrected monochrome file in the active render stack. Animate a
  narrow diagonal black/white reflective band through the foil; never hue-rotate.

## Strong Corner Chromatic Aberration

- Scope: Full 1250 x 618 upper battle screen.
- Coverage: Four corner masks extending approximately 24% inward horizontally
  and 30% inward vertically, with smooth falloff toward the center.
- Contact: 6 px radial red/blue separation.
- Flip burst: 11 px radial red/blue separation at full strength.
- Hold: Visible 5-7 px pulsing separation.
- Exit: Fade to zero with the outward break.
- Green remains centered. Red and blue separate in opposing radial directions.
- Keep the central title and R4 facial features sharp and free of a persistent
  RGB outline.

## Render Stack

1. `04-composite-positive.png`
2. `08-composite-negative.png`, revealed with the registered diagonal mask
3. Animated `../07-energy-divider.png`
4. Animated `09-foreground-foil-monochrome-holographic-v2.png`
5. Full-upper-screen corner chromatic aberration

The positive and negative plates remain pixel-registered. Do not independently
scale, crop, reposition, recolor, or opacity-dissolve either plate.
