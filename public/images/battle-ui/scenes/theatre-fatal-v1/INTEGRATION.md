# Theatre Fatal v1 — integration notes

## Outcome

This package supplies three original, exact-text SVG scene inserts for the existing 1920×1080 cabinet and its 1250×618 battle viewport. It changes presentation only. Do not add or alter battle resolution rules, counters, fatal conditions, round state, or rewards.

The inserts borrow broad visual principles from Japanese theatrical pachislot presentation—act naming, a single dominant title lockup, mechanical proscenium geometry, and high-contrast state colors—without copying a protected logo, character image, or exact machine artwork.

## Scene map

| Existing presentation event | Asset | Placement in sequence |
| --- | --- | --- |
| First daytime field reveal | `scene-day-field-souten-senya-v1.svg` | Play after the black battle cover releases and before the first interactive draw. Title: **BLUE VAULT** (Azure-Sky Battlefront). |
| `battleState === "playerDefeated"` transition | `scene-player-fatal-meimyaku-danzetsu-v1.svg` | Play once for 820ms, then reveal the existing continue plaque. Title: **LIFELINE CUT** (life-thread severed). |
| `enemyDefeatPresentationKey` increments | `scene-enemy-fatal-shuumaku-shikkou-v1.svg` | Play once for 820ms over the defeat beat; keep the current enemy-shard presentation underneath. Title: **FINAL CURTAIN** (final act executed). |

Consume the existing stores/events only. A presentational `BattleSceneInsert` component may derive its scene from those values, but it must not write back to them. Use a local timer only to hide the insert.

## Runtime placement

Assets in `public` are addressed from the site root. Render the selected public path in an absolutely positioned wrapper inside `.battle-cabinet-screen`:

```tsx
<div className={`battle-scene-insert battle-scene-insert-${scene}`} role="status">
  <img src={SCENE_ART[scene]} alt="" aria-hidden="true" />
  <span className="sr-only">{SCENE_LABEL[scene]}</span>
</div>
```

