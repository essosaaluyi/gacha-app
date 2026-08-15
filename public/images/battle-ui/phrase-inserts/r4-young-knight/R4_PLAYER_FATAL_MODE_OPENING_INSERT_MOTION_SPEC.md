# R4 Young Knight Player Fatal Mode Opening Insert Motion Spec

Status: superseded legacy direction; do not implement
Date: 2026-08-04
Canvas: 1250 x 618
Target playback: 60 fps
Target duration: 72 frames / 1.20 seconds

This document is retained only to identify the discarded colored holographic
prototype. The current authority is:

`monochrome-sweep-v2/R4_MONOCHROME_SWEEP_V2_MOTION_SPEC.md`

Do not use the colored foil sweep, additive layer stack, central energy divider,
or timing instructions below in production.

## Scope

This is the 1G opening insert that announces entry into the player's Fatal Mode. It
is not an attack-fakeout dialogue box and must not be mounted in the normal attack
fakeout sequence.

The insert is a temporary overlay. The battle layout remains unchanged underneath
and must return cleanly after frame 57.

The display title is `DESTINY BATTLE`. It is a mode title rather than spoken
character dialogue.

The supplied portrait is approved for motion timing only. Before final production,
bring the portrait closer to the approved R4 character sheet:

- Short blond hair with a clear low side fade and compact swept top.
- Avoid a curly or ringlet-like silhouette.
- Slightly sharper warrior eyes and brow; youthful without becoming overly cute.
- Slim young-warrior proportions.
- Smooth silver armor panels with restrained gold trim matching the approved sheet.

Primary identity references:

- `public/images/cards/player/R4/references/young-knight-character-sheet-top-v8.png`
- `public/images/cards/player/R4/references/young-knight-front-style-variation-03.png`
- `public/images/cards/player/R4/references/Sosa_Studio_high-detail_digital_fantasy_art_ultra_clean_rende_3952f7fd-47b0-4e7a-bb76-320c6dddf569_0.png`

## Layer Stack

Back to front:

1. `01-background-plate.png`
2. `02-text-shadow-depth.png`
3. `03-text-ghost-depth.png`
4. `04-text-main-destiny-battle.png`
5. `05-character-echo.png`
6. `06-character-coated.png`
7. `07-energy-divider.png`
8. `08-foreground-foil.png`

Keep every layer registered to the full 1250 x 618 canvas. Scale the complete group
uniformly. Do not independently reflow or crop layers for mobile.

## Motion Timeline

| Frames | Stage | Direction |
| --- | --- | --- |
| 0-17 | Shattered-door close | Split the complete insert into staggered horizontal and diagonal plate shards. Left shards close from off-screen left; right shards close from off-screen right. Each shard lands 1-2 frames apart with no bounce. |
| 18 | Center contact | Both halves meet on the energy-divider axis. Add a one-frame hard impact and a narrow white center line. |
| 18-22 | Huge flash | White-out the full frame rapidly, peaking on frames 19-20. Retain only faint black title and portrait silhouettes at peak exposure. |
| 21-37 | Holographic inversion waves | Send three fast bands from bottom to top. Inside each band, flip black to white and white to black, then restore. Offset the bands by 4-5 frames so the surface flickers like foil rather than one slow wipe. |
| 23-42 | Broad foil sweep | A wide cyan-white holographic reflection rises with the inversion bands. It may cross the title, face, armor, frame, and divider as one unified material response. |
| 28-46 | Asset lock | Resolve the title, chest-shot portrait, oversized foil frame, and glints into their final colors. Character echo settles below 35% opacity. |
| 47-62 | Readable hold | Keep `DESTINY BATTLE` still and fully readable. Pulse only the largest glints and energy divider. |
| 63-71 | Clear | Break the two plate halves outward faster than their entrance. Divider and final center glint clear last. |
| 72 | Battle return | No insert pixel remains. Return to the unchanged battle layout. |

At 30 fps, use the same timing in seconds and halve frame numbers. Preserve the
one-frame separation between shadow, ghost, and main text where possible.

## Text Treatment

All three title planes must use `DESTINY BATTLE` with identical registration:

- Shadow: hard black depth, 55-70%, no colored glow.
- Ghost: low-opacity steel duplicate, offset up-left by approximately 8-12 px.
- Main: raised metallic face with a crisp dark keyline.

Conditional anticipation color remains required:

| Tone | Main text face / inner keyline | Divider fringe |
| --- | --- | --- |
| White | `#F8FAFC` | White-cyan |
| Blue | `#008FE1` | Blue-cyan |
| Green | `#00AD0C` | Green-cyan |
| Red | `#EC0000` | Red-white |

Apply the tone as a solid text-face or inner-keyline color. Do not use a colored
outer glow. Keep the text shadow neutral black and the ghost neutral steel.

Phrase safe area:

- X: 72-568
- Y: 78-524
- Maximum: two visual lines for this full-stage insert
- Keep at least 30 px between the final glyph and the energy divider
- Reduce font size as needed; do not stretch letters horizontally
- Preserve `DESTINY BATTLE` exactly

## Asset Register

### 01 Background Plate

- Asset name: R4 Player Fatal Mode Opening Background Plate
- Purpose: Full-canvas arcade metal housing and separate phrase/portrait fields.
- Prompt: Dark crosshatch metal battle insert, orange illuminated arcade perimeter,
  split left text bay and right portrait bay, restrained brushed-steel bevels.
