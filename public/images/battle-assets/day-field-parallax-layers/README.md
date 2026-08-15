# Day Field Parallax Layers - Battle Space Revision

Fresh source regenerated to give the player and enemy/card positions more readable ground space while preserving the cohesive sun, kingdom, lake, road, crystals, ruins, trees, grass, and foreground style.

Canvas: 3200x1200 for all runtime layers.

Regenerated depth-layer workflow:
- Runtime layers were regenerated as separate assets, using the user-provided `example/` folder as hierarchy reference only.
- Preserved the intended coverage hierarchy: far is full picture, mid is broad lower/depth picture, gameplay is the lower battle field, foreground is the smallest close layer.
- The gameplay layer includes a wide dirt/grass field with clear left and right standing zones for two characters.
- Transparent overlay layers were generated on chroma key and processed into alpha PNG/WebP files.
- All runtime layers are normalized to the same 3200x1200 canvas.

Runtime layer order:
1. `01-far-background.png` / `.webp` - opaque full-picture base with sky, distant kingdom, lake, and mountains.
2. `02-mid-background.png` / `.webp` - broad lower/depth overlay with rolling hills, ruins, trail, and mid-distance scenery.
3. `03-gameplay.png` / `.webp` - lower playable battle field with clear standing zones for player and enemy.
4. `04-foreground.png` / `.webp` - smallest close foreground overlay with low grass, rocks, flowers, and edge props.

Review files:
- `day-field-battle-space-master-source.png` - source image used for this revision.
- `day-field-parallax-composite-preview.png` - full composite preview only, not runtime.
- `outputs/battle-backgrounds/day-field-battle-space-16x9-preview.png` - battle-frame crop preview.
- `outputs/battle-backgrounds/day-field-parallax-shift-test-16x9-preview.png` - shifted parallax preview for checking ghost overlap.
- `generated-layer-sources/` - original generated source images before chroma-key extraction.
- `regenerated-depth-layers-v1/` - PNG review copies of the regenerated runtime layer set.

Implementation notes:
- Stack all layers from the same top-left origin and same rendered size.
- Layer 1 is opaque. Layers 2-4 are transparent overlays.
- Anchor the player to the left standing zone and the enemy/card to the right standing zone in layer 3.
- Keep decorative foreground from layer 4 visually in front, but do not use it as the character floor anchor.
