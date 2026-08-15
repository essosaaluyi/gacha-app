# Card System Developer Handoff

## Approved References

- Player front rarity system: `design-source/cards/redesign-concepts/card-rarity-front-design-corner-tab-v2.png`
- Approved player front/back master: `design-source/cards/redesign-concepts/card-system-hybrid-06-rarity-text-color-hierarchy.png`
- Enemy front master: use the left/front card in `design-source/cards/redesign-concepts/enemy-card-dark-purple-front-back-v1.png`
- Source layered PSD: `design-source/cards/edit719.psd`

## Production Rule

Do not regenerate character artwork. Use every existing `card.png` or highest-quality raw reference as a pixel-preserved Smart Object or equivalent source layer. Rebuild only the frame, text, panels, rarity/enemy tab, and back face.

Export fronts at the current production card dimensions and preserve current image paths unless the consuming code requires a migration. Produce both PNG master exports and WebP runtime exports.

## Player Front Template

- Keep the approved clean layout: large artwork field, compact name/W RATE row, lower ability panel.
- Use the integrated top-right corner tab selected as direction 02.
- Name appears left in the first lower row.
- `W RATE` and the percentage appear right in the first lower row.
- Ability heading/body comes from card metadata. Do not bake gameplay copy into reusable frame layers.
- Keep text colors distinct from the rarity/name highlight.

### Rarity Treatments

| Rarity | W Rate | Frame | Corner tab |
| --- | ---: | --- | --- |
| R | 10% | Black gunmetal with restrained copper-orange lines | Copper-bronze `R`, lowest glow |
| SR | 40% | Cool dark steel with silver-blue lines | Silver-blue `SR`, moderate glow |
| SSR | 80% | Premium silver-gold with controlled warm highlights | Champagne-gold `SSR`, stronger depth |
| UR | 100% | Silver with restrained prismatic highlights | Silver/prismatic `UR`, strongest controlled glow |

### Player Roster

- `R1` TRIPLETS BABY DRAGON
- `R2` GREEN SCALE DRAGON
- `R3` DRAGON RAIDER
- `R4` YOUNG KNIGHT
- `SR1` NECRO RUNNER
- `SR2` RED TORN DRAGON
- `SR3` VIGILANTE
- `SR4` NIGHT CRAWLER
- `SSR1` GREAT THUNDER DRAGON
- `SSR2` BLOOD MAN
- `SSR3` GHOST OF EMPEROR
- `SSR4` WHITE SWORD MAN
- `UR1` MAMI
- `UR2` DOUBLE STRIKER
- `UR3` ABANDONED DOLL

## Player Back Face

- Use the approved dark-green back from the player master.
- Deep near-black green base, subtle diagonal texture, thin symmetrical gold circuit lines, small central gold diamond, silver outer edge.
- No rarity, name, percentage, ability copy, or character art.
- Prefer one shared runtime asset if all player backs are identical.

## Enemy Front Template

- Use the same layout geometry as player cards.
- Frame is blackened gunmetal and dark aubergine purple with restrained violet-magenta highlights and cold silver inner lines.
- Top-right integrated tab reads `ENEMY` and joins the top/right rails.
- First lower row: enemy name on the left.
- Replace `W RATE` with `ATTACK COUNT` and the configured integer on the right. Do not include `%`.
- Keep the entire lower description panel blank for now: no heading, body text, placeholder copy, or icons.
- Preserve original enemy artwork exactly.

### Enemy Roster And Attack Count

| Folder | Name | Attack count |
| --- | --- | ---: |
| enemy1 | MOURNING TALON - ELIAS | 5 |
| enemy2 | RIFT STALKER | 4 |
| enemy3 | VOIDSCALE TYRANT | 7 |
| enemy4 | CRIMSON REGENT - MARCUS | 5 |
| enemy5 | SKYMAW HARRIER | 8 |
| enemy6 | ROSEBLOOD NOBLE - JULIAN | 6 |
| enemy7 | REDLINE ASSASSIN - KIRA | 4 |
| enemy8 | MOONPLATE SENTINEL | 9 |
| enemy9 | GHOSTBLADE RONIN - REN | 9 |
| enemy10 | VELVET TRICKSTER - FELIX | 15 |
| enemy11 | RUINROOT TITAN | 5 |
| enemy12 | HALO EXECUTIONER - DIANA | 8 |
| enemy13 | LANTERN RONIN - SORA | 11 |

Attack-count source of truth: `lib/game-config/generated.ts` (`battleEnemies`).

## File And Data Update

1. Preserve or archive the existing original artwork before replacing any current rendered card front.
2. Update every player and enemy `card.png` and `card.webp` with the new composite while keeping expected dimensions and paths stable.
3. Add one shared player back-face PNG/WebP asset in the card image tree.
4. Add or update player-card data so the UI can resolve the player back-face asset. Do not create or wire an enemy back face.
5. Pull names, abilities, rarity, W RATE, and enemy attack counts from data rather than hard-coding them into reusable templates.
6. Verify all 28 front cards plus the shared player back visually at card-grid size and full-size preview.

## Layer Structure

- `FRAME_BASE`
- `FRAME_RARITY_OR_ENEMY_COLOR`
- `ART_SMART_OBJECT`
- `CORNER_TAB_BACKING`
- `CORNER_TAB_TEXT`
- `NAME_PANEL`
- `NAME_TEXT`
- `RATE_OR_ATTACK_PANEL`
- `RATE_OR_ATTACK_LABEL`
- `RATE_OR_ATTACK_VALUE`
- `DESCRIPTION_PANEL`
- `DESCRIPTION_TEXT_PLAYER_ONLY`
- `FRAME_HIGHLIGHTS`
- `FRAME_GLOW`

Keep materials, glow, and typography editable. Avoid flattening the source PSD before final export.
