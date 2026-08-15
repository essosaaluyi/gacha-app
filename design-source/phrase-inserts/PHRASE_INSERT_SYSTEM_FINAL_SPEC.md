# Arc-Relic Character Phrase Insert

Status: final visual specification; production art not yet generated  
Date: 2026-07-23  
Primary references:

- `C:/Users/essos/Pictures/Screenshots/Screenshot 2026-07-23 210001.png`
- `C:/Users/essos/Pictures/Screenshots/Screenshot 2026-07-21 100516.png`

Project references:

- `PROJECT_BIBLE.md`
- `outputs/battle-cabinet-qa/battle-live-1920x1080.png`
- `outputs/battle-insert-text-design/battle-insert-text-design-proposals-4up.png`

## Design Decision

Use a refined version of Proposal 02, Portrait Notch Banner, under the final system name **Arc-Relic Phrase Banner**.

The references establish the correct presentation grammar:

- A low, wide phrase field that can be read in one glance.
- A character portrait that overlaps and breaks the frame.
- A dedicated character-name plaque.
- Strong outer framing around a quiet, high-contrast text interior.
- A temporary, theatrical overlay rather than a permanent dialogue HUD.

The system must not reproduce the references' protected details. Do not use the blue hexagonal field, triple blue speed ribbon, triangular end cluster, ornate scroll frame, diamond wallpaper, exact portrait proportions, or exact name-ribbon construction.

## Final Visual Direction

### Core Identity

- Blackened bronze outer frame matching the battle cabinet's hardware.
- Thin antique-gold edge on the structural frame.
- Dark green-black smoked-glass phrase field.
- Fine teal arcane-circuit lines under the glass at low contrast.
- A single expectation-color light rail running through the frame.
- Character portrait overlaps the entry-side frame by roughly 18 percent.
- Tapered metal name tab locks beneath the portrait and clips into the phrase rail.
- Player and enemy versions mirror one another without changing the text geometry.

This creates Japanese smart-slot energy through layering, light timing, portrait impact, and rapid state escalation rather than by copying another title's frame.

### Composition

- Player: portrait on left, phrase extends right, placed slightly left/top of battle center.
- Enemy: portrait on right, phrase extends left, placed slightly right/bottom of battle center.
- Portrait always faces inward toward the phrase and opposing character.
- Character name occupies the tapered tab below the portrait.
- Side marker sits at the outer entry edge and explicitly reads `PLAYER` or `ENEMY`.
- State marker occupies the trailing frame cap.
- Phrase is optically centered in the text field.

## Reference Analysis

### Reference 01

- Strengths: immediate wide reading field, portrait breaks the frame, name is separated, strong entry direction, clean silhouette.
- Weaknesses for this project: blue-tech identity is too dominant; the hex field and speed ribbon are too specific to preserve.
- Adopt: frame-breaking portrait, wide text field, clean light rail, energetic asymmetric end treatment.
- Replace: hexagons with sparse arcane circuitry; ribbon with a compact tapered metal tab.

### Reference 02

- Strengths: large identifiable portrait, name label with strong hierarchy, framed dark text field, fantasy theatricality.
- Weaknesses for this project: ornate scrollwork and patterned upholstery would compete with the current cabinet and reduce mobile clarity.
- Adopt: portrait/name grouping, warm metal presence, deep readable phrase field.
- Replace: scrollwork with restrained cabinet hardware; repeated diamonds with quiet smoked glass.

## Battle-Screen Fit

The current battle stage is approximately 1280 x 640 inside the 1920 x 1080 cabinet view.

- Insert production canvas: 1080 x 224 px, transparent RGBA.
- High-resolution art master: 2160 x 448 px.
- Display size in the current battle stage: 960-1000 px wide by 190-204 px high.
- Player anchor: 6 percent from stage left; top edge at 24-27 percent of stage height.
- Enemy anchor: 6 percent from stage right; top edge at 54-57 percent of stage height.
- Mobile width: 90 percent of battle viewport.
- Mobile portrait display: 72-80 px; desktop portrait display: 172-188 px.
- No cabinet controls, card zones, counters, or battle elements move when the insert appears.
- The overlay clears to a fully unchanged battle screen.

