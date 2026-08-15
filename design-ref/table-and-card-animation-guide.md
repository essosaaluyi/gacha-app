# Tilted Card Table + 3-Click Card Cycle — Technical Guide

This describes exactly how the Destiny Wars battle mockup builds its forward-tilted
card table and the deck → slots → flip animation. Give this file (plus
`table-demo.html`) to any AI or developer and they can reproduce it 1:1.

## 1. The tilted table (the part ChatGPT keeps getting wrong)

It is NOT a skewed div or a gradient trick. It is real CSS 3D, three nested layers:

```
.table-space          <- the CAMERA:   perspective: 1050px; perspective-origin: 50% 10%;
  .card-table         <- the TILT:     transform: rotateX(18deg);
                                       transform-style: preserve-3d;
                                       transform-origin: 50% 100%;   /* hinge at bottom edge */
  .table-glass        <- the SURFACE:  normal 2D styling (gold frame is padding on .card-table,
                                       teal glass is the child's background)
```

Rules that make it work:
- `perspective` goes on the PARENT, `rotateX` on the CHILD. Putting both on one
  element flattens the effect.
- `transform-origin: 50% 100%` makes the table tip AWAY from the viewer like a
  shelf, instead of spinning around its middle.
- `transform-style: preserve-3d` means every child (slots, cards, watermark)
  automatically lies on the tilted plane — no per-child math, no manual skewing.
- Keep the tilt 15–20°. More and text/cards at the far edge become unreadable.
- Gold frame = padding + gradient on `.card-table`; glass = the inner child with
  `border-radius` + `overflow:hidden`.

## 2. Card slots

Plain flex row inside `.table-glass`. They inherit the tilt for free (preserve-3d).
Each slot also sets `perspective: 600px` on itself — that is the flip camera for
the card that will land in it.

## 3. Seamless card travel (deck → slot)

The trick: traveling cards do NOT live inside the deck or the slots. They live in
one absolutely-positioned overlay covering the whole scene:

```
#cardLayer { position:absolute; inset:0; z-index:40; pointer-events:none; }
```

- To move a card anywhere, convert the target element's center into layer
  coordinates with `getBoundingClientRect()` (subtract the layer's own rect;
  divide by the page scale factor if the whole scene is `transform: scale()`d).
- Set the card's `left/top` to the start point, then on the next frame set them
  to the destination. A CSS `transition` on `left` and `top` (~0.55s,
  `cubic-bezier(.2,.85,.3,1.05)` for a slight overshoot) does the glide.
- Stagger multiple cards with `setTimeout(..., i * 130)`.
- Never re-parent a card mid-flight — that is what causes visible teleports.

## 4. The flip

Standard two-face 3D flip:

```
.pcard        { transform-style: preserve-3d; transition: transform .5s; }
.pcard .face  { position:absolute; inset:0; backface-visibility:hidden; }
.front-face   { transform: rotateY(180deg); }   /* pre-flipped, hidden at rest */
.pcard.flipped{ transform: rotateY(180deg); }   /* rotating wrapper reveals it  */
```

The parent slot's `perspective: 600px` gives the flip its depth. Add a sheen
sweep (`::after` gradient animated with translateX) on the front face when the
`flipped` class lands.

## 5. The 3-click state machine

```
phase 0  IDLE   – deck hidden INSIDE the machine (stack translated toward the
                  disk, opacity 0, pointer-events none)
click 1  SET    – add class `.set` to the deck: its stack transitions to the
                  exit position (transform: none, opacity 1)
click 2  PLACE  – spawn 3 overlay cards at the deck's center, glide each to its
                  slot (staggered), face-down; retract the now-empty stack
click 3+ FLIP   – each card is clickable once; rotateY reveals the front
next click      – remove cards, clear classes, phase back to SET (new round)
```

Guard with a `busy` flag during transitions so double-clicks can't corrupt state.

## 6. Gotchas we actually hit (save yourself the debugging)

- **Hidden deck eats clicks.** An `opacity:0` element still intercepts pointer
  events. Put `pointer-events:none` on the deck container; only the overlay
  cards get `pointer-events:auto` (via an `.interactive` class after landing).
- **Scaled scenes break coordinates.** If the whole cabinet is
  `transform: scale(s)` to fit the window, divide every getBoundingClientRect
  delta by `s` before applying it to left/top.
- **Dash-animation pulses repeat.** (For the cable glow, not the table:) SVG
  `stroke-dasharray` patterns tile; measure `path.getTotalLength()` at runtime
  and size the gap to the path length for a single-pass pulse.
- **transition on transform vs left/top.** The flip uses `transform`, the glide
  uses `left/top`. Keeping them on separate properties means a card can still
  be mid-glide styling-wise without fighting the flip transition.

## 7. For the real app (PixiJS)

In the production battle page these DOM techniques map to Pixi almost 1:1:
- table tilt        -> a Container with a projection/skew, or pre-rendered art
- overlay cardLayer -> a top-level Container; tween x/y between global positions
- flip              -> scaleX 1 → 0 (swap texture) → 1, or a 3D plane mesh
- state machine     -> identical logic, driven by the game state
