# R4 Monochrome Soft Diagonal Machine-Gun Sweep V4

Status: rejected diagonal comparison; superseded by selected V2 motion
Date: 2026-08-05
Canvas: 1250 x 618
Preview: 30 fps

Current authority: `R4_MONOCHROME_SWEEP_V2_MOTION_SPEC.md`

## Changes

- The reveal boundary is diagonal instead of horizontal.
- It rises from bottom-left toward top-right.
- The mask uses a 105 px smooth feather instead of a hard 14 px edge.
- Each complete positive/negative flip takes two frames instead of four.
- Four flips complete in eight frames, approximately 267 ms at 30 fps.

## Burst timing

| Frames | Reveal |
| --- | --- |
| 15-16 | Positive to negative |
| 17-18 | Negative to positive |
| 19-20 | Positive to negative |
| 21-22 | Negative to positive |

At 60 fps, use four frames per reveal to preserve the same real-time speed.

## Mask rule

- Stack the two complete registered plates without blending them together.
- Move one diagonal grayscale mask across the full frame.
- Use a steep 360 px rise across the canvas so the slash is visibly diagonal.
- Feather only the moving boundary; keep the completed regions fully revealed.
- Preserve the fixed divider, foil, and restrained corner aberration above both plates.
- Do not turn the soft edge into a broad white light band.
