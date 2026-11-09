---
name: apply-bold-graphic-cel-style
description: Re-render anime, fantasy, and gacha character artwork in this project's selected bold graphic cel house style while preserving the target character's identity. Use for character restyling, card art, cut-ins, sprites, portraits, character sheets, and style-comparison panels that need strong thick-to-thin contours, intentionally grouped shapes, compact designed eyes, and clean hard-edged cel shadows instead of a generic glossy AI-anime finish.
---

# Apply Bold Graphic Cel Style

Apply the selected top-right art direction consistently to humanoid and creature characters. Preserve the target's design; transfer only the drawing language.

## Required image workflow

- Use the `imagegen` skill for raster generation or editing and read its `SKILL.md` before acting.
- Find and inspect the target character's authoritative master pack before generating.
- Load both bundled style assets with `view_image` before prompting:
  - `assets/ur1-mami-selected-top-right.png`: primary humanoid face, hair, contour, and cel-shadow reference.
  - `assets/r1-triplets-selected-top-right.png`: secondary creature and small-scale readability reference.
- Label the master pack as the identity reference and the bundled assets as style-only references.
- Never use the bundled characters' hair, face, costume, markings, or palette as target-character features.

## Lock identity first

Write a short identity lock from the target master before describing style. Preserve:

- species, apparent age, body proportions, and silhouette;
- face-defining features, hairstyle, hair color, and eye color;
- costume construction, accessories, markings, weapons, and props;
- the requested pose, expression, framing, lighting, and background;
- the exact number of characters.

If references disagree, prefer the newest explicitly completed master pack. Do not silently blend obsolete designs.

## Selected visual language

Apply all of these together:

- Use confident dark outer contours with clear thick-to-thin variation. Make the silhouette line stronger than interior detail.
- Construct eyes as deliberate graphic shapes with a strong upper lid, compact iris rendering, controlled highlights, and a readable gaze. Avoid oversized glassy AI eyes.
- Give the jaw, chin, nose, and mouth simple decisive shapes. Retain slight human asymmetry instead of smoothing the face into a generic template.
- Group hair, scales, fabric, armor, or fur into a few intentional large masses. Add only a small number of accent strands or texture lines.
- Use clean, hard-edged one- or two-step cel shadows. Prefer large readable shadow shapes over airbrushed gradients.
- Keep highlights restrained and graphic. Avoid bloom, plastic gloss, rim-light clutter, and uniformly polished micro-detail.
- Preserve the target palette. Do not force the teal, cyan, cream, or amber colors found in the bundled references.
- Make the design read clearly at thumbnail and in-game scale.

## Generate

Use the built-in image generation path by default. Supply the authoritative target master plus the two bundled style references. Use a prompt shaped like:

```text
Use case: stylized-concept
Asset type: <card art / portrait / cut-in / sprite / character sheet>
Primary request: Re-render the target character in the project's selected bold graphic cel house style.
Input images: Image 1 is the authoritative identity reference. Images 2 and 3 are style-only references; transfer their contour, shape grouping, eye construction, and hard cel-shadow language, never their identities or palettes.
Locked identity: <target-specific invariant list>
Composition/framing: <preserve or specify>
Style/medium: bold graphic 2D cel animation drawing; confident thick-to-thin contours; designed compact eyes; simplified large material masses; hard-edged one- or two-step shadows; restrained highlights.
Constraints: preserve the target identity, palette, costume, props, anatomy, and requested expression exactly.
Avoid: generic glossy AI anime, 3D rendering, airbrushed skin, excessive gradients, bloom, random hair strands, micro-detail everywhere, identity leakage from the style references, text, logo, signature, watermark.
```

For a comparison sheet, keep pose, crop, expression, lighting, and backdrop identical across panels. Change only the requested drawing variables. Do not present palette or costume changes as style alternatives.

## Validate

Inspect the result at full size and thumbnail size. Reject or iterate when any answer is no:

- Is the target unmistakably the same character rather than Mami or the baby dragons?
- Are original colors, costume, anatomy, markings, props, and character count intact?
- Are the silhouette contour and important interior lines visibly thick-to-thin?
- Are eyes designed and readable without glossy over-rendering?
- Are hair and materials grouped into intentional masses?
- Are shadows hard-edged, simple, and readable rather than gradient-heavy?
- Does the image avoid plastic texture, bloom, random detail, text, and watermarks?

Change one failure at a time and repeat the invariants on every iteration.

## Save

Save project-bound results non-destructively in the relevant character folder, preferably under `style-exploration/` until selected as final. Report the saved path, reference roles, and final prompt.