```css
.battle-scene-insert {
  position: absolute;
  inset: 0;
  z-index: 9997;
  overflow: hidden;
  pointer-events: none;
  isolation: isolate;
}

.battle-scene-insert > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

The SVG coordinate system already matches the 1250×618 battle screen. Do not place it against the full 1920×1080 stage or the lower card table. Keep the persistent HUD under the insert; do not separately hide/reflow it.

## Motion prescription

The static SVG is the art source. Motion belongs in CSS so every scene uses the same timing system.

- Day-field insert, 980ms: veil in 0–120ms; title settles from `scale(.91)` to `scale(1)` over 180ms; hold to 780ms; 200ms wipe/fade out.
- Player Fatal, 820ms: 80ms crimson ignition; 160ms overshoot `scale(1.08)` to `scale(1)`; 410ms hold; 170ms horizontal collapse/fade.
- Enemy Fatal, 820ms: 90ms cyan-white glint; 170ms settle; 390ms hold; 170ms upward curtain wipe.
- Animate the wrapper with opacity/clip-path and the image with transform. Never shake the full cabinet.
- Under `prefers-reduced-motion: reduce`, use a 140ms opacity in, 500ms hold, and 140ms opacity out with no scale, shake, or clip-path movement.

The current `RoundInsert` auto-hides after 1900ms. These scene inserts should be faster and should not inherit that duration.

## Low enemy-attack counter: escalation without a new asset

The counter is currently a 70×70 footprint with a 66px `rift-fang` digit. Preserve that layout box so the centered screen composition cannot jump. Add presentation derived from the existing numeric value:

| Counter | Treatment |
| --- | --- |
| 4+ | Digit only; existing subtle red drop-shadow, no pulse. |
| 3 | Add a 96px radial aura behind the digit at 12% opacity; breathe once every 1600ms. |
| 2 | Show the existing `enemy-threat-ring-frame-v1.png` at 92px, 68% opacity; aura peaks at 26%; 920ms pulse. |
| 1 | Ring at 100% opacity; 104px red-to-white aura peaks at 42%; 520ms pulse. Fire one 90ms white ignition only when the value changes to 1. |
| 0 / held | Freeze the pulse, lower saturation to 55%, and keep the number legible. Do not imply another attack. |

Use two pseudo-elements: `::before` for the reusable ring image and `::after` for a CSS radial-gradient aura. Cap visual overflow to 104px. Avoid perpetual screen shake, particles over the roadmap, and any hue other than crimson/white; cyan remains reserved for current/progress information.

## Compact points plaque spacing

Reuse `points-plaque-frame-v1.png`; a replacement bitmap is unnecessary.

- Width: **196px** (from 218px), retaining `aspect-ratio: 1572 / 595`.
- Content inset: **16% 9.5% 15% 11.5%**.
- Total row: grid columns `auto minmax(0, 1fr) auto`, `column-gap: 1px`, vertically centered.
- Label: 9px, `.09em` tracking. Digits: 30px high. Unit: 10px.
- Earned row: 8.5px, `column-gap: 3px`, no extra top margin.
- Keep the digit strip right-aligned and tabular. Test at 0, 999, 9,999, and 999,999 points. Never reduce the digit height below 27px; if overflow occurs, scale the digit strip uniformly from its right edge.

This saves roughly 22px of horizontal space while preserving the existing black/gold/cyan cabinet material language.

## Seven-node roadmap digit centers

The production frame is 1966×232. Pixel inspection of the seven inner node wells gives these exact horizontal centers:

```ts
const RAIL_STATION_CENTERS = [
  12.818,
  25.305,
  37.640,
  49.975,
  62.335,
  74.695,
  87.080,
] as const;
```

Set each station's `left` value from `RAIL_STATION_CENTERS[index]` rather than the current arithmetic progression. The present `12.8 + index * 12.52` drifts progressively right and leaves node 7 about 0.84 percentage points off-center.

Center the digit strip independently of the fill disk:

```css
.battle-progress-station-label {
  position: absolute;
  left: 50%;
  top: 50%;
  height: 36%;
  transform: translate(-50%, -50%);
  transform-origin: center;
}
```

Keep `.battle-progress-station { transform: translate(-50%, -50%); }`. Anchor `NOW` to the station center, not to the width of the digit image.

## Visual QA checklist

- Verify at the canonical 1920×1080 cabinet and at a 1366×768 viewport after stage scaling.
- Scene title remains inside x=160–1090 and y=170–470 of the 1250×618 battle screen.
- The Japanese title is readable in under 300ms and does not overlap the lower card table.
- Player Fatal precedes—not replaces—the continue decision UI.
- Enemy Fatal cannot fire on a non-defeating hit and does not delay battle resolution.
- Counter aura never obscures roadmap digits or game counter.
- Points plaque has no clipped six-digit value.
- All seven roadmap digits sit visually in the centers of the dark circular wells.

## Research basis

- SANKYO’s machine collection describes named theatrical phases including its interlude-chance, fated-act and puppet-dance phases, supporting act/curtain language rather than generic “LEVEL” chrome: https://www.sankyo-fever.jp/collection/946/
- SANKYO’s current developer notes continue the mechanical/theatrical naming system and use “gear” language in official editorial framing: https://www.secret-story.sankyo-fever.jp/product/swl
- Reference captures of its fated-act phase show the broad presentation pattern of a centered Japanese title, black/gold mechanical framing, a high-contrast radial burst, and a short subtitle line: https://nana-press.com/kaiseki/machine/571/15697/
- Reference captures of the preparation screen show a fast horizontal red announcement band layered over character drama: https://pachiseven.jp/machines/6744/cutout/1016

These are visual-language references only. This package deliberately replaces recognizable circus branding, characters, logos, and exact gear/filigree layouts with original fantasy-cabinet geometry already native to this app.
