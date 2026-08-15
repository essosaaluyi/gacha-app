# Phrase Insert System - Initial Audit

Status: pre-reference planning only  
Date: 2026-07-23  
Source of truth: `PROJECT_BIBLE.md` and the current character-sheet image in each card folder

## Scope Guardrail

The battle-screen layout remains unchanged. Character phrase inserts are temporary alpha overlays that enter, hold for approximately one battle beat, exit, and leave the underlying battle screen clean.

This document does not finalize styling and does not authorize production assets. Frame ornament, palette, icon crop treatment, typography personality, effects, and final motion must wait for the project owner's example image.

## A. Character Phrase Inventory

### Audit Summary

- Player characters audited: 15
- Enemy characters audited: 13
- Total characters audited: 28
- Characters with approved phrase text: 1
- Approved phrase lines found: 3
- Characters without approved phrase text: 27
- No character sheet currently assigns a phrase to a battle situation.

### Approved Phrase Text

Intensity and situation recommendations below are provisional design classifications, not changes to the approved dialogue.

| Card ID | Character | Situation / emotional use | Exact phrase text | Recommended insert intensity |
|---|---|---|---|---|
| enemy1 | Mourning Talon - Elias | Unspecified on sheet; reads as quiet resolve | `I know... this is the path I chose.` | Normal |
| enemy1 | Mourning Talon - Elias | Unspecified on sheet; reads as an execution threat | `I see, then die....` | Fatal |
| enemy1 | Mourning Talon - Elias | Unspecified on sheet; reads as an emotional accusation | `What about those who had no one? You hypocrite!` | Critical |

Source: `public/images/cards/enemy/enemy1/character-sheet/mourning-talon-elias-character-sheet.png`

### Player Inventory

The text `Reserved for lore-connected in-game phrases.` is a template instruction, not approved dialogue.

| Card ID | Character | Sheet phrase status | Situation | Intensity |
|---|---|---|---|---|
| R1 | Triplets Baby Dragon | Reserved placeholder; no approved phrase | Missing | Unassigned |
| R2 | Green Scale Dragon | Reserved placeholder; no approved phrase | Missing | Unassigned |
| R3 | Dragon Raider | Reserved placeholder; no approved phrase | Missing | Unassigned |
| R4 | Young Knight | Reserved placeholder; no approved phrase | Missing | Unassigned |
| SR1 | Necro Runner | Reserved placeholder; no approved phrase | Missing | Unassigned |
| SR2 | Red Torn Dragon | Reserved placeholder; no approved phrase | Missing | Unassigned |
| SR3 | Vigilante | Reserved placeholder; no approved phrase | Missing | Unassigned |
| SR4 | Night Crawler | Reserved placeholder; no approved phrase | Missing | Unassigned |
| SSR1 | Great Thunder Dragon | Reserved placeholder; no approved phrase | Missing | Unassigned |
| SSR2 | Blood Man | Reserved placeholder; no approved phrase | Missing | Unassigned |
| SSR3 | Ghost of Emperor | Reserved placeholder; no approved phrase | Missing | Unassigned |
| SSR4 | White Sword Man | Reserved placeholder; no approved phrase | Missing | Unassigned |
| UR1 | Mami | Reserved placeholder; no approved phrase | Missing | Unassigned |
| UR2 | Double Striker | Reserved placeholder; no approved phrase | Missing | Unassigned |
| UR3 | Abandoned Doll | Reserved placeholder; no approved phrase | Missing | Unassigned |

### Enemy Inventory

`Phrase pending` and the enemy11 authoring instruction are not approved dialogue.

| Card ID | Character | Sheet phrase status | Situation | Intensity |
|---|---|---|---|---|
| enemy1 | Mourning Talon - Elias | 3 approved phrases | Not specified | Provisional classifications above |
| enemy2 | Rift Stalker | `Phrase pending` placeholders only | Missing | Unassigned |
| enemy3 | Voidscale Tyrant | `Phrase pending` placeholders only | Missing | Unassigned |
| enemy4 | Crimson Regent - Marcus | `Phrase pending` placeholders only | Missing | Unassigned |
| enemy5 | Skymaw Harrier | `Phrase pending` placeholders only | Missing | Unassigned |
| enemy6 | Roseblood Noble - Julian | `Phrase pending` placeholders only | Missing | Unassigned |
| enemy7 | Redline Assassin - Kira | `Phrase pending` placeholders only | Missing | Unassigned |
| enemy8 | Moonplate Sentinel | `Phrase pending` placeholders only | Missing | Unassigned |
| enemy9 | Ghostblade Ronin - Ren | `Phrase pending` placeholders only | Missing | Unassigned |
| enemy10 | Velvet Trickster - Felix | `Phrase pending` placeholders only | Missing | Unassigned |
| enemy11 | Ruinroot Titan | Authoring instruction only; no approved phrase | Missing | Unassigned |
| enemy12 | Halo Executioner - Diana | `Phrase pending` placeholders only | Missing | Unassigned |
| enemy13 | Lantern Ronin - Sora | `Phrase pending` placeholders only | Missing | Unassigned |

