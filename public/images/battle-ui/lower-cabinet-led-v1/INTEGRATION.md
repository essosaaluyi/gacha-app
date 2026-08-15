# Lower Cabinet LED v1 — production integration

## Intent

Replace the current generic `deck-faceplate.jpg` background with a powered-on pachislot lower panel that remains subordinate to the Draw button, card table, Pixi canvas, and player hand.

The source canvas is exactly **1920×350**, matching `.bcab-deck` at stage coordinates **x=0, y=730, width=1920, height=350**. Both states share identical geometry, so switching illumination cannot cause layout movement.

## Assets

- `lower-cabinet-led-on-v1.svg` — preferred normal-state source.
- `lower-cabinet-led-on-v1.png` — 1920×350 raster fallback.
- `lower-cabinet-led-blackout-v1.svg` — powered-off guaranteed-win signal.
- `lower-cabinet-led-blackout-v1.png` — 1920×350 raster fallback.

Use SVG by default. PNG exists for renderers that show SVG filter differences or when a single decoded texture is preferable.

## Exact DOM placement

Insert the background as the **first child** of `.bcab-deck`, before `.bcab-card-layer`, the draw well, table, and player hand:

```tsx
<div className={`bcab-deck ${guaranteedWinBlackout ? "bcab-deck-blackout" : ""}`}>
  <div className="bcab-lower-led-panel" aria-hidden="true">
    <img
      className="bcab-lower-led-state bcab-lower-led-state-off"
      src="/images/battle-ui/lower-cabinet-led-v1/lower-cabinet-led-blackout-v1.svg"
      alt=""
    />
    <img
      className="bcab-lower-led-state bcab-lower-led-state-on"
      src="/images/battle-ui/lower-cabinet-led-v1/lower-cabinet-led-on-v1.svg"
      alt=""
    />
  </div>

  {/* Existing card layer, draw assembly, table, Pixi mount, and hand stay unchanged. */}
</div>
```

Keep the off asset mounted under the on asset. Blackout then removes illumination without producing an empty frame between image decodes.

```css
.bcab-deck {
  background: #030405;
}

.bcab-lower-led-panel {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}

.bcab-lower-led-state {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
}

.bcab-lower-led-state-off {
  z-index: 0;
}

.bcab-lower-led-state-on {
  z-index: 1;
  opacity: 1;
  transition: opacity 70ms linear;
}

.bcab-deck-blackout .bcab-lower-led-state-on {
  opacity: 0;
}

.bcab-deck::before {
  z-index: 1;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, .16),
    rgba(0, 0, 0, .03) 34%,
    rgba(0, 0, 0, .14)
  );
  pointer-events: none;
}
```

The existing table is z=12, card-travel layer z=15, draw well z=16, and controls/hand z=18. Do not raise the panel above z=1.

### Letting the center plate read through the table glass

The title plate occupies x=734–1186 and y=238–350, below the primary card-content band. If the current opaque `.bcab-table-glass` hides it entirely, retain the existing gradients but reduce their opacity rather than moving the title:

```css
.bcab-table-glass {
  background:
    radial-gradient(ellipse at 30% 0%, rgba(255,255,255,.09), transparent 45%),
    repeating-linear-gradient(60deg, rgba(77,232,210,.025) 0 2px, transparent 2px 26px),
    linear-gradient(180deg, rgba(20,65,59,.78), rgba(12,39,36,.82) 70%, rgba(8,27,24,.86));
}
```

Do not add a second title above the Pixi mount. The integrated plate should behave like a cabinet watermark, not a foreground banner.

## Guaranteed-win blackout

The blackout is a silent, presentation-only pre-result cue. It must not determine, modify, reroll, or delay the result.

Recommended timeline:

1. The existing draw/reveal pipeline resolves that the pull is guaranteed to win.
2. Before the result becomes visible, set `guaranteedWinBlackout = true`.
3. The on layer drops out in **70ms**; keep the off state visible for **580ms**.
4. At **650–720ms**, begin the existing result reveal and restore the on layer.
5. Do not play an additional sound, shake the cabinet, flash the upper battle screen, or disable controls beyond the lock already owned by the presentation flow.

Use **720ms** by default. The approved range is **500–900ms**. A longer blackout stops feeling like an intentional pre-result signal and starts reading as a rendering fault.

If the resolved result currently has no presentation signal, add a UI-only event at the existing point where the winning result is already known:

```ts
window.dispatchEvent(
  new CustomEvent("battle:guaranteed-win-blackout", {
    detail: { durationMs: 720 },
  })
);
```

The listener may own a local timer and CSS class only. It must not write to battle state, rarity selection, points, or reward stores. Clear its timer on unmount and when a new battle run resets.

For `prefers-reduced-motion: reduce`, keep the 650–720ms dark hold but make the on-layer opacity change instantaneous. The cue is a state change, not decorative motion.

## Safe content window

The art was composed around existing live elements:

- **Draw assembly:** x=0–390, full height. No bright emblem or high-frequency ornament is placed here.
- **Live table/card focus:** x=420–1500, y=52–240. This remains dark glass with only low-opacity circuitry and silhouettes.
- **Player hand:** x=1500–1920, y=28–350. Side circuits remain low contrast behind the hand.
- **Title plate:** x=734–1186, y=238–350. It sits below the main card-reading band and should remain watermark-level.

Do not scale the background independently from `.bcab-deck`. Both must remain at 1920:350 or the keyed windows will drift toward the Draw and hand zones.

## Visual behavior

- Powered on: teal indicates an armed/ready circuit; amber and gold remain structural cabinet accents.
- Blackout: all emitted light is removed, while bevels, glass reflections, circuit routes, fasteners, and the title emboss remain visible.
- Fantasy silhouettes are etched at under 10% opacity and should never compete with live character/card art.
- No idle animation is required in the SVG. If desired, animate only the on-layer opacity between `.96` and `1` over 3.4 seconds; do not chase individual LEDs or animate the entire background position.

## QA checklist

- Test at the canonical 1920×1080 stage and a scaled 1366×768 viewport.
- Draw button remains the brightest circular control in the left region.
- Card faces and rarity colors remain more saturated than the panel.
- Player hand silhouettes remain readable at the right edge.
- Blackout retains the frame geometry but contains no visible cyan/amber emission.
- On/off assets align pixel-for-pixel with no shift during crossfade.
- Blackout fires only for a result already resolved as guaranteed and never on ordinary draws.
- No state timer remains active after route change, battle reset, or component unmount.

## Production method and rights

The panels were authored as original SVG UI artwork and the PNG files were rendered directly from those sources. No AI-generated raster imagery was used because exact safe-area geometry and state-to-state registration are more important here than painterly detail. No protected pachislot logo, named character, or exact ornamental composition is included.
