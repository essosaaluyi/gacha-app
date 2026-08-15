# Phrase Insert Box - Three Sleek Proposals

Date: 2026-07-23  
Palette reference: `public/images/draw-button.webp`

## Shared Color System

- Deep black: `#050607`
- Smoked graphite: `#15191C`
- Gunmetal: `#2A2F33`
- Mid steel: `#70767B`
- Polished chrome: `#C9CDD0`
- Specular white: `#F5F6F6`

The frame system is monochrome. Character portraits retain their approved identity colors.

## Proposal 01 - Concentric Rail

- Asset name: Concentric Rail
- Purpose: The clearest direct visual relationship to the draw disk.
- Prompt: Sleek wide battle phrase insert using concentric polished-chrome rails, smoked black glass, a circular portrait socket on the right, compact name tab, explicit enemy marker, and centered one-beat phrase.
- Negative prompt: Gold, teal, cyan, blue lighting, hexagons, ornate scrollwork, copied frames, thick bezel, excessive glow, permanent HUD.
- Aspect ratio: 16:9 review board; insert approximately 5.5:1.
- Background requirement: Matte charcoal review background. Production version requires transparent alpha.
- Filename: `outputs/phrase-insert-proposals/phrase-insert-proposal-01-concentric-rail.png`
- Developer notes: Strongest family resemblance to the disk and excellent legibility. The complete portrait circle adds visual weight and consumes more horizontal space.

## Proposal 02 - Split Bezel

- Asset name: Split Bezel
- Purpose: Create the strongest battle-forward silhouette with minimal frame mass.
- Prompt: Sleek angular battle phrase insert using two thin polished-chrome blade rails, shallow graphite glass, split end caps, a frame-breaking right-side character bust, tapered name plate, explicit enemy marker, and centered phrase.
- Negative prompt: Circular socket, gold, colored frame light, hexagons, scrollwork, copied frames, bulky panel, excessive glow, permanent HUD.
- Aspect ratio: 16:9 review board; insert approximately 5.5:1.
- Background requirement: Matte charcoal review background. Production version requires transparent alpha.
- Filename: `outputs/phrase-insert-proposals/phrase-insert-proposal-02-split-bezel.png`
- Developer notes: Recommended direction. It is sleek, readable, easiest to mirror for player/enemy, and its straight rails provide the cleanest animation path.

## Proposal 03 - Floating Halo Rail

- Asset name: Floating Halo Rail
- Purpose: Test the lightest, least obstructive overlay construction.
- Prompt: Ultra-sleek open battle phrase insert using separated chrome rails, semi-transparent smoked glass, an interrupted partial halo around the right-side bust, suspended name plate, explicit enemy marker, and generous negative space.
- Negative prompt: Closed rounded rectangle, full avatar circle, thick bezel, gold, colored frame lighting, ornate patterns, copied frames, excessive glow, permanent HUD.
- Aspect ratio: 16:9 review board; insert approximately 5.5:1.
- Background requirement: Matte charcoal review background. Production version requires transparent alpha.
- Filename: `outputs/phrase-insert-proposals/phrase-insert-proposal-03-floating-halo-rail.png`
- Developer notes: Lightest battlefield footprint and most premium restraint. The partial halo may compete with winged or horned silhouettes and requires careful per-character cropping.

## Design Recommendation

Use Proposal 02 as the structural base. Borrow only the circular two-step entrance pulse from Proposal 01 for the portrait reveal, and the low-opacity glass treatment from Proposal 03 for the phrase field.

## Selected Refinement - Split Bezel Green-Gold Glass V2

- Asset name: Split Bezel Green-Gold Glass
- Purpose: Refine the selected Proposal 02 using the card holder rather than the draw button as the authoritative palette reference.
- Prompt: Preserve the Split Bezel geometry while replacing the silver-dominant frame with dark emerald smoked acrylic, near-black graphite understructure, slim gilded yellow-gold rails, and restrained cool-white plastic reflections.
- Negative prompt: Silver-dominant frame, cyan or blue lighting, opaque green slab, excessive gold coverage, ornate decoration, thick bezel, copied card-holder cracks.
- Aspect ratio: 16:9 review board; insert approximately 5.5:1.
- Background requirement: Matte charcoal review background. Production version requires transparent alpha.
- Filename: `outputs/phrase-insert-proposals/phrase-insert-proposal-02-split-bezel-green-gold-glass-v2.png`
- Developer notes: Gold is structural, not ornamental. The phrase field should retain visible translucent depth while remaining dark enough for white text.

