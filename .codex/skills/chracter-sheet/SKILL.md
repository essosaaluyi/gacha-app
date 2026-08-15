---
name: "chracter-sheet"
description: "Project workflow for creating gacha character sheets from card art references, including front, back, side, close-up face views, info fields, and movement placeholders."
---

# Chracter Sheet Skill

Use this workflow whenever the user asks to create or revise a player/enemy character sheet for this gacha project.

## Goal

Create a clean character sheet that preserves the original card identity and produces usable reference images for later inserts, battle poses, idle animation, and motion keyframes.

## Source Priority

1. Use the character's original `card.png` as the main design source.
2. Use images in the character's `references/` folder as supporting references.
3. If a reference conflicts with `card.png`, follow `card.png` unless the user explicitly says otherwise.
4. Recheck the original art before prompting and again before finalizing.
5. Preserve face/head shape, body proportions, clothing or anatomy details, color palette, signature accessories, and silhouette.

## Standard Folder Pattern

Player:
- `public/images/cards/player/<RARITY>/card.png`
- `public/images/cards/player/<RARITY>/references/`
- `public/images/cards/player/<RARITY>/character-sheet/`

Enemy:
- `public/images/cards/enemy/enemy<number>/card.png`
- `public/images/cards/enemy/enemy<number>/references/`
- `public/images/cards/enemy/enemy<number>/character-sheet/`

## Generated Image Requirements

Create one turnaround source image with:
- Front full-body view
- Back full-body view
- Side full-body view, usually facing right unless requested otherwise
- Close-up face/head or upper-body view
- Plain white background
- No labels, no card frame, no extra characters, no watermark
- Consistent scale between front/back/side views
- Full body visible with clean padding

Rendering:
- Anime cel-shaded when requested or when matching current project sheets.
- Prefer clear dark/base/light tone grouping for each palette.
- Avoid drifting into photoreal, over-detailed, painterly, or unrelated styles.

## Prompting Pattern

Use `image_gen` built-in mode by default.

Prompt structure:

```text
Use case: stylized-concept
Asset type: character turnaround source for a gacha card character sheet
Primary request: Create a clean anime cel-shaded character turnaround for <CHARACTER NAME> based strictly on the original card design. Make four isolated views on one white canvas: front full body, back full body, right-facing side full body, and close-up face/head. No labels, no text, no UI frame.
Input images: Image 1 is the strict original card identity. Supporting images are references only.
Subject: <specific anatomy/clothing/face/accessory/silhouette notes from the original art>
Style/medium: polished anime game concept art, cel-shaded, clean linework, readable character sheet clarity.
Composition/framing: wide canvas, four evenly spaced views, generous padding, consistent scale.
Lighting/mood: neutral studio lighting.
Color palette: <specific colors>
Materials/textures: <specific materials>
Constraints: Preserve original design, proportions, face/head, clothing/anatomy, signature details, and palette. White background only.
Avoid: unrelated redesigns, changed face, changed clothing, extra props, card frame, labels, watermark.
```

## Save Outputs

Save final assets inside the character's `character-sheet/` folder:

- `<slug>-character-sheet.png`
- `<slug>-character-sheet-v<number-or-note>.png`
- `<slug>-turnaround-source.png`
- `<slug>-front-view.png`
- `<slug>-back-view.png`
- `<slug>-side-view.png`
- `<slug>-face-view.png`
- `<slug>-sheet-details.md`

Use lowercase hyphenated slugs, for example:
- `triplets-baby-dragon-character-sheet.png`
- `ruinroot-titan-character-sheet.png`

## Sheet Layout

Use the established project sheet format:

- Top title: character name
- Subtitle: card type or sheet purpose
- Top visual panels:
  - `FRONT`
  - `BACK`
  - `SIDE`
  - `CLOSE-UP FACE`
- Lower info area:
  - `CHARACTER DESCRIPTION`
  - `ABILITY DETAILS`
  - `VISUAL IDENTITY`
  - `CHARACTER PHRASES`
- Bottom placeholders:
  - `ATTACK`
  - `BLOCK`
  - `DODGE`

## Details File

Write a concise `<slug>-sheet-details.md` containing:

- Character name
- Type: player/enemy card
- Source card path
- Key reference image paths
- Generated file list
- Character notes
- Visual identity notes
- Any user-specific correction notes

## Review Checklist

Before final response:

- Inspect the generated turnaround source.
- Crop views cleanly, with no neighboring-view slivers.
- Inspect the final sheet image.
- Confirm front/back/side/face all fit their panels.
- Confirm face/head matches the source art.
- Confirm proportions and clothing/anatomy did not drift.
- Confirm saved files are in the correct character folder.

## User Preference Notes

- The user is sensitive to irrelevant generations and design drift.
- Generate only what was requested.
- If the user says to rerun, compare with original art multiple times and make targeted corrections.
- For animation or inserts, the final pose must match the provided last-frame/idle reference exactly when requested.
- For character inserts, start from the original character identity before generating new pose or motion assets.