## B. Missing Or Unclear Phrase List

### Missing Content

- All 15 player characters require approved phrase text.
- Enemy2 through enemy13 require approved phrase text.
- All 28 characters require situation labels or trigger assignments.
- There are no approved phrases specifically assigned to rising expectation, survival, counterattack, or premium states.
- There is no approved long-phrase example for layout stress testing beyond the third Elias line.

### Wording, Grammar, And Length Flags

Approved wording is preserved exactly. These are review notes only:

- `I see, then die....` uses four periods. Confirm whether this punctuation is intentional.
- Elias's three phrases have no assigned trigger, speaker emotion, or voice direction.
- `What about those who had no one? You hypocrite!` is the longest approved line. It is suitable for the proposed soft limit but should be tested on the narrow mobile layout.
- Ellipsis style should eventually be standardized across all dialogue, including whether the project uses three periods or the single ellipsis character.

## C. Restrained Template-Structure Proposals

These proposals define layout grammar only. No final visual style is selected.

### Proposal 01 - Portrait Anchor Rail

- Asset name: Phrase Insert Structure 01 - Portrait Anchor Rail
- Purpose: Fastest-reading single-line or two-line insert with a strong small portrait anchor.
- Prompt: Transparent widescreen overlay layout; compact portrait block on the entry side; narrow side-identification marker; character name in a small utility line; phrase in a wide horizontal reading rail; mirrored player and enemy orientations; generous empty margins; no finalized ornament or palette.
- Negative prompt: Permanent HUD zone, full-screen panel, copied game frame, dense ornament, tiny portrait, text baked into artwork, color-only side identification, opaque background.
- Aspect ratio: Component approximately 6:1 inside a 16:9 transparent authoring canvas.
- Background requirement: Fully transparent outside the insert; no dimming layer included.
- Filename: `phrase-insert-structure-01-portrait-anchor-rail-spec.md`
- Developer notes: Best baseline for one-beat readability. Player portrait anchors left and looks inward; enemy portrait anchors right and looks inward. Side marker remains visible even in grayscale.

### Proposal 02 - Portrait Notch Banner

- Asset name: Phrase Insert Structure 02 - Portrait Notch Banner
- Purpose: Give the icon more silhouette presence without increasing total insert height.
- Prompt: Transparent horizontal insert; portrait overlaps a shaped notch at the leading edge; phrase occupies the uninterrupted center; compact name and side label share a thin header strip; trailing edge reserves a state marker; mirrored player and enemy versions; no finalized ornament or palette.
- Negative prompt: Circular profile badge floating separately, oversized nameplate, card-shaped frame, permanent lower third, excessive diagonal decoration, baked text, copied pachislot frame.
- Aspect ratio: Component approximately 5.5:1 inside a 16:9 transparent authoring canvas.
- Background requirement: Fully transparent with 32 px export bleed around effects.
- Filename: `phrase-insert-structure-02-portrait-notch-banner-spec.md`
- Developer notes: Stronger character silhouette than Proposal 01. The state marker can change without rebuilding the shared frame.

### Proposal 03 - Two-Tier Compact Insert

- Asset name: Phrase Insert Structure 03 - Two-Tier Compact Insert
- Purpose: Support longer phrases and mobile wrapping while keeping the character identity immediate.
- Prompt: Transparent compact overlay; first tier contains portrait, side marker, and character name; second tier is a wider phrase field aligned to the same anchor; both tiers move as one temporary insert; mirrored player and enemy orientations; no finalized ornament or palette.
- Negative prompt: Stacked cards, dialogue window covering the battle field, more than three text lines, decorative background plate, color-only state communication, opaque screen mask.
- Aspect ratio: Component approximately 4.5:1 inside a 16:9 transparent authoring canvas.
- Background requirement: Fully transparent; optional effect layer exported separately.
- Filename: `phrase-insert-structure-03-two-tier-compact-spec.md`
- Developer notes: Most tolerant of long dialogue. Slightly slower to scan than Proposal 01, so it should be selected only if the reference favors a layered hierarchy.

