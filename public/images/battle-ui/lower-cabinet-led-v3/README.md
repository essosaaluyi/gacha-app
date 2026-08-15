# Lower Cabinet LED V3

Separated production layers for the 1920 x 350 lower battle deck. The inner edges of the side layers overlap the live table mount, so their crop boundaries remain hidden during scaling and LED transitions.

## Layer order

1. `lower-cabinet-center-bridge-v3.webp`
2. `lower-cabinet-led-left-off-v3.webp`
3. `lower-cabinet-led-right-off-v3.webp`
4. `lower-cabinet-led-left-on-v3.webp`
5. `lower-cabinet-led-right-on-v3.webp`
6. `card-table-premium-three-bay-center-only-1120x420.webp`
7. Live Pixi holders, cards, effects, and hit targets

Every LED layer uses a transparent 1920 x 350 canvas and mounts at `x: 0`, `y: 0`. The table mounts separately at `x: 380`, with a native width of 1120 px. The existing DOM depth transform remains responsible for the 60-degree presentation angle.

## State logic

- OFF layers and the center bridge are always present.
- ON layers fade out together when `data-led-state="off"` is applied to the deck.
- The two ON layers can be recolored or animated independently in future without touching the table or the opposite LED panel.

## Review files

- `lower-cabinet-led-v3-on-layered-preview.png`
- `lower-cabinet-led-v3-off-layered-preview.png`

The preview images are flattened review composites only. Do not use them at runtime.
