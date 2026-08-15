---
name: 90s-anime-style
description: Re-render existing anime and fantasy game artwork as vivid 1980s-1990s anime cel-shaded assets with bold lineart, hard graphic shadows, controlled highlights, and strong small-scale readability. Use when the user requests retro anime, 90s cel shading, old-school game illustration, dynamic slot-machine battle art, or a less painterly character treatment.
---

# 90s Anime Style

Use this skill to convert existing character or battle artwork into a vivid retro anime game look while preserving the source design. The result should feel like a production asset for an animated gacha or smart-slot battle screen, not a comic-book cover or painterly illustration.

## Core Workflow

1. Treat the provided artwork as the edit target. Inspect it before generating.
2. Use the built-in image-generation edit workflow with the source image as Image 1.
3. Add the original card or raw character art only as a design and palette reference; never let it replace the edit target's pose or framing.
4. Preserve identity aggressively: face, hair silhouette, expression, body proportions, costume, armor shapes, weapons, pose, viewing direction, crop, and transparency.
5. For transparent assets, request a clean transparent cutout. If the generator returns green or checkerboard pixels, remove the background with the local imagegen cleanup workflow, then verify all four corner alpha values are zero.
6. Save a descriptive revision, then update the project's canonical asset only after visual inspection.

## Rendering Direction

- Use confident, clean, dark or color-matched anime lineart with tapered contours.
- Use hard-edged 2-3 tone cel-shadow shapes rather than soft painterly modeling.
- Separate base color, shadow, and highlight clearly on every material.
- Use graphic highlight blocks on metal, hair, eyes, leather, and magic effects.
- Keep colors vivid through clean separation, not uniform saturation: ivory/silver, warm gold, navy, teal, red, and jewel accents can be strong while skin and broad surfaces remain controlled.
- Preserve readable midtones and deep but legible shadows.
- Simplify micro-texture and avoid airbrush haze, photographic lighting, or glossy 3D rendering.
- Favor a strong silhouette and clear overlapping shapes that remain readable at game scale.
- Keep the composition asset-focused: no cover-page layout, poster drama, UI, text, or decorative environment unless explicitly requested.

## Prompt Template

```text
Use Image 1 as the exact edit target. Preserve the character identity, face, hair silhouette, expression, pose, body proportions, costume, weapon, viewing direction, framing, and transparent cutout.

Re-render it as a vivid 1980s-1990s anime cel-shaded game asset: bold clean tapered lineart, hard 2-3 tone cel shadows, graphic highlight blocks, distinct base/shadow/highlight separation, crisp silhouette, readable overlapping shapes, and polished gacha battle cut-in quality. Use vivid but controlled colors with strong local contrast and readable midtones. Keep the design simpler and more graphic than a painterly illustration.

Avoid comic-book cover composition, soft airbrush rendering, watercolor texture, photorealism, cinematic poster lighting, glossy 3D surfaces, excessive micro-detail, muddy shadows, washed-out colors, uniform neon saturation, redesign, changed pose, changed face, extra limbs, extra weapons, text, UI, logo, watermark, or new objects.
```

## Transparent Background Handling

- Prefer a true transparent background.
- If a chroma key is needed, use bright green only as a temporary removal color and never keep it in the final asset.
- Do not accept baked checkerboard pixels as transparency.
- After cleanup, inspect the silhouette for green/white spill, especially hair tips, sword edges, cape edges, and thin armor details.
- Verify the final dimensions match the source unless a different size is requested.

## Review Checklist

- Does it read as cel animation at thumbnail size?
- Are lineart, shadow shapes, and highlight shapes visibly distinct?
- Are the colors vivid but controlled rather than neon or washed out?
- Is the face, hair, costume, weapon, pose, and direction faithful to the source?
- Are dark areas still readable and bright areas not clipped?
- Does the silhouette remain clean and production-ready?
- Is the background genuinely transparent with no checkerboard baked in?