## D. Scalable Specification

### Canvas And Placement

- Authoring canvas: 1920 x 1080 px transparent RGBA.
- Desktop insert target: 1320-1440 px wide by 220-256 px high.
- Mobile insert target: 88% of viewport width; height determined by two or three text lines.
- Outer display safe area: 8% horizontal and 7% vertical from the viewport edge.
- Entrance overscan: reserve 18% of canvas width beyond the entry edge.
- Player placement: slightly left/top of center, matching `PROJECT_BIBLE.md`.
- Enemy placement: slightly right/bottom of center, matching `PROJECT_BIBLE.md`.
- Inserts must never reserve permanent layout space or shift the battle screen.

### Icon

- Source crop: 512 x 512 px master, transparent or tightly masked.
- Desktop displayed size: 144-176 px.
- Mobile displayed size: 64-80 CSS px equivalent.
- Crop rule: face plus one unmistakable signature feature; preserve eyes, head silhouette, and primary headgear.
- Orientation: player icon faces inward from the left; enemy icon faces inward from the right.
- Non-human characters: use head and upper-neck or head-and-chest crop, not a generic rarity emblem.

### Text

- Preferred length: up to 42 characters including spaces.
- Soft limit: 72 characters.
- Hard review threshold: 110 characters.
- Desktop: one line preferred, two lines allowed.
- Mobile: two lines preferred, three lines maximum.
- Do not shrink below 28 px on the 1920 x 1080 master or below 18 CSS px equivalent on mobile.
- Line height: 1.12-1.22.
- Letter spacing: 0.
- Font behavior: bold Japanese-capable gothic/sans family, weight 700-800, high x-height, clear punctuation, fallback with matching metrics. Final family waits for the reference.
- Readability protection: outline or hard shadow plus a controlled local backing field; exact treatment waits for the reference.
- Phrase text should remain live/separate from raster frame assets so wording can change without re-exporting the frame.

### Shared Component Grammar

- Required fields: character icon, character name, side marker, phrase, state marker.
- Side identity: mirrored orientation plus explicit `PLAYER` or `ENEMY` marker and an entry-edge motif.
- State identity: explicit word or unique symbol in addition to effects; never color alone.
- Expectation color remains a separate data layer using the Bible's white, blue, green, and red thresholds.
- Standard, rising, critical, Fatal Mode, survival, counterattack, and premium all reuse the same structural frame.
- States may change marker, border emphasis, effect layer, and motion amplitude; they must not change text geometry.

### Preliminary Timing Envelope

- Entrance: 120-180 ms.
- Hold: 650-900 ms.
- Exit: 120-180 ms.
- Total target: approximately 0.9-1.25 seconds.
- First readable frame should occur by 180 ms.
- Text and portrait remain stable during the hold; avoid continuous motion that reduces reading speed.
- Effect animation exports remain separate from the frame/icon/text composition.

### Web Export

- Frame: transparent lossless WebP or PNG; use a scalable/9-slice construction where distortion would otherwise occur.
- Character icon: transparent WebP at 512 x 512 master, plus optimized 256 x 256 derivative.
- Simple line motifs: SVG only if they remain visually faithful after reference review.
- Effects: separate alpha WebM or sprite sheet after animation approval.
- Text: not baked into the frame asset.
- Export naming:
  - `phrase-insert-frame-shared-{state}-v01.webp`
  - `phrase-icon-player-{card-id}-v01.webp`
  - `phrase-icon-enemy-{card-id}-v01.webp`
  - `phrase-insert-effect-{state}-v01.webm`

## E. Decisions Waiting For The Example Image

- Which of the three structures best matches the intended composition.
- Exact portrait crop shape, border construction, and icon treatment.
- Final frame silhouette, ornament density, edge motifs, and material language.
- Final palette and how the Bible's expectation colors combine with state accents.
- Final typeface, name styling, phrase emphasis, punctuation treatment, and text effects.
- Whether the character name is always visible or only shown on selected states.
- Exact state-marker shapes for standard, rising, critical, Fatal Mode, survival, counterattack, and premium.
- Entrance direction, wipe shape, hit-stop, shake, glow, particle density, and exit behavior.
- Whether the overlay includes a local backing field, battle-field dim, or no dim at all.
- Final icon source choice: character-sheet close-up, approved card crop, or new dedicated portrait crop.
- Exact desktop/mobile placement after testing against the current battle screen.
- Final production prompts, negative prompts, and production asset generation.