## Internal Geometry

All values below reference the 1080 x 224 production canvas.

- Transparent export bleed: 24 px.
- Structural frame: x 34, y 34, width 1012, height 154.
- Phrase field: 716 x 112 px.
- Portrait safe crop: 194 x 208 px.
- Name tab: 248 x 44 px.
- Side marker: 58 x 92 px.
- State cap: 82 x 112 px.
- Phrase text safe area: 650 x 82 px.
- Player phrase safe area begins at x 254.
- Enemy phrase safe area ends at x 826.
- Minimum internal padding: 28 px horizontal and 18 px vertical.

The frame, portrait socket, name tab, side marker, and state cap remain fixed across all states. Effects may extend into the transparent bleed but may not alter text geometry.

## Typography

- Phrase family: `Noto Sans JP`, weight 800.
- Name and marker family: `Noto Sans JP`, weight 700.
- Phrase desktop master size: 38 px for one line, 32 px for two lines.
- Mobile equivalent: 20 px for one line, 18 px for two or three lines.
- Name size: 24 px master; long names may reduce to 20 px.
- Side/state marker size: 16-18 px master.
- Line height: 1.16.
- Letter spacing: 0.
- Phrase fill: near-white with a 3 px charcoal outline and restrained 1 px expectation-color edge light.
- Name fill: warm ivory; state color appears only as a small edge or marker accent.
- Do not use italics, thin weights, glow-only text, or negative tracking.

### Phrase Length Rules

- Ideal: up to 42 characters including spaces.
- Soft limit: 72 characters.
- Hard review threshold: 110 characters.
- One line preferred; two lines standard maximum.
- Three lines permitted only in the mobile long-phrase variant.
- Never crop with an ellipsis during battle.
- Do not bake phrase or name text into the frame raster.

## State System

Each state uses a visible word/symbol and a motion/effect change. Color is never the only signal.

| State | Marker | Structural treatment | Motion treatment |
|---|---|---|---|
| Standard | Single diamond notch | One lit inner rail | Clean slide and settle |
| Rising | Double notch | Second inner rail appears | Short forward light scan |
| Critical | Split crown notch | Corners separate by 3 px | Two-beat pulse and 2 px impact |
| Fatal Mode | `FATAL` blade tab | Trailing cap exposes blade-like teeth | Hard stop, red flash, short bass-like shake |
| Survival | Shield-break symbol | Inner rail closes around phrase | Inward sweep followed by rebound |
| Counterattack | Reversal arrows | Entry and trailing caps exchange emphasis | Fast overshoot then reverse snap |
| Premium | Seven-point relic star | Gold/prismatic secondary edge | Slower gleam, particle pinpoints, longer hold |

Expectation color remains a separate system based on `PROJECT_BIBLE.md`:

- White: default.
- Blue: slightly hopeful.
- Green: stronger hope.
- Red: high anticipation.

The state marker must remain legible if the expectation rail is viewed in grayscale.

## Animation Sheet Plan

Recommended 60 fps timing:

1. Frames 0-5: expectation-color rail draws in from the side.
2. Frames 3-10: structural frame slides from 14 percent offscreen to its anchor.
3. Frames 5-13: portrait enters 18 px farther than the frame, then settles back.
4. Frames 8-14: name tab locks into place.
5. Frames 10-16: phrase backing reaches full opacity; text appears without typewriter animation.
6. Frames 16-54: stable reading hold.
7. Frames 48-56: optional state-specific final pulse.
8. Frames 54-63: text and name clear first; portrait and frame exit together.
9. Frame 64: alpha returns to zero and the unchanged battle screen is fully visible.

Total duration: approximately 1.07 seconds. Premium may hold through frame 72. Long phrases may hold through frame 78.

## Required Asset Families

### Asset 01 - Shared Base Frame

