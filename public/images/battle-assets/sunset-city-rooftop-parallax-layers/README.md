# Sunset City Rooftop Parallax Layers

Canvas: 3200x1200 for all runtime layers.

Workflow:
- Each layer was generated separately to preserve crisp edges.
- This is not a mask-sliced repaint from one scene.
- Mid, gameplay, and foreground were generated on chroma key and converted to alpha.
- Runtime files were normalized onto the shared battle canvas after extraction.

Runtime layer order:
1. `01-far-background.png` / `.webp` - distant sunset sky, river city, far towers, castle, mountains.
2. `02-mid-background.png` / `.webp` - rear terrace railing, back domes, crystals, skyline-facing terrace structures.
3. `03-gameplay.png` / `.webp` - main rooftop battle floor with open left/right standing space.
4. `04-foreground.png` / `.webp` - closest lanterns, banners, planters, and front corner architecture.

Preserved source renders:
- `01-far-background-generated-source.png`
- `02-mid-background-generated-source.png`
- `03-gameplay-generated-source.png`
- `04-foreground-generated-source.png`

Review files:
- `sunset-city-rooftop-parallax-composite-preview.png`
- `outputs/battle-backgrounds/sunset-city-rooftop-parallax-16x9-preview.png`
- `outputs/battle-backgrounds/sunset-city-rooftop-parallax-shift-test-16x9-preview.png`
