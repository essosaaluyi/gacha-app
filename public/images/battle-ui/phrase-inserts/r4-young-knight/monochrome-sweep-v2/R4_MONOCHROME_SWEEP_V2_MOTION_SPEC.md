# R4 Destiny Battle Selected V2 Monochrome Sweep

Status: selected motion direction
Date selected: 2026-08-05
Canvas: 1250 x 618
Preview: 30 fps
Duration: 88 intended frames / approximately 2.93 seconds

## Current review files

- `r4-monochrome-v2-selected-extended-v6.webp`
- `r4-monochrome-v2-selected-extended-keyframes-v6.jpg`

V2's horizontal bottom-to-top mask and four-frame cadence are the approved motion
language. The V4/V5 two-frame diagonal machine-gun route is rejected and retained
only for comparison.

## Registered plate pair

- Positive plate: `04-composite-positive.png`
- Negative plate: `08-composite-negative.png`

Both are complete 1250 x 618 compositions. Stack them at identical coordinates
and dimensions. Never independently scale, crop, reposition, recolor, blend, or
opacity-dissolve either plate.

## Timeline

| Frames | Stage | Direction |
| --- | --- | --- |
| 0-23 | Shard close | Close the positive plate from both sides with staggered horizontal shards. |
| 24-29 | Contact build | Animate the divider into the center. The only full-frame white flash peaks at frame 26. |
| 30-33 | Flip 1 | Reveal negative over positive from bottom to top. |
| 34-37 | Flip 2 | Reveal positive over negative from bottom to top. |
| 38-41 | Flip 3 | Reveal negative over positive from bottom to top. |
| 42-45 | Flip 4 | Reveal positive over negative from bottom to top. |
| 46-74 | Readable hold | Hold the positive plate with animated divider and black/white foil shimmer. |
| 75-87 | Exit | Break the complete composition outward and clear every insert pixel. |

Each flip lasts four frames at 30 fps, approximately 133 ms. At 60 fps, use eight
frames per flip to preserve the same real-time speed.

## V2 mask construction

- Reveal direction: straight bottom to top.
- Boundary: horizontal across the complete canvas.
- Feather: narrow 14 px smooth transition.
- Start below Y = 618 and finish above Y = 0.
- Keep completed regions fully positive or fully negative.
- Do not use a diagonal edge, broad white band, hue rotation, opacity dissolve,
  Screen/Add plate blend, or colored sweep.

## Animated energy divider

- Source: `../07-energy-divider.png`.
- Keep it above both monochrome plates and do not invert it.
- Animate twelve horizontal slices with irregular 1-5 px displacement.
- Use an eight-frame brightness cycle and a faint alternating +/-6 px echo.
- Enter during frames 24-29, remain active through frame 74, and clear with exit.

## Monochrome holographic foil

- Active asset: `09-foreground-foil-monochrome-holographic-v2.png`.
- The earlier `../08-foreground-foil.png` is source geometry only.
- Use black, silver, and white only.
- Animate a narrow reflective positive/negative shimmer through the foil during
  contact and hold.
- Do not restore blue, cyan, yellow, gold, rainbow, or prismatic color.

## Strong corner chromatic aberration

- Apply to the full 1250 x 618 upper battle screen.
- Use four feathered corner masks extending about 24% inward horizontally and
  30% inward vertically.
- Contact: 6 px red/blue channel separation.
- Four-flip burst: 11 px separation at full strength.
- Hold: visible pulsing 5-7 px separation.
- Exit: fade completely to zero.
- Green remains centered. Keep the title center and R4 facial features sharp.

## Render stack

1. `04-composite-positive.png`
2. `08-composite-negative.png`, revealed with the V2 horizontal mask
3. Animated `../07-energy-divider.png`
4. Animated `09-foreground-foil-monochrome-holographic-v2.png`
5. Full-upper-screen corner chromatic aberration

`DESTINY BATTLE` remains the approved mode title. This insert is the Player Fatal
Mode opening presentation and must not enter the attack-fakeout dialogue stack.
