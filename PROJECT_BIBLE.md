# Gacha Battle Project Bible

Last updated: 2026-06-26

This document is the shared source of truth for the gacha battle game. Use it to keep development, design, balancing, QA, and future chats aligned.

## Core Vision

The game is a gacha-based battle game with card-game visuals and slot-machine structure.

The player draws cards, arranges the battle deck, then watches the battle resolve through staged reveals, fakeouts, omens, inserts, and attack results. The experience should feel closer to a Japanese smart slot / pachislot presentation than a normal turn-based card game.

The important design goal is not only the math result. The emotional rhythm matters:

- Pull anticipation
- Card flip timing
- Omen visuals
- Fakeout inserts
- Battle opening
- Round insert
- Hit or dodge payoff
- Bonus / point reward confirmation

## Current Tech Stack

- Next.js
- React
- TypeScript
- PixiJS
- Supabase
- Browser-first web app
- Future target: mobile app release

Read `AGENTS.md` before code changes. This project uses a Next.js version with breaking changes from older conventions.

## Current Game Flow

1. Player starts from the top page.
2. Player performs a gacha pull.
3. Pull result becomes the player's battle cards.
4. After reveal, the player sees the battle deck order screen.
5. Player may shuffle once.
6. Final card order is read top-left to bottom-right:
   - Top row: 1 to 5
   - Bottom row: 6 to 10
7. Player begins battle.
8. Battle opening plays.
9. Round 1 starts.
10. Battle proceeds through card flips, omens, fakeouts, attacks, enemy counter, and rewards.

## Gacha To Battle Rules

The gacha result must connect directly to the battle.

- Pulled cards become the player's active battle deck.
- The battle deck order matters.
- The current player card should be visible in battle context.
- Card ability information should come from the pulled card profile.
- Future card abilities should be defined as explicit data, not hidden inside animation code.

Current placeholder ability direction:

- Higher rarity cards should feel stronger or more dramatic.
- Abilities may affect attack, guard, bonus, fakeout, points, or visual presentation.
- Card origin text can be used in fakeout inserts.

## Slot Machine Philosophy

The game result can be predetermined, but the presentation should create anticipation.

Important distinction:

- The system decides whether an important event succeeds or fails.
- The UI presents fakeouts, colors, timing, and cut-ins that suggest the chance to the player.
- A strong color does not guarantee success, but it should usually feel more meaningful.

This allows the game to feel like a smart slot machine while still using card and battle visuals.

## Attack Probability

The attack probability value was reduced from 24 to 2 during current tuning.

This makes attack outcomes appear much more often during internal testing, so the battle loop can be tested and refined faster.

This is a testing/balancing value and may change later.

## Battle Presentation Rules

Presentation is a core system, not decoration.

The battle should support overlay-style events that can interrupt or sit above the main battle:

- Battle opening
- Round insert
- Magic circle omen
- Chance icon overlay
- Player fakeout insert
- Enemy fakeout insert
- Final hit or dodge payoff
- Bonus confirmation

Each visual event should be connected to battle state, card state, or result state.

## Magic Circle Omen

When the player draws an Empty result:

- There is a 20 percent chance to show a glowing magical circle.
- The magical circle appears in the middle of the upper battle screen.
- Each card flip makes it flicker and fade slightly.
- It clears after the final flip of that draw.

Purpose:

- Empty results should still sometimes feel suspicious or exciting.
- The player should wonder whether the empty draw is hiding something.

## Chance Icon Overlay

When drawing Chance cards:

- There is a 50 percent chance to show the chance icon overlay.
- Three chance icons appear aligned above the three card positions.
- The icon appears as a white glowing silhouette first.
- It scales from 0 to 100 percent.
- It bounces or pulses like an elastic object.
- Star-like glow animation should play.
- It stays until the first card flip.

Current asset:

- `public/images/chanceicon.png`

## Attack Fakeout Inserts

Attack fakeouts use insert panels inspired by Japanese slot-machine battle presentation.

Fakeout sequence:

1. First fakeout insert:
   - Shows the current player card character.
   - Position: slightly left/top from center.
   - Text: a line related to the player's card origin.
2. Second fakeout insert:
   - Shows the current enemy.
   - Position: from right, slightly right/bottom from center.
   - Text: a line related to the enemy origin.
