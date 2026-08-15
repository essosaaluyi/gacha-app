---
name: premium-anime-color-correction
description: Apply a premium HDR anime color grade and upscale pass to game/anime artwork while preserving the original design. Use when the user asks to upscale, enhance, color correct, color grade, HDR grade, OLED finish, premium anime finish, jewel-tone grade, or commercial-quality polish character cards, battle art, gacha cards, UI art, or fantasy/anime illustrations without changing identity, pose, framing, or design.
---

# Premium Anime Color Correction

## Purpose

Use this skill to transform existing anime/game art into a polished premium HDR look while keeping the source design faithful. The goal is richer tonal depth and commercial finish, not a redesign.

## Workflow

1. Treat the input image as the edit target, not only a style reference.
2. Inspect the source image first when it is provided as a local file.
3. Use the built-in image generation edit workflow for the visual enhancement.
4. Preserve identity aggressively: face, pose, silhouette, outfit, armor, border, composition, background motif, and important object shapes.
5. Save outputs non-destructively with a descriptive filename such as `*-premium-anime-hdr.png` or `*-hdr-upscale-preview.png`.
6. If the edit changes the crop or design too much, call it out and create a stricter second pass.

## Core Prompt

Use this prompt structure and adapt only the bracketed parts:

```text
Use case: style-transfer
Asset type: game character card art upscale and color grade
Primary request: Upscale and enhance the provided [art/card/character image] while preserving the exact character identity, pose, composition, border, outfit, armor shapes, facial expression, hair silhouette, and background motif.
Input images: Image 1 is the edit target and must be preserved faithfully.
Style/medium: premium commercial anime illustration, polished OLED display finish, high-resolution clean rendering.
Enhancement: increase apparent resolution and clarity, refine line quality, sharpen important facial/hair/armor/material details naturally, improve texture detail without changing the design.
Color grade: Premium HDR anime color grade, deep cinematic shadows, luminous warm highlights, cool blue-violet shadow tint, strong local contrast, rich midtones, smooth color gradients, selective jewel-tone saturation, glossy specular highlights, subtle bloom, clean HDR tonemapping.
Constraints: preserve detail in both dark and bright areas; do not oversaturate the entire image; do not flatten shadows; do not clip highlights; avoid muddy colors, gray shadows, washed-out midtones, harsh halos, plastic skin, warped hands, changed face, changed eyes, changed outfit, changed border, extra text, watermark, or new objects.
```

## Color Grade Rules

- Push contrast locally, not globally.
- Keep shadows deep but readable; tint them subtly cool blue-violet instead of gray.
- Keep highlights warm and luminous without clipping.
- Saturate selectively: teal, gold, jewel accents, magic effects, and specular armor details can be richer; skin and broad background areas should stay controlled.
- Preserve smooth gradients and midtone richness.
- Add bloom lightly around magical, water, metal, or rim-light details only.
- Keep facial likeness and hand anatomy higher priority than detail hallucination.

## Review Checklist

After generation, inspect for:

- The face, pose, hair silhouette, outfit, and card border still match the source.
- The crop/framing did not unintentionally tighten unless requested.
- Dark armor/hair retain detail and do not become muddy black.
- Bright water/magic/sky areas retain texture and are not blown out.
- The whole image feels premium and glossy, but not uniformly oversaturated.
- No new text, watermark, extra objects, or altered character design appeared.