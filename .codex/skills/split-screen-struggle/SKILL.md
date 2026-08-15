---
name: split-screen-struggle
description: Build and revise reusable 16:9 split-screen battle struggle animations with independently replaceable character layers, complementary sweep masks, a moving impact divider, synchronized particles, camera shake, echo flashes, an anticipation hold, winner reveal, and transform workstation. Use for face-off, clash, push-pull, pachislot challenge, versus, or last-blow scenes where either character must be swappable without changing the animation structure.
---

# Split Screen Struggle

Create the struggle as a deterministic layer system. Keep character art replaceable and animation controls shared.

## Asset Contract

- Use a `1920x1080` transparent PNG for every character layer.
- Keep all character pixels inside the canvas with overscan for entrance, shake, and winner movement.
- Match replacement characters to the reference layer's apparent focal length, facing direction, eye line, head position, body footprint, and visual center.
- Preserve each character's original design from its card and reference folder. Do not reuse another character's anatomy, costume, weapon, silhouette, or face.
- Generate character, divider, particles, and background as separate assets.
- Do not bake the divider, sparks, background, text, vignette, or screen effects into character PNGs.

## Layer Order

Build from back to front:

1. Shared battle background.
2. Speed or atmosphere layer.
3. Left character inside the left/player sweep mask.
4. Right character inside the complementary right/enemy sweep mask.
5. Moving impact divider.
6. Particle animation centered on the divider.
7. Winner echo copies using the exact same character image transform.
8. White flash and restrained scanline overlays.
9. Framing workstation outside the stage.

## Shared Sweep

- Drive both character masks and the divider from one sweep value.
- Make masks complementary so no character crosses the divider.
- Keep the divider aligned with the mask boundary at every frame.
- Begin with both characters entering from their outer screen edges.
- Flash once as they meet.
- Oscillate the divider left and right several times with decreasing travel.
- Hold near the center before the decisive sweep. Use eased arrival and departure to create anticipation.
- Sweep to the losing side to reveal the winner.
- Do not dim or fade half of the screen to black unless explicitly requested.

## Winner Motion And Echo

- Keep the winner at the workstation transform during the struggle.
- As the decisive sweep begins, move the winner toward center without changing scale or crop unexpectedly.
- Express winner motion as a clear transform transition, for example `x=26.5%` to `x=14%`.
- Build each echo from the same positioned character `<img>`, not from a separately centered background image.
- Apply bloom translation and scale to an outer echo wrapper so the base crop remains identical.
- Trigger one or two short echoes near the reveal, then return opacity to zero.

## Timing Guide

Use a compact pachislot rhythm:

- `0-20%`: opposing entrances and collision flash.
- `20-64%`: divider struggle and camera shake.
- `64-78%`: center hold and anticipation.
- `78-94%`: decisive sweep, winner centering, reveal flash, and echo.
- `94-100%`: clean winner frame.

Adjust total duration to the requested pacing while preserving these relative beats.

## Framing Workstation

Provide a simple non-technical editor with:

- Edit and Preview modes.
- X, Y, and Scale controls for each character.
- Slider and number input for every value.
- Per-character Undo and Reset.
- Copy Values output formatted for pasting into chat.
- Immediate live preview in Edit mode.
- Preview restart that replays the current values from frame zero.

Store accepted values as the next default transforms.

## Implementation Checks

- Verify the stage at the target aspect ratio and at responsive browser sizes.
- Confirm character canvases cover all animated positions without exposed edges.
- Confirm both masks are complementary through the entire sweep.
- Confirm the divider pauses near center before the winner reveal.
- Confirm echoes contain the same source image and base transform as the winner.
- Inspect the final computed transform to verify the winner reaches the requested center value.
- Run type checking and linting, then test one complete animation cycle in the browser.
