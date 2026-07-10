# Claude Project Handoff - Gacha Battle App

Updated: 2026-07-05
Workspace: `C:\Users\essos\Desktop\gacha-app`

This file is the continuity handoff for Claude. It combines the current project state, cross-thread decisions, open risks, and communication preferences from the Codex project chats.

## Start Here

1. Read `AGENTS.md` first.
   - File URL: file:///C:/Users/essos/Desktop/gacha-app/AGENTS.md
   - Important: this project uses a Next.js version with breaking changes. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/`.
2. Treat `PROJECT_BIBLE.md` as the main product source of truth.
   - File URL: file:///C:/Users/essos/Desktop/gacha-app/PROJECT_BIBLE.md
3. Assume the git tree is intentionally messy. Many files are modified or untracked from parallel work. Do not revert, delete, or clean anything unless the user explicitly asks.
4. Verify visual claims in the browser or screenshots. The user has repeatedly caught cases where "fixed" reports did not match the preview.
5. When handing work to dev/design teams, give a precise copy-paste prompt with: page/area, observed issue, likely files, acceptance checks, and what remains unclear.

## How To Respond To The User

- The user writes fast and often with typos. Infer intent generously, but ask a short question if the request is genuinely ambiguous.
- Keep language clear, warm, and practical. The user wants progress, not ceremony.
- Use non-technical wording by default. Mention commands, code details, and file internals only when useful.
- For review requests, lead with findings and exact next instructions. Do not simply repeat team reports.
- For visual/UI issues, inspect the actual page or asset before confirming.
- For project oversight, separate status into: confirmed, active, undone, unclear, and next action.
- For handoffs, include file URLs and thread IDs so another assistant can continue without guessing.
- The user values precise revision prompts for devs/designers. Make them direct and testable.
- If something is uncertain, say what evidence is missing and how to verify it.

## Product Snapshot

The project is a web-based gacha battle game with a slot/pachislot style presentation. The intended emotional rhythm is:

start -> gacha pull -> card reveal/flip -> battle deck order -> battle opening -> battle rounds -> results/rewards

The app uses a Next.js website shell with React UI, Pixi/canvas battle layers, CSS/React overlays, and lazy image/video inserts for dramatic effects.

Key source:
- `PROJECT_BIBLE.md`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/PROJECT_BIBLE.md

Main package:
- `package.json`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/package.json
  - Scripts seen: `dev`, `build`, `start`, `lint`, `sync:game-config`
  - Stack includes Next.js 16.2.4, React 19.2.4, PixiJS 8.18.1, Supabase.

## Project Threads Reviewed

Use these thread IDs when referring back to Codex project chat history:

- Review team: `019f0d3f-04e2-7af0-9428-2b21147ccfc7`
- Dev: `019eff43-6157-7482-8933-73f17487bf70`
- Animation: `019f116e-121f-7d82-bcac-eeecdb55a80e`
- Designer team A: `019f03f3-1d58-7e01-86bd-18fc3114c45a`
- Designer team B: `019f08fd-a891-7460-a885-1dd982294242`
- Designer team C: `019f0c2e-18bf-7953-a3e8-7aa3e62a9a99`
- Project R&D: `019f076e-39b2-76b3-9c70-260351bd45e9`
- Research: `019f0764-167f-7fc2-b553-6a8d69efcf94`
- MEETING ROOM: `019f042a-dd03-79f2-9fb5-503229218eda`
- Documents: `019f0d0e-efca-7463-8bd2-68a056ea9c62`
- Config admin: `019f0406-c82d-78b1-b569-1ead39582340`

## Confirmed Milestones

- Project bible exists and describes the core gacha battle flow and emotional pacing.
- Spreadsheet-driven game config exists.
- Trust/legal content pass was drafted and partially implemented.
- Battle animation workstation exists and has been used to derive layer values.
- Battle background parallax assets exist and are wired into runtime files.
- Battle roadmap assets exist.
- Asset/performance audit was completed in chat history, but some generated report files are no longer present in the workspace.
- Dev reported builds pass with lint warnings only in several recent threads. Re-run before relying on this for a new handoff.

## Current Hot Areas

### 1. Battle reveal and card flip

Recent Dev work focused on `/battle`, especially R1 Triplets Baby Dragon reveal, card front/back flip, white glow, particles, burst timing, and character spawn.

Recent reported fix:
- Front card face was restored as a normal visible layer.
- The front-face `180deg` transform that hid the card was removed/changed.
- Parent card turns to edge and returns flat.
- Particle/burst delay after glow was preserved.

Still needs Claude/browser verification:
- Does `/battle` show the card front after flip?
- Are there any vertical/horizontal seams on the card during flip?
- Does the character jump or drift when moving from stand frames to idle?
- Does R1 Triplets use the same saved preset values as `/animation-workstation`?

Likely files:
- `app/battle/page.tsx`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/app/battle/page.tsx
- `app/globals.css`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/app/globals.css
- `components/battle/BattleSpawnScene.tsx`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/components/battle/BattleSpawnScene.tsx
- `components/battle/AnimationWorkstation.tsx`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/components/battle/AnimationWorkstation.tsx
- `app/animation-workstation/page.tsx`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/app/animation-workstation/page.tsx

### 2. Animation workstation values

Animation team direction:
- Do not bake a full idle scene as one giant video or PNG sequence.
- Use layered scene system: camera/scene controller, background parallax, card layers, character cutout/idle loop, shared effects, UI, premium cut-in layer.
- Sprites are good for short loops/effects. Avoid giant full-screen sprites.

Latest Mami workstation values from Animation thread:
- Stage: `1280x720`
- Coordinate system: layer top-left `x/y`
- Stand frames: 87
- Idle frames: 90
- Sampled idle frame: 35
- Timeline:
  - `cardBack`: 0-1700
  - `cardFront`: 1700-3150
  - `particle`: 2050-3950
  - `burst`: 2050-3550
  - `stand`: 2600-5558
  - `idle`: 5558-7600
- Layers:
  - `cardBack`: x 142, y 290, scale 1, opacity 1
  - `cardFront`: x 142, y 290, scale 1, opacity 0.62
  - `particle`: x -82.2, y 106.4, scale 1.2, opacity 1
  - `burst`: x 132.6, y 315.2, scale 1, opacity 0.26
  - `stand`: x 88.2, y 265.6, scale 1, opacity 1
  - `idle`: x 56.2, y 256.4, scale 1, opacity 0.58
- Save key was bumped to `mami-layer-workstation-timeline-v2`.

Mami frame folders:
- `public/images/battle-characters/mami/stand`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-characters/mami/stand/
- `public/images/battle-characters/mami/idle`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-characters/mami/idle/

R1 Triplets Baby Dragon reported battle preset:
- preset id: `r1-triplets-baby-dragon`
- standFrameCount: 82
- idleFrameCount: 173
- sampledIdleFrame: 110
- duration: 7600ms
- Dev reported `/battle` loads the same saved preset as `/animation-workstation`.

### 3. Battle background parallax

Designer team C restored the four-layer day-field parallax stack after a foreground-only regression.

Runtime layers:
- `public/images/battle-assets/day-field-parallax-layers/01-far-background.png`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-assets/day-field-parallax-layers/01-far-background.png
- `public/images/battle-assets/day-field-parallax-layers/02-mid-background.png`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-assets/day-field-parallax-layers/02-mid-background.png
- `public/images/battle-assets/day-field-parallax-layers/03-gameplay.png`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-assets/day-field-parallax-layers/03-gameplay.png
- `public/images/battle-assets/day-field-parallax-layers/04-foreground.png`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-assets/day-field-parallax-layers/04-foreground.png

Important notes:
- User corrected layer hierarchy: far should be full picture, mid should be most picture, gameplay should be half, foreground should be least.
- Avoid hard horizontal strip layers and ghost overlaps.
- A previous bug duplicated the far layer in `components/battle/BattleBackground.tsx`; confirm it has not returned.

Likely files:
- `components/battle/BattleBackground.tsx`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/components/battle/BattleBackground.tsx
- `public/images/battle-assets/day-field-parallax-layers/README.md`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-assets/day-field-parallax-layers/README.md
- `outputs/battle-backgrounds/day-field-parallax-dev-update.md`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/outputs/battle-backgrounds/day-field-parallax-dev-update.md
- `outputs/battle-backgrounds/day-field-parallax-full-refresh-preview.png`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/outputs/battle-backgrounds/day-field-parallax-full-refresh-preview.png
- `outputs/battle-backgrounds/day-field-battle-space-parallax-package-refreshed.zip`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/outputs/battle-backgrounds/day-field-battle-space-parallax-package-refreshed.zip

### 4. Rules/Odds page visual overlap

The user reported that even after Dev said the rules/settings-style rows were fixed, preview still showed overlaps between text and graphic borders.

Review team guidance to Dev:
- Inspect `/rules` directly at desktop, tablet, and mobile.
- Make every rule/manual row a true self-contained panel with its own border/background.
- Remove or disable decorative frame graphics that cut across multiple rows.
- Avoid using one stretched table/frame behind all rows.
- Stabilize text sizing and line-height.
- Ensure long labels wrap inside the border.
- Check at 390x844, 768x900, and desktop widths.

Likely files:
- `app/rules/page.tsx`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/app/rules/page.tsx
- `components/trust/RulesOddsSection.tsx`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/components/trust/RulesOddsSection.tsx
- `app/globals.css`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/app/globals.css

Status: unresolved until browser verification proves the overlaps are gone.

### 5. Game config and admin control

Config admin created spreadsheet-backed game configuration.

Key files:
- `game-config/game-config.xlsx`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/game-config/game-config.xlsx
- `tools/sync-game-config-from-spreadsheet.py`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/tools/sync-game-config-from-spreadsheet.py
- `tools/sync-game-config.cmd`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/tools/sync-game-config.cmd
- `lib/game-config/generated.ts`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/lib/game-config/generated.ts

Command:
- `npm run sync:game-config`
- Windows fallback: `npm.cmd run sync:game-config`

Workbook covers:
- card pool
- rarity probabilities
- player card profiles and abilities
- enemies
- enemy weights
- battle result odds
- combinations
- bonus points/rewards
- UI/game numbers
- admin settings

Important: editable `file_name` columns were added for Cards and Enemies. Sync uses those to build image paths.

### 6. Trust pages and public copy

Documents team created Phase 1 trust foundation copy. Public copy should stay conservative and should not promise unsupported legal, economy, reward, or battle odds details.

Known public odds:
- R: 60%
- SR: 25%
- SSR: 10%
- UR: 5%

Known content decisions:
- Rarity odds can be shown.
- Point economy values are test-build/unconfigured.
- Battle odds wait for product confirmation.
- Analytics/marketing cookies remain off unless implemented.

Likely files:
- `components/trust/RulesOddsSection.tsx`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/components/trust/RulesOddsSection.tsx
- `outputs/docs/phase-1-trust-foundation-by-category/README.md`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/outputs/docs/phase-1-trust-foundation-by-category/README.md
- `outputs/docs/phase-1-trust-foundation-by-category/11-dev-team-update-prompt.md`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/outputs/docs/phase-1-trust-foundation-by-category/11-dev-team-update-prompt.md
- `outputs/docs/phase-1-trust-foundation-by-category/12-internal-content-decisions.md`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/outputs/docs/phase-1-trust-foundation-by-category/12-internal-content-decisions.md

Note: verify these document output paths before citing them externally; some old output folders were cleaned in earlier R&D work.

### 7. Performance and asset loading

MEETING ROOM findings:
- `public` was previously around 1.09GB.
- PNGs and MP4s were the largest contributors.
- PNG-to-WebP automation reportedly found 109 runtime PNG candidates: 181.10MB -> 11.82MB, about 93.5% savings.
- Original PNGs were untouched.
- The old report file `outputs/asset-optimization/png-webp-report.csv` was referenced in chat history but is not present in the current workspace as of this handoff.

Known video concern:
- After user compression, video total was still about 258.98MB.
- `public/videos/bonus/bonus-opening.mp4` was still about 104.94MB.
- Gacha route may preload too much video. Recommendation from meeting: preload only standard/standard2 lightly, then load SSR/UR/freeze videos after result.

Likely performance files:
- `public/videos/`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/videos/
- `tools/optimize-png-assets.py`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/tools/optimize-png-assets.py

Open task:
- Update runtime references from PNG to WebP where safe, then test visuals.
- Recreate/report current asset sizes because the old CSV is missing.

### 8. Design assets

Designer team A:
- Latest focus: R4 Young Knight references and side/fight stance.
- Also worked on Triplets Baby Dragon, Blood Man correction, and Mami character sheets/references.

Likely paths:
- `public/images/cards/player/R4/character-sheet/`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/cards/player/R4/character-sheet/
- `public/images/cards/player/R4/references/`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/cards/player/R4/references/
- `public/images/characters/`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/characters/

Designer team B:
- Created low-angle heroic camera kit and Mami action/pose assets.
- Saved Triplets Baby Dragon side-facing asset.

Likely paths:
- `output/design-templates/team-b-low-angle-heroic/`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/output/design-templates/team-b-low-angle-heroic/
- `public/images/characters/triplets-baby-dragon-side-facing-right.png`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/characters/triplets-baby-dragon-side-facing-right.png

Warning: some older `output/` artifacts may have been deleted during cleanup. Check file existence before relying on them.

### 9. Battle roadmap

Battle roadmap assets exist:
- `public/images/battle-roadmap/battle-progress-roadmap-10.svg`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-roadmap/battle-progress-roadmap-10.svg
- `public/images/battle-roadmap/battle-progress-track.svg`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-roadmap/battle-progress-track.svg
- `public/images/battle-roadmap/README.md`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-roadmap/README.md
- `public/images/battle-roadmap/station-boss.svg`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-roadmap/station-boss.svg
- `public/images/battle-roadmap/station-cleared.svg`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-roadmap/station-cleared.svg
- `public/images/battle-roadmap/station-current.svg`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-roadmap/station-current.svg
- `public/images/battle-roadmap/station-upcoming.svg`
  - File URL: file:///C:/Users/essos/Desktop/gacha-app/public/images/battle-roadmap/station-upcoming.svg

Status: assets are ready, but current integration state should be checked in the app before saying the feature is complete.

## Historical Outputs Missing From Current Workspace

These were created or referenced in chats, but not found during this handoff check:

- `outputs/gacha-progress-review-milestone-report.pptx`
  - Historical file URL: file:///C:/Users/essos/Desktop/gacha-app/outputs/gacha-progress-review-milestone-report.pptx
- `outputs/asset-optimization/png-webp-report.csv`
  - Historical file URL: file:///C:/Users/essos/Desktop/gacha-app/outputs/asset-optimization/png-webp-report.csv

If the user asks for an updated presentation/report, regenerate it instead of assuming these files are still available.

## Recommended First Actions For Claude

1. Read this file, then `AGENTS.md`, then `PROJECT_BIBLE.md`.
2. Check current git status and treat unrelated changes as user/team work.
3. If editing any Next.js file, read the relevant Next docs under `node_modules/next/dist/docs/` first.
4. If the task is visual, start or attach to the dev preview and inspect the exact route.
5. For `/battle`, compare `/animation-workstation` values against runtime behavior before changing animation math.
6. For `/rules`, inspect small mobile and desktop widths before claiming the overlap issue is fixed.
7. Keep fixes scoped to one area at a time. This project has many parallel active surfaces.