### Updated Palette

- Near-black backing: `#050806`
- Black-green: `#081811`
- Deep forest: `#0D2A1F`
- Smoked emerald acrylic: `#164736`
- Antique gold: `#9B651A`
- Gilded yellow: `#D6A83C`
- Bright gold highlight: `#F4D77A`
- Cool plastic reflection: `#DDE9E3`

## Mirrored Player And Enemy Pair

### Enemy Side - Mourning Talon - Elias

- Asset name: Enemy Split Bezel Green-Gold Glass V3
- Purpose: Right-side enemy insert with a nameplate large enough for fast desktop and mobile recognition.
- Prompt: Preserve the selected right-side Split Bezel composition while enlarging the nameplate and name by roughly 35-50 percent.
- Negative prompt: Small name, clipped lettering, portrait on left, palette change, excessive ornament.
- Aspect ratio: 16:9 review board; insert approximately 5.5:1.
- Background requirement: Matte charcoal review background. Production version requires transparent alpha.
- Filename: `outputs/phrase-insert-proposals/phrase-insert-enemy1-split-bezel-green-gold-glass-v3.png`
- Developer notes: Enemy portrait remains on the right. Phrase field extends left. Name and `ENEMY` marker stay separate.

### Player Side - SR2 Red Torn Dragon

- Asset name: Player Split Bezel Green-Gold Glass SR2 V1
- Purpose: Left-side player insert using the same frame grammar as the enemy version.
- Prompt: Mirror the selected Split Bezel composition across the vertical axis; place SR2 Red Torn Dragon on the left facing right; extend phrase field right; use enlarged player nameplate and explicit `PLAYER` marker.
- Negative prompt: Mirrored lettering, portrait on right, left-facing dragon, invented dialogue, altered palette, different frame construction.
- Aspect ratio: 16:9 review board; insert approximately 5.5:1.
- Background requirement: Matte charcoal review background. Production version requires transparent alpha.
- Filename: `outputs/phrase-insert-proposals/phrase-insert-player-sr2-split-bezel-green-gold-glass-v1.png`
- Developer notes: `PHRASE PENDING` is a review placeholder, not approved dialogue. Replace with live phrase text after content approval.

## Selected Icon Backdrop

- Asset name: Smoked Emerald Portrait Disc
- Purpose: Separate character silhouettes from the battlefield and make portrait icons recognizable at small size.
- Prompt: Large dark emerald smoked-glass disc behind the portrait, thin gilded gold outer ring, near-black inner shadow ring, subtle transparent radial reflection, character breaking the disc boundary.
- Negative prompt: Opaque flat circle, bright halo glow, silver-dominant ring, ornate crest, cracks, bolts, extra symbols.
- Aspect ratio: 1:1 disc integrated into the 5.5:1 insert.
- Background requirement: Disc remains part of the alpha overlay; no opaque rectangular background.
- Filenames:
  - `outputs/phrase-insert-proposals/phrase-insert-enemy1-split-bezel-icon-backdrop-v4.png`
  - `outputs/phrase-insert-proposals/phrase-insert-player-sr2-split-bezel-icon-backdrop-v2.png`
- Developer notes: Use the same disc diameter and vertical center for player and enemy. Mirror its horizontal anchor. Portrait sits above the disc; frame and nameplate sit above or intersect its lower edge.

## Final Game-Ready Exports

- Player frame:
  `public/images/battle-overlays/attack-fakeout/frames/attack-fakeout-frame-player-v1.png`
- Enemy frame:
  `public/images/battle-overlays/attack-fakeout/frames/attack-fakeout-frame-enemy-v1.png`
- Character icons:
  `public/images/battle-overlays/attack-fakeout/icons/`
- Developer handoff:
  `design-source/phrase-inserts/ATTACK_FAKEOUT_RESTORE_DEVELOPER_HANDOFF.md`

The final frames have transparent backgrounds and contain no baked character, name,
side label, or phrase. All four elements must be supplied as separate runtime layers.