3. Final fakeout:
   - No text insert.
   - The player card should visibly attack.
   - Enemy either gets hit or dodges.

Text insert color communicates anticipation.

Colors:

- White: default, can happen at any probability.
- Blue: slightly hopeful, success chance over roughly 20 percent.
- Green: stronger hope, success chance over roughly 50 percent.
- Red: high anticipation, success chance over roughly 90 percent.

Distribution when predetermined result is fail:

- White: 45
- Blue: 30
- Green: 15
- Red: 10

Distribution when predetermined result is success:

- White: 25
- Blue: 20
- Green: 30
- Red: 25

Design intent:

- Red should be rare during fail fakeouts.
- Red should be more common during success fakeouts.
- Success should not be too obvious, so white and blue can still appear on success.

## Round Insert

Round inserts should feel bold, glossy, and battle-focused.

Current direction:

- No sword behind the text.
- No extra banner behind the text.
- Use glossy white / silver text.
- Keep the background round image visible.
- Position text lower-right enough that it does not block the main image.

## Battle Points

Battle points are part of the reward loop.

Current behavior:

- Member points can load through Supabase.
- Guest points can use local storage.
- Bonus result confirmation can add battle points.

Future direction:

- Points should connect to unlocks, progression, upgrades, or pull economy.
- Point reward timing should feel satisfying, not purely informational.

## Asset Rules

Use clear filenames.

Recommended card folders:

- Player cards: `public/images/cards/player/<CARD_NAME>/`
- Enemy cards: `public/images/cards/enemy/enemy<ID>/`

Each card folder should contain:

- `card.png`: current in-game card image
- `page.md`: character name and notes for Developer / Designer
- `character-sheet/`: designer-created character sheet assets
- `references/`: reference images for that character

Other recommended folders:

- General assets: `public/images/`
- Battle-specific assets: `public/images/battle/`
- Battle symbols: `public/images/battle-symbols/`
- Round inserts: `public/images/round-inserts/`
- Bonus assets: `public/images/bonus/`

Avoid changing asset names casually once code references them.

## Design Department Prompt

Use this in a separate design-focused chat when creating visual assets.

```text
You are the Design Department for my gacha battle game.

Your responsibility is visual design only. Do not write production code.

Create asset concepts, image prompts, UI direction, character sheets, enemy designs, card visuals, battle backgrounds, overlay text styles, and animation sheet plans.

Default style:
- anime cel-shaded fantasy RPG
- clean lineart
- readable silhouettes
- game asset quality
- strong battle presentation

For every asset, provide:
- Asset name
- Purpose
- Prompt
- Negative prompt
- Aspect ratio
- Background requirement
- Filename
- Developer notes
```

## Producer Prompt

Use this in a separate planning-focused chat when deciding what to build next.

```text
You are the Producer / Project Manager for my gacha battle game.

Do not write production code.
Do not create final artwork.

Your job is to organize the roadmap, priorities, milestones, risks, and handoff instructions.

Always keep scope controlled and focus on what should be done next.

When planning, provide:
- Current goal
- Priority order
- Small task breakdown
- What should be handed to Developer
- What should be handed to Design
- What should be tested by QA
```

## QA Prompt

Use this in a separate QA-focused chat when checking a feature.

```text
You are the QA tester for my gacha battle game.

Do not rewrite code unless explicitly asked.

Your job is to find bugs, edge cases, missing states, unclear UX, and progression blockers.

For every issue, provide:
- Problem
- Steps to reproduce
- Expected result
- Actual result
- Severity
- Suggested fix direction
```

## Current Development Priorities

Near-term priorities:

1. Make the gacha-to-battle connection feel complete.
2. Make player card abilities visible and meaningful.
3. Improve attack fakeout final payoff: hit, dodge, and enemy counter.
4. Add stronger visual presentation for card-specific and enemy-specific moments.
5. Refine battle point rewards and progression.
6. Continue adding assets without breaking the battle loop.

Do not overbuild mobile-specific behavior yet. Keep layouts responsive, but focus first on making the browser game loop fun and stable.

## Development Rule

Prefer small, safe changes.

Before changing battle logic, identify:

- What state drives the feature
- What visual reacts to that state
- What clears or resets the state
- What happens if the player navigates away or starts a new battle

Every presentation system should have a clear start, update, and cleanup path.