- Negative prompt: Character, phrase, logo, opaque battle replacement, ornate fantasy
  scrollwork, blue-dominant frame, permanent HUD.
- Aspect ratio: 1250:618.
- Background requirement: Full registered canvas; transparent outer corners retained.
- Filename: `01-background-plate.png`
- Developer notes: Enter first and clear completely. Never alter the battle layout.

### 02 Text Shadow

- Asset name: R4 Fatal Mode Opening Text Shadow Plane
- Purpose: Deepest typography plane and first impact cue.
- Prompt: Hard black extruded phrase shadow matching the approved final glyph layout.
- Negative prompt: Readable standalone phrase, blur glow, color tint, soft drop shadow.
- Aspect ratio: 1250:618 registered layer.
- Background requirement: Transparent alpha.
- Filename: `02-text-shadow-depth.png`
- Developer notes: Approved mode title. Keep registration identical to the ghost
  and main planes; do not substitute character dialogue or the retired working text.

### 03 Text Ghost

- Asset name: R4 Fatal Mode Opening Text Ghost Plane
- Purpose: Low-opacity arcade afterimage between shadow and main text.
- Prompt: Steel-blue ghost duplicate of the approved phrase, crisp edges, slight
  up-left offset, restrained translucency.
- Negative prompt: Bloom, illegible smear, chromatic rainbow, dominant duplicate text.
- Aspect ratio: 1250:618 registered layer.
- Background requirement: Transparent alpha.
- Filename: `03-text-ghost-depth.png`
- Developer notes: Approved mode title. Keep the same final typography and offset;
  do not substitute character dialogue or the retired working text.

### 04 Main Text

- Asset name: R4 Fatal Mode Opening Main Raised Text
- Purpose: Primary one-beat readable phrase.
- Prompt: Bold condensed arcade battle typography, raised metallic face, crisp black
  keyline, clear two-line hierarchy, Japanese smart-slot impact.
- Negative prompt: Script font, thin lettering, colored outer glow, three or more lines,
  compressed letter width, phrase crossing the divider.
- Aspect ratio: 1250:618 registered layer.
- Background requirement: Transparent alpha.
- Filename: `04-text-main-destiny-battle.png`
- Developer notes: This is a mode title, not character dialogue.

### 05 Character Echo

- Asset name: R4 Young Knight Portrait Echo
- Purpose: Low-opacity rim and motion trail behind the coated portrait.
- Prompt: Clean pale steel silhouette echo of the approved R4 portrait, engraved rim,
  sparse contour only.
- Negative prompt: Second character, opaque duplicate, altered pose, different armor,
  broad glow cloud.
- Aspect ratio: 1250:618 registered layer.
- Background requirement: Transparent alpha.
- Filename: `05-character-echo.png`
- Developer notes: Trail the main portrait by two frames and keep below 40% opacity.

### 06 Character Coated

- Asset name: R4 Young Knight Engraved Foil Portrait
- Purpose: Primary chest-shot character identity plane on the right side.
- Prompt: R4 Young Knight, short blond low-fade hair, sharper youthful warrior face,
  slim silver-and-gold armor, sword upright, engraved metallic foil coating, clean
  anime cel-shaded fantasy RPG finish.
- Negative prompt: Curly ringlets, long hair, soft doll face, bulky adult proportions,
  white-only armor, different sword, cape, extra limbs.
- Aspect ratio: 1250:618 registered layer.
- Background requirement: Transparent alpha.
- Filename: `06-character-coated.png`
- Developer notes: Crop closely to face, shoulders, and chest armor. Current layer is
  acceptable for motion testing only; final identity pass must use approved R4 references.

### 07 Energy Divider

- Asset name: R4 Fatal Mode Opening Energy Tear
- Purpose: Separates text and portrait while carrying the two-frame impact flash.
- Prompt: Narrow vertical white-cyan energy tear, sharp branching electricity, bright
  core, sparse edge sparks, clean central silhouette.
- Negative prompt: Wide explosion, full-screen lightning, opaque column, heavy smoke,
  colored text glow.
- Aspect ratio: 1250:618 registered layer.
- Background requirement: Transparent alpha.
- Filename: `07-energy-divider.png`
- Developer notes: Final visible layer on exit; keep clear of phrase glyphs.

### 08 Foreground Foil

- Asset name: R4 Fatal Mode Opening Foreground Foil Glints
- Purpose: Oversized holographic framing and broad glints around the chest-shot portrait.
- Prompt: Large silver-cyan engraved foil frame, broad prismatic glints, arcade premium
  holographic accent wrapping the portrait silhouette.
- Negative prompt: Large fire mass, orange flame field, portrait obstruction, bloom,
  particle storm.
- Aspect ratio: 1250:618 registered layer.
- Background requirement: Transparent alpha.
- Filename: `08-foreground-foil.png`
- Developer notes: The frame may be large, but keep the face and title readable.

## Approval Gates

Motion testing may proceed with the supplied layers. Final production approval
still requires:

1. Preserve `DESTINY BATTLE` across the shadow, ghost, and main planes. Do not
   reintroduce the retired Legendary working text.
2. The R4 portrait is checked against the approved short side-fade hair and armor.
3. White, blue, green, and red anticipation states pass readability checks.
4. Inversion waves do not create unsafe sustained flashing or hide the title.
5. The overlay clears fully before the final attack hit/dodge payoff.