- Asset name: Arc-Relic Phrase Frame
- Purpose: Reusable structural frame for every character and state.
- Prompt: Original anime fantasy RPG battle phrase banner, low wide blackened-bronze cabinet frame, thin antique-gold trim, dark green-black smoked glass center, sparse teal arcane-circuit lines, asymmetric tapered end caps, clean readable silhouette, restrained Japanese smart-slot presentation, transparent background, no text, game UI asset quality.
- Negative prompt: Blue hexagon field, triangular cluster, triple speed ribbon, ornate scrollwork, diamond wallpaper, copied game frame, character portrait, baked text, permanent HUD, excessive filigree, round speech bubble, opaque full canvas.
- Aspect ratio: 135:28.
- Background requirement: Transparent RGBA with 24 px effect bleed.
- Filename: `phrase-insert-frame-shared-base-v01.webp`
- Developer notes: Build as scalable center field plus protected end caps. Player/enemy layouts are mirrored compositions.

### Asset 02 - Portrait Socket And Name Tab

- Asset name: Arc-Relic Portrait Notch
- Purpose: Hold an identifiable bust icon and connect it to the phrase field.
- Prompt: Original tapered portrait socket and compact name tab for fantasy pachislot battle overlay, blackened bronze, antique gold edge, dark enamel inset, restrained arcane hardware, sharp readable silhouette, transparent background, no portrait, no text.
- Negative prompt: Scroll ribbon, blue speed lines, circular avatar badge, large decorative crest, copied frame, ornate baroque curls, baked name.
- Aspect ratio: 5:4.
- Background requirement: Transparent RGBA.
- Filename: `phrase-insert-portrait-notch-shared-v01.webp`
- Developer notes: Character art is a separate masked layer. Name remains live text.

### Asset 03 - Side Markers

- Asset name: Player And Enemy Entry Markers
- Purpose: Distinguish sides without relying on color.
- Prompt: Pair of mirrored compact battle-side markers, one labeled player and one enemy, original angular relic hardware, clear inward arrow geometry, blackened metal and gold trim, transparent background, no decorative scene.
- Negative prompt: Color-only distinction, faction logo copy, round badge, large label, scrollwork, unreadable tiny lettering.
- Aspect ratio: 2:3 per marker.
- Background requirement: Transparent RGBA.
- Filename: `phrase-insert-side-markers-player-enemy-v01.webp`
- Developer notes: Player uses one inward wedge; enemy uses a split inward wedge. Labels remain present on every state.

### Asset 04 - State Marker Set

- Asset name: Phrase Insert State Markers
- Purpose: Identify standard, rising, critical, Fatal Mode, survival, counterattack, and premium.
- Prompt: Seven compact original fantasy battle-state marker icons in one consistent blackened-metal and gold relic system, diamond notch, double notch, split crown, fatal blade tab, shield break, reversal arrows, seven-point relic star, transparent background, high small-size clarity.
- Negative prompt: Copied game icons, color-only symbols, complex illustrations, fine unreadable detail, gradients without structure, text except FATAL.
- Aspect ratio: 7:1 contact sheet; 1:1 individual assets.
- Background requirement: Transparent RGBA.
- Filename: `phrase-insert-state-markers-7up-v01.png`
- Developer notes: Export each marker separately as 128 x 128 WebP after approval.

### Asset 05 - Expectation Rails

- Asset name: White Blue Green Red Expectation Rails
- Purpose: Carry the Bible's anticipation color without changing frame geometry.
- Prompt: Four identical thin luminous energy rails for a fantasy battle phrase banner, white blue green and red variants, restrained core glow, sharp endpoints, transparent background, lightweight web game effect.
- Negative prompt: Large neon bloom, rainbow mix, fog, particles covering text, frame geometry, opaque strip.
- Aspect ratio: 8:1.
- Background requirement: Transparent RGBA.
- Filename: `phrase-insert-expectation-rails-4up-v01.png`
- Developer notes: Keep rail effect on a separate layer so state and probability remain independent.

### Asset 06 - Character Portrait Icons

