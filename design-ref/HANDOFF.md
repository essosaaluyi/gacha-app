# HANDOFF — Battle Cabinet Implementation (/battle DOM/CSS shell)

## Mission
Implement the approved "premium pachislot cabinet" design for the `/battle` page,
replacing the current loose DOM layout (floating Quit button, oversized Battle Log,
clipped DATA tab, black voids). The PixiJS battle stage itself is NOT touched —
it mounts unchanged into the cabinet's screen opening.

**Design authority:** `design-ref/battle-cabinet-v8.html` is the approved mockup.
When this document and the mockup disagree, the mockup wins for visuals; this
document wins for architecture. `design-ref/table-and-card-animation-guide.md`
explains every animation technique with rationale.

## Hard constraints
- Dev server already runs on :3000 — NEVER start a second one.
- Do not modify the Pixi stage internals, game logic, or battle resolution.
- Do not scan the 2GB+ assets directory; only touch files listed below.
- All tunable values (timings, offsets, tilt angle, stagger ms) go through
  patchConfig / admin so they stay editable without code changes.
- Desktop-first: cabinet is a fixed 1920×1080 design that scales to fit.

## Asset inventory (copy from design-ref/assets/ into the app's public assets)
| Asset | File | Usage |
|---|---|---|
| Disk (card holder) | card-holder.png (560×600, alpha) | DRAW console body, bottom-left |
| DRAW button cap | draw-button.png (189×190, alpha) | seats at disk center, 196px @ scale .71 |
| Memory board | memory-board source PNG (1024×1536) | left panel background (cover) |
| Statue | statue source PNG (alpha) | LED-panel niche, right side |
| Corner ornaments | corner_trim.png | 4 cabinet corners, 150px, CSS-flipped |
| Trim bar | trim_bar.png | top bezel, left:924 top:25, 560px wide |
| Speaker grille | grille_wide.png | bottom of right LED panel, 210px |
| Deck faceplate texture | crop of faceplate render | lower deck background (cover + dark overlay) |
NOTE: the mockup embeds downscaled base64 copies; use the ORIGINAL uploads for
production and build them into the texture/WebP pipeline later (separate milestone).

## Layout spec (1920×1080 cabinet, scale = min(vw/1920, vh/1080))
- Cabinet: dark gunmetal gradient + faint vertical brushing; gold edge rails
  (2px gradient lines) inset 40px on all four edges; corner ornaments at exact 0,0.
- Top bezel row (y≈24): QUIT (service-button style, left), BGM + Volume icon
  buttons (right). These replace the old floating red Quit and bottom-bar audio controls.
- Left panel (40,88, 266×618): memory board image; SVG overlay carries three
  cable-glow paths + idle LED dots + glass-flare divs (see animation spec).
- Screen frame (330,88, 1250×618): metal bezel + gold pinline; the Pixi canvas
  mounts inside at 1280×720 scaled to fit the opening.
- Right LED panel (right:40, 88, 266×618): gold DESTINY WARS logotype (Cinzel),
  amber dot-matrix ticker (Battle Log lives HERE now — Share Tech Mono, scanline
  overlay, max 8 lines, newest appended), DATA switch, statue niche (150px, idle
  bob + cheer/glow on wins), speaker grille at bottom.
- Lower deck (y 730→1080): faceplate texture background.
  - Disk: left:-8 top:-60 (deck-relative) scale 1.03, z 16.
  - DRAW button: left:81 top:25 scale .71, z 18. Ring-flare element pinned to
    the same coords, z 17 (invisible at rest).
  - Deck pile: left:216 top:29 (aligned to the disk's exit-gate centerline),
    136×198 portrait container, stack rotated 90° (cards horizontal), z 14,
    pointer-events:none.
  - Card layer: absolute inset-0 overlay, z 15 (BELOW disk, ABOVE table).
  - Card table: left:430 top:6, 1010×344; perspective 1050 on parent,
    rotateX(18deg) + preserve-3d + origin 50% 100% on child; gold frame padding,
    teal glass inner; 3 slots (136×198, 48px gap) + watermark. z 12.
  - Player hand: bottom-right, 3 fanned placeholder cards (176×256), z 18.
    (Hand mechanics TBD — render as static display for now.)
  - AUTO pill: below/near disk, gold-fill when active.

### Z-order table (critical, was a bug source)
table 12 < deck pile 14 < card layer 15 < disk 16 < ring 17 < DRAW/hand 18

## Interaction spec — the 3-click cycle (state machine)
phase 0 IDLE: deck hidden — each back card translated toward the disk along the
  rotated stack's local axis, opacity 0. Deck container pointer-events:none ALWAYS.
click 1 SET: backs slide straight out (NO rotation change — they are pre-rotated
  90°) to the exit gate, staggered per card: transition-delay 0 / .13s / .26s,
  landing at rightward offsets -16/-8/0 (local translateY negatives).
click 2 PLACE: for each slot i: spawn a traveling card at the EXACT center of
  deck twin i (getBoundingClientRect ÷ page scale), spawned horizontal
  (rotate 90°), then add class 'consumed' to the pile (backs fade IN PLACE,
  no retract). Stagger departures 80+i*140ms; each card glides (left/top
  transition .55s) and rotates upright (90°→0°) in flight; on landing gains
  .interactive + slot contact shadow.
click 3+ FLIP: each landed card clickable once; rotateY(180) two-face flip
  (backface-visibility hidden; front face pre-rotated), sheen sweep on reveal.
  When all flipped → phase 3.
next click: full reset → SET again (new round).
Guard all transitions with a busy flag.

## Cable pulse (DRAW feedback)
Three SVG paths traced along the memory-board art's gold pipes (paths are data —
copy the `d` attributes from the mockup verbatim). Single-pass pulse:
measure `path.getTotalLength()` at runtime, strokeDasharray = `70 ${len+70}`,
animate strokeDashoffset from -len to 70 (bottom→top: energy flows from the
button up into the board), 1050ms, 70ms stagger, opacity 0 on finish.
Plus: ring flare on button, glass-window flares (delay .35s), link-glow
segment between disk and board, statue cheer + gold glow, ticker log line.
All fire together on DRAW via a transient `energize` class on the cabinet root.

## Implementation phases
1. **Static shell** — cabinet frame, panels, assets, z-order; Pixi canvas
   remounted into the screen opening; old Quit/log/audio-bar removed.
   Verify: screenshot diff vs mockup idle state.
2. **State machine + animations** — 3-click cycle, cable pulse, statue states,
   ticker. Drive from mock events first.
   Verify: Playwright walk of set/place/flip states (the mockup's verification
   scripts in design-ref can be adapted).
3. **Wire to real game state** — DRAW connects to the actual draw action; ticker
   consumes real battle-log events; card faces render real card data (art +
   rarity); reveal color-coding by rarity (blue R / purple SR / gold SSR /
   rainbow UR) on cables + flares.
4. **Config + polish** — expose timings/tilt/stagger in patchConfig; reduced-
   motion support (already in mockup CSS); performance pass (will-change on
   traveling cards, no layout thrash).

## Known open items (do NOT solve in this milestone)
- Hand-card mechanics undecided — hand is visual-only for now.
- Real card frames/back art per rarity — placeholder CSS cards until generated.
- Non-battle pages design language — separate milestone.
- Texture atlas / lazy-loading pipeline — separate milestone (existing plan).
