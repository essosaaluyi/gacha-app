# UI Design Refinement — Discussion Kickoff Prompt

Paste the prompt below into a new session to start the UI refinement milestone.

---

We are starting the **UI design refinement milestone** for the gacha battle app
(Next.js + PixiJS pachislot-inspired web game, desktop-first, my dev server
runs on :3000 — never start a second one). This is a **discussion and planning
session first — do not write code until we agree on a plan.**

## What I want from this session

1. **Audit the current UI.** Open the running app in the browser
   (localhost:3000) and walk the main screens: title, menu, gacha (with the
   daily lineup panel), battle, inventory, history, gift box overlay, and the
   trust pages. Capture what works, what feels rough, and where the visual
   language is inconsistent (colors, typography, spacing, buttons, dialogs,
   motion).

2. **Research current trends on the net.** Look up 2025–2026 UI patterns for
   web gacha games, pachislot/pachinko presentation, and mobile gacha titles
   (reveal ceremonies, lobby/menu design, reward flows, data counters). Bring
   back concrete, sourced ideas — what top titles do for hierarchy, juice,
   and readability — and note which fit a desktop web game.

3. **Discuss with me, in depth,** these tracks:
   - **Design system**: unified palette, typography, spacing, button/dialog
     styles, rarity color language (R/SR/SSR/UR), motion rules.
   - **Game page visual rework**: page-by-page redesign proposals, starting
     with the pages players see most (menu, gacha, battle).
   - **UI functions**: navigation structure, TopBar economy readouts,
     confirm-dialog patterns, overlay consistency, feedback when points
     change.
   - **New ideas**: anything the research surfaces that would raise the
     production feel (ambient motion, sound-linked UI, live counters, etc.).

4. **Converge on a plan.** End the session by writing a prioritized, phased
   UI refinement plan (what changes, which files/pages, in what order) saved
   to a brief file — implementation happens in later sessions against that
   brief.

## Constraints
- Keep the PixiJS battle stage internals intact — this milestone is DOM/CSS
  UI, page layouts, and overlays, not the battle renderer.
- Values that may need tuning should stay editable (patchConfig / admin).
- Assets folder is 2GB+ — never scan asset directories; ask before opening
  any binary/media file.
- Shop is on hold (no content or Shopify integration yet) — exclude it.
- Ask me questions whenever a direction choice is mine to make; I want a
  conversation, not a monologue.