- Asset name: Character Phrase Portrait Set
- Purpose: Provide recognizable small bust icons for all 28 characters.
- Prompt: Faithful crop from the approved character-sheet close-up, anime cel-shaded fantasy RPG, clean lineart, face or creature head plus one signature feature, inward-facing three-quarter bust, strong silhouette, transparent background, no frame, no text.
- Negative prompt: Redesign, costume changes, incorrect hair or eyes, missing horns or wings, extra limbs, generic portrait, full body, background scene, chibi proportions, painterly realism, over-detailed rendering.
- Aspect ratio: 1:1 master.
- Background requirement: Transparent RGBA.
- Filename: `phrase-icon-{side}-{card-id}-{slug}-v01.webp`
- Developer notes: 512 x 512 master and 256 x 256 optimized derivative. Use current approved character sheets, not older raw generations.

## Character-By-Character Insert Plan

All icons face inward. Phrase status is based on the current character sheets.

### Players

| ID | Character | Icon crop direction | Phrase status | Filename |
|---|---|---|---|---|
| R1 | Triplets Baby Dragon | Three-head cluster; central head dominant | Missing | `phrase-icon-player-r1-triplets-baby-dragon-v01.webp` |
| R2 | Green Scale Dragon | Head and upper neck; preserve green scale silhouette | Missing | `phrase-icon-player-r2-green-scale-dragon-v01.webp` |
| R3 | Dragon Raider | Face and shoulder crop; preserve raider head silhouette | Missing | `phrase-icon-player-r3-dragon-raider-v01.webp` |
| R4 | Young Knight | Sharp face, short side-fade hair, armor collar | Missing | `phrase-icon-player-r4-young-knight-v01.webp` |
| SR1 | Necro Runner | Face and upper torso with primary necro marker | Missing | `phrase-icon-player-sr1-necro-runner-v01.webp` |
| SR2 | Red Torn Dragon | Head, tall neck, and near wing root | Missing | `phrase-icon-player-sr2-red-torn-dragon-v01.webp` |
| SR3 | Vigilante | Masked orange fox face, rear-pointing ear, scarf | Missing | `phrase-icon-player-sr3-vigilante-v01.webp` |
| SR4 | Night Crawler | Face and upper torso with signature night silhouette | Missing | `phrase-icon-player-sr4-night-crawler-v01.webp` |
| SSR1 | Great Thunder Dragon | Dragon head, tall neck, paired wing roots visible | Missing | `phrase-icon-player-ssr1-great-thunder-dragon-v01.webp` |
| SSR2 | Blood Man | Face, red eye direction, sword-side shoulder | Missing | `phrase-icon-player-ssr2-blood-man-v01.webp` |
| SSR3 | Ghost of Emperor | Face, crown/headpiece, and recognizable staff head | Missing | `phrase-icon-player-ssr3-ghost-of-emperor-v01.webp` |
| SSR4 | White Sword Man | Face, hair silhouette, sword guard near shoulder | Missing | `phrase-icon-player-ssr4-white-sword-man-v01.webp` |
| UR1 | Mami | Bright green eyes, teal-black hair, scarf and cyan marking | Missing | `phrase-icon-player-ur1-mami-v01.webp` |
| UR2 | Double Striker | Tanned face, blond hair, red eyes with black sclera | Missing | `phrase-icon-player-ur2-double-striker-v01.webp` |
| UR3 | Abandoned Doll | Cracked face shell, glowing eye, exposed head mechanism | Missing | `phrase-icon-player-ur3-abandoned-doll-v01.webp` |

### Enemies