## F. Questions And Confirmations Needed

1. Please provide the example image that will be the primary visual reference.
2. Confirm whether Elias's three provisional intensity assignments are acceptable or whether each line already has a planned trigger.
3. Confirm whether `I see, then die....` intentionally uses four periods.
4. Confirm the minimum phrase set expected per character: one universal line or separate lines for the seven supported states.
5. Confirm whether phrases will be English-only, Japanese-only, or localized at runtime.
6. Confirm whether the character name and the `PLAYER`/`ENEMY` label should remain visible during every insert.
7. Confirm which current battle-screen screenshots and desktop/mobile resolutions should be used for placement validation after the reference arrives.

## Audit Source Files

### Players

| Card ID | Audited sheet |
|---|---|
| R1 | `public/images/cards/player/R1/references/triplets-baby-dragon-character-sheet-complete-v4.png` |
| R2 | `public/images/cards/player/R2/references/green-scale-dragon-character-sheet-complete-v1.png` |
| R3 | `public/images/cards/player/R3/references/dragon-raider-character-sheet-complete-v1.png` |
| R4 | `public/images/cards/player/R4/character-sheet/character-sheet.png` |
| SR1 | `public/images/cards/player/SR1/references/necro-runner-character-sheet-complete-v1.png` |
| SR2 | `public/images/cards/player/SR2/references/red-torn-dragon-character-sheet-complete-v1.png` |
| SR3 | `public/images/cards/player/SR3/references/vigilante-character-sheet-complete-v1.png` |
| SR4 | `public/images/cards/player/SR4/references/night-crawler-character-sheet-complete-v1.png` |
| SSR1 | `public/images/cards/player/SSR1/references/great-thunder-dragon-character-sheet-complete-v1.png` |
| SSR2 | `public/images/cards/player/SSR2/character-sheet/character-sheet.png` |
| SSR3 | `public/images/cards/player/SSR3/references/ghost-of-emperor-character-sheet-complete-v1.png` |
| SSR4 | `public/images/cards/player/SSR4/references/white-sword-man-character-sheet-complete-v1.png` |
| UR1 | `public/images/cards/player/UR1/references/mami-character-sheet-v4.png` |
| UR2 | `public/images/cards/player/UR2/character-sheet/character-sheet.png` |
| UR3 | `public/images/cards/player/UR3/references/abandoned-doll-character-sheet-complete-v1.png` |

### Enemies

| Card ID | Audited sheet |
|---|---|
| enemy1 | `public/images/cards/enemy/enemy1/character-sheet/mourning-talon-elias-character-sheet.png` |
| enemy2 | `public/images/cards/enemy/enemy2/character-sheet/rift-stalker-character-sheet.png` |
| enemy3 | `public/images/cards/enemy/enemy3/character-sheet/voidscale-tyrant-character-sheet.png` |
| enemy4 | `public/images/cards/enemy/enemy4/character-sheet/crimson-regent-marcus-character-sheet.png` |
| enemy5 | `public/images/cards/enemy/enemy5/character-sheet/skymaw-harrier-character-sheet.png` |
| enemy6 | `public/images/cards/enemy/enemy6/character-sheet/roseblood-noble-julian-character-sheet.png` |
| enemy7 | `public/images/cards/enemy/enemy7/character-sheet/redline-assassin-kira-character-sheet.png` |
| enemy8 | `public/images/cards/enemy/enemy8/character-sheet/moonplate-sentinel-character-sheet.png` |
| enemy9 | `public/images/cards/enemy/enemy9/character-sheet/ghostblade-ronin-ren-character-sheet.png` |
| enemy10 | `public/images/cards/enemy/enemy10/character-sheet/velvet-trickster-felix-character-sheet.png` |
| enemy11 | `public/images/cards/enemy/enemy11/character-sheet/ruinroot-titan-character-sheet.png` |
| enemy12 | `public/images/cards/enemy/enemy12/character-sheet/halo-executioner-diana-character-sheet.png` |
| enemy13 | `public/images/cards/enemy/enemy13/character-sheet/lantern-ronin-sora-character-sheet.png` |