| ID | Character | Icon crop direction | Phrase status | Filename |
|---|---|---|---|---|
| enemy1 | Mourning Talon - Elias | Helmet, visible eye, white wing shoulder | 3 approved phrases | `phrase-icon-enemy-enemy1-mourning-talon-elias-v01.webp` |
| enemy2 | Rift Stalker | Bent hat, one glowing eye, high collar | Pending | `phrase-icon-enemy-enemy2-rift-stalker-v01.webp` |
| enemy3 | Voidscale Tyrant | Dragon head, twin side horns, red fissures | Pending | `phrase-icon-enemy-enemy3-voidscale-tyrant-v01.webp` |
| enemy4 | Crimson Regent - Marcus | Unicorn helm, spiral horn, gold shoulder plate | Pending | `phrase-icon-enemy-enemy4-crimson-regent-marcus-v01.webp` |
| enemy5 | Skymaw Harrier | Cyan crown feathers, hooked beak, red chest edge | Pending | `phrase-icon-enemy-enemy5-skymaw-harrier-v01.webp` |
| enemy6 | Roseblood Noble - Julian | Sharp face, red eyes, cigarette, feather collar | Pending | `phrase-icon-enemy-enemy6-roseblood-noble-julian-v01.webp` |
| enemy7 | Redline Assassin - Kira | Crimson visor helmet and gold ear hardware | Pending | `phrase-icon-enemy-enemy7-redline-assassin-kira-v01.webp` |
| enemy8 | Moonplate Sentinel | Purple no-face helm, cyan eyes, gold cheek guards | Pending | `phrase-icon-enemy-enemy8-moonplate-sentinel-v01.webp` |
| enemy9 | Ghostblade Ronin - Ren | White hair, horn armor, halo, red eye sigil | Pending | `phrase-icon-enemy-enemy9-ghostblade-ronin-ren-v01.webp` |
| enemy10 | Velvet Trickster - Felix | Long white hair, amber eyes, halo, gold pauldron | Pending | `phrase-icon-enemy-enemy10-velvet-trickster-felix-v01.webp` |
| enemy11 | Ruinroot Titan | Small stone head, teal eyes, chest crystal | Missing | `phrase-icon-enemy-enemy11-ruinroot-titan-v01.webp` |
| enemy12 | Halo Executioner - Diana | Ram horns, gold helm, cyan crystal, halo | Pending | `phrase-icon-enemy-enemy12-halo-executioner-diana-v01.webp` |
| enemy13 | Lantern Ronin - Sora | White hair, red visor, black mask, cyan halo | Pending | `phrase-icon-enemy-enemy13-lantern-ronin-sora-v01.webp` |

## Elias Phrase Assignment

Wording remains exactly as approved:

| Phrase | Situation | State | Hold |
|---|---|---|---|
| `I know... this is the path I chose.` | Quiet resolve or battle opening | Standard | 48 frames |
| `I see, then die....` | Execution threat before a decisive attack | Fatal Mode | 54 frames |
| `What about those who had no one? You hypocrite!` | Emotional escalation or counterattack | Critical or Counterattack | 66 frames |

The four periods in `I see, then die....` still require owner confirmation.

## Export Package

Recommended folder:

`public/images/battle-overlays/phrase-inserts/`

Suggested contents:

- `frames/phrase-insert-frame-shared-base-v01.webp`
- `frames/phrase-insert-portrait-notch-shared-v01.webp`
- `markers/phrase-insert-side-markers-player-enemy-v01.webp`
- `markers/phrase-insert-state-{state}-v01.webp`
- `rails/phrase-insert-expectation-{color}-v01.webp`
- `icons/player/phrase-icon-player-{card-id}-{slug}-v01.webp`
- `icons/enemy/phrase-icon-enemy-{card-id}-{slug}-v01.webp`
- `effects/phrase-insert-effect-{state}-v01.webm`

Alpha/export guidance:

- Static frame and icons: lossless WebP with alpha.
- State markers: lossless WebP with alpha.
- Contact sheets and review boards: PNG.
- Animated effect layers: alpha WebM where supported; sprite-sheet fallback.
- Keep frame, icon, markers, expectation rail, effects, name, and phrase as separate layers.
- Do not export an opaque 1920 x 1080 image.

## Production Hold

The visual system is now defined, but the complete character set cannot be populated with dialogue:

- 27 characters still have no approved phrase.
- No sheet assigns phrases to all seven supported states.
- Final production mockups should begin with Elias only, using all three approved lines.
- The remaining character icons may be cropped in parallel, but phrase-complete exports must wait for approved dialogue.

