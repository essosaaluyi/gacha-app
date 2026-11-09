# Gacha Battle Project Bible

Last updated: 2026-11-09

This document is the shared source of truth for the gacha battle game. Use it to keep development, design, balancing, QA, and future chats aligned.

## Current Implementation Status

The 2026-10-31 read-only team audit traced current source and ran limited checks. This section records implementation, not blanket visual or end-to-end approval. Use `session-handoff.md` for the latest task and checks, and `outputs/character-abilities/current-character-ability-audit.md` for the character/rule matrix.

| Area | Current evidence | Remaining work |
| --- | --- | --- |
| Gacha and battle | Pull results, deck ordering/one shuffle, table-card rules, Fatal modes, bonuses and collection are connected in source. | Full browser acceptance remains outstanding. |
| Character mechanics | Individual printed W RATE, UR3's per-round 66-89 roll, and Mami's post-collection BAR boost exist in source. | Most other authored individual abilities are not integrated; reconcile historical proposals before implementation. |
| Enemy Fatal — corrected (2026-11-06) | Idle-at-zero entry only: non-Empty0%, Empty50%, once per committed game. Original finite window restored: default3 draws including trigger, no active-window entry reroll. Entry third stop warns650ms; final third stop shows1800ms ENEMY then stored survival/refill or defeat. Evidence: latest correction in `outputs/ui-review/2026-11-06/enemy-fatal/pm-qa.md`; Kai25 focused/type pass, scoped lint0 errors/1 existing warning; Riku10 normal checks and legacy-recovery1/1 clear. | Owner visual judgment pending; temporary attack screens. Real-save/legacy Continue and production frequencies not browser-tested; phone/full-game coverage not exhaustive. Owner clarified2026-11-08: 書き換え抽選 means the existing drawn-card attack-to-avoidance outcome override; terminology closed, no symbol redraw/replacement requested. |
| Battle persistence | Snapshots, Continue Battle and some per-mode persistence exist. | Stage initialization overwrites restored deck/enemy state; Fatal/fakeout/nested-bonus coverage, draw discounts and snapshot validation need work. |
| R1/R2 animation | Both have runtime summon/idle sequences and struggle layers. R1 has detailed sonic-attack production material. | R1's final bespoke cinematic is not established as integrated; R2's exact attack/timed storyboard is pending. |
| Air-tank 3D lab (2026-11-03) | Real Three.js `/air-tank-lab` with current card art, collision prevention, particle/light spirals and button-triggered curved-glass crack growth/repair. Owner later authorized embedding the tank in `/battle`, recorded separately below. Earlier lab recording verified; revision recording-time hit source-checked only. | Actual smartphone performance unverified; accurate fluid physics, physical glass fragments and refraction absent. |
| Player dock / two-step DRAW (2026-11-09) | Production tank/old3D flight unmounted, preserved sources/labs/assets. Dock summon target and active-card display; DRAW1 commits once→3 backs SET/unlimited wait; DRAW2 free flat2:3 release→manual table flips. Prior PM live and independent recovery evidence: outputs/ui-review/2026-11-08/player-dock-two-step/pm-qa.md. | Owner visual acceptance pending. Free fixture is not paid wallet/G/browser-save proof; phone/GPU/contextloss/all modes not exhaustive. Resurrection disabled/unexercised. Earlier tank/one-press presentation superseded. |
| Checks | TypeScript passed; deck tests passed 3/3; scoped application lint had 0 errors and 87 warnings. | Integration/browser coverage is limited and the balance simulator is stale. |

The existing Design Department, Producer and QA prompts below remain role guidance. Reusable role profiles are in `.codex/agents/`; `AGENTS.md` defines delegation, ownership and handoffs. Product decisions belong here, current task progress belongs in the handoff, and historical design remains labeled as historical. An audit finding proposes work; it does not authorize a gameplay change.

### Gacha Studio Team

| Name | Role | Owns |
| --- | --- | --- |
| Ren / レン | Project Manager | Priorities, task ownership, decisions and handoffs. |
| Aki / アキ | Game Systems Designer / Critical Reviewer | Mechanic proposals, risk/reward, ability/bonus interactions and independent critique. No implementation. |
| Kai / カイ | Game Developer | Gameplay, state/persistence, React/Pixi integration and runtime playback. |
| Mio / ミオ | UI / Cabinet Designer | Cabinet graphics, layout, typography, color, frames/LED/buttons and assigned CSS/presentational markup. |
| Sora / ソラ | Animation Director | Character art, storyboards, animation and cinematic delivery. |
| Riku / リク | QA Tester | Independent gameplay, integration, responsive and visual verification. |
| マイニガ | 3D Artist / WebGL Prototyper (`tank_3d_artist`) | Isolated Three.js air-tank, materials/camera and card-shuffle prototypes; current card art read-only. Production integration remains Kai's, cabinet/UI Mio's and character art Sora's. |
| Kiwi / キウイ | Frontend Web Designer / Developer (`frontend_designer`) | Assigned Web pages, responsive layout, accessibility and frontend presentation/interaction code. Existing Mio cabinet/UI and Kai gameplay/runtime ownership remains; shared files require explicit coordination. |

The PM chooses at most three concurrent workers from the seven specialties. Cabinet/UI, frontend Web work, character animation and assigned 3D work have distinct file owners; shared component or scene changes are coordinated before editing. Planning meetings use the owner's proposal, Aki's real supporting/critical review, and Ren's concise summary with one unresolved question; opposition is evidence-based rather than performative.

Each member has a named local project chat, registered in the current section of `session-handoff.md`. Ren is the coordination entry point. Run only the needed roles; use one chat per coherent task, brief milestone handoffs and fresh context when starting a different task. Compaction can preserve continuity for the same ongoing problem. Separate chats and more agents do not themselves guarantee lower usage. Keep old records available without loading them into every task.

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

## Character Direction

Owner direction (2026-11-01): character appeal is visual-first. Players should want the appearance and want to use the character's distinctive ability. Personality and deep backstory are not primary requirements for this game.

| Question | Review standard |
| --- | --- |
| Why want the character? | Its visual design should be desirable, recognizable and memorable. Do not assume polish alone establishes appeal. |
| What is it? | A brief identity: what person/creature/entity it is and what it does. Express that premise through appearance rather than expanding lore. |
| Why use it? | Its individual ability changes the experience of playing. Approved intent and current runtime implementation remain separate. |
| Where is it from? | Characters may be summoned from different worlds. A unified origin world is not required; cross-world summoning/battle is the shared premise. Battle-royale-like flavor does not itself specify a new multiplayer mode. |

Review one character at a time using its existing approved references: one-line identity, distinctive visual attraction, ability/play difference, and evidence-based keep/change points. The owner assigned Aki to compile one existing-image review page per player character (15 verified in the current roster), with names, short background/identity, ability design and implementation status. Visual selling points and keep/change decisions remain open for joint review. New review documents are authorized; new artwork and ability implementation are not. Do not turn the multi-world premise into a forced common lore or an automatic change to approved art styles.

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
2. One pack always yields five cards; new single-card pulls are removed. Existing opening video/3D pack reveal and battle-hand preparation continue. Member-five DB compatibility is still unverified and guarded before payment; legacy single histories remain.
3. Enter battle: Enemy Insert and enemy summon precede unused-hand selection.
4. Click a hand card to inspect; drag onto the upper-left player dock (or use existing keyboard confirmation) for Yes/No. Old field drop is rejected. Only Yes commits that instance; its card remains in the dock and its character appears on the field.
5. DRAW1 commits payment/lottery/G/counter once and sequentially sets three backs below the dock outlet (0/160/320ms, SET ready650ms). SET waits indefinitely, including while inspecting cards. Production tank/mix/old3D flight are unmounted; their source/lab/assets remain preserved.
6. DRAW2 costs nothing and does not reroll: flat natural2:3 backs lift/enlarge/settle to the table (1080ms,90ms stagger). Cards remain back-down and manual flips alone advance stops; DRAW unlocks after all three settle. AUTO uses the same guarded SET→DEAL funnel. Continue restores committed hand/phase/stops/rewards/bonus queues and payoff cast/winner without duplicate awards or RNG; interrupted deal returns to the paid stable holder.
7. Defeat reopens unused-hand selection; summoned instances never return to hand. Existing victorious-card persistence is retained. New runs have normal rounds1–5, with round6=EXTRA1; legacy saves retain their prior boundary.
8. Existing bonus/collection rules remain. SuperMax's natural freeze leads into its restored dedicated MAX movie; no new bonus probabilities or outcome-to-glass-crack mapping are introduced.

Latest battle-deal evidence: outputs/ui-review/2026-11-08/player-dock-two-step/pm-qa.md plus Kai/Mio/Riku handoffs. Prior PM fresh free1280×720 confirmed dock summon, unlimited SET/inspection, second release/three manual flips, AUTO funnel and navigation DOM cleanup. Actual-store recovery checks cover reward/Fatal/nestedMAX/struggle corrections; this is not paid wallet/G or real-save browser evidence. Phone/GPU/contextloss/full-mode coverage skipped; owner visual acceptance next. Concurrent owner frontend/gacha work remains preserved.

## Gacha To Battle Rules

### Pack selection and Offering Rates (2026-11-08)

- Show one existing pack image with drop shadow/contrast on a separate dark-green stage, full-pool card previews without carousel arrows, one five-card opening action and current five-card price.
- Offering Rates lists all15 existing card images/names and rarity/individual rates from the actual shared lottery weights. Current rarity rates R60%, SR25%, SSR10%, UR5%; individual rates equal effective rarity rate divided by its pool size. State that these are per-card draws, not pack-at-least-once probabilities, and disclose rounding. Do not change odds through presentation.
- Kiwi checks and Riku independent review passed; PM desktop/390 portrait and dialog/confirmation evidence: `outputs/ui-review/2026-11-08/gacha-five-pack/pm-qa.md`. Paid opening/DB save not newly browser-tested; member guard retained. Owner visual judgment remains open.

### Enemy Fatal (owner correction, 2026-11-06)

- Only idle entry at enemy countdown zero changes: the committed whole-game result non-Empty never enters; Empty enters at50%, rolled once. One Empty symbol is not the predicate. An active window never rerolls entry. Existing player-Fatal failure can still force an enemy window independently of countdown; other original priorities/odds remain.
- Preserve the original finite window: default3 draws INCLUDING the trigger, leaving two following draws. Live configured length is captured on entry and saved. Entry third stop warns650ms then permits the following games; it does not immediately retire the fighter. At the original final third stop, show1800ms ENEMY/card/name/ATTACK, then resolve held survival/refill or defeat. Player placeholder remains1800ms.
- Normal window cards retain original accumulated rescue predicates: Chance presence or Bar registers counter; target Attack or Reply registers reset. Held real shield outcome takes precedence at final; survival refills the enemy counter. Owner confirmed2026-11-08: 「書き換え抽選」＝「引いたカードで攻撃結果を回避へ書き換える（既存方式）」. This is the implemented pending survival/outcome override; terminology is closed. No symbol redraw/replacement or new odds were requested; no implementation change or new QA is required.
- Continue restores saved window length, counter/reset flags, shield, entry commitment, settled positions and BAR/Defense grades without new payment or entry roll. Result-less legacy hands restore neutral backs/remaining stops, finish only their committed transition without unknown-symbol rewards, and clear the pending plan before next draw. Hidden/overview/context guards and unlimited manual stop waiting remain.
- Prior PM DEV browser evidence shows Reply rescue2→1→final attack→same fighter/enemy/round and counter4/4, Empty entry/intermediate survive until final attack/defeat, and counter-zero Reply staying idle. Latest actual images: `pm-correction-entry-2g.png`, `pm-correction-final-attack.png`, `pm-correction-survived.png`, `pm-correction-final-failure.png`. Real-save/legacy Continue and production frequency are source/test evidence only, not browser acceptance; phone/full-game coverage not exhaustive. Temporary attacks await owner visual judgment.
- Historical first acceptance's immediate retirement and persistent per-idle-game attacks are superseded. Its screenshots/test totals do not establish the corrected multi-game sequence; use the latest correction in the existing PM QA and Kai handoff.

### Card overview (implemented 2026-11-02)

- Click a hand card or either field character to inspect its card; viewing and closing do not consume it.
- A translucent black rectangular dialog shows existing art on the left and name, ability, expected reward and W RATE on the right, with an × close control.
- Dragging a hand card onto the field (or Shift+Enter) opens the same overview with summon Yes/No. Only Yes commits the instance; No/Escape/× cancel without consumption.
- Draw/AUTO are blocked while the overview is open. Closing restores focus to the invoking card/character.
- Display implemented ability status and actual Attack success-rate semantics. Uncalculated expected rewards and undecided guarantees are explicitly identified; inspection must not reroll variable W RATE.

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

Attack outcomes use the active character's printed W RATE on target and half that rate off target. UR3 resolves one integer from 66 through 89 per round. Chance and Empty have separate rules.

The current implementation is in `lib/game-config/patchConfig.ts`, `lib/battle-pixi/core/evaluateResult.ts` and `lib/battle-pixi/state/playerWinRateStore.ts`; the existing ability audit records the detailed matrix. The former global test value of 2 is historical, not the current attack-rate contract. Distinguish result-lottery odds from the chance that an Attack lands.

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

Fakeout dialogue sequence:

1. Each of the three fakeout games adds one dialogue insert immediately after
   the first table card finishes flipping and settles.
2. The speaker may be either the current player card character or the current
   enemy. Select the side once per fakeout game and do not re-roll it during
   rendering.
3. Player dialogue uses the left-side frame and player icon. Enemy dialogue uses
   the right-side frame and enemy icon.
4. Dialogue history persists across the complete three-game fakeout sequence.
   Do not dismiss an insert on a short per-line timer.
5. A maximum of two dialogue inserts may be readable at once:
   - The first dialogue occupies the upper row.
   - The second dialogue occupies the lower row.
   - When the third dialogue is ready, the oldest upper dialogue scrolls upward
     and fades out, the lower dialogue moves into the upper row, and the third
     dialogue enters the lower row.
   - The third dialogue must not enter until the oldest dialogue is no longer
     readable, so three readable boxes never share the screen.
6. Horizontal placement always follows the speaker: player inserts anchor left;
   enemy inserts anchor right.
7. After the third fakeout game, keep the final two dialogue inserts visible
   through the remaining fakeout suspense, then clear them immediately before
   the attack hit/dodge payoff.
8. The player card should visibly attack. The enemy either gets hit or dodges.

Dialogue content:

- Use the active character's approved character-sheet phrase exactly as written.
- When a character has multiple approved phrases, cycle or select without
  immediate repetition during one fakeout sequence.
- If a character has no approved phrase, show the approved name and icon but
  leave the phrase field empty. Do not invent replacement dialogue.

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

## Player Fatal Mode Opening Insert

The Player Fatal Mode Opening Insert is a separate full-stage presentation. It is
not an attack-fakeout dialogue box and must never be added to the two-entry
attack-fakeout dialogue history.

Current R4 prototype:

- Character: R4 Young Knight.
- Display title: `DESTINY BATTLE`.
- `DESTINY BATTLE` is a mode title, not spoken character dialogue.
- Canvas: 1250 x 618.
- Current motion preview: 88 frames / approximately 2.93 seconds at 30 fps.
- At 60 fps, double all frame counts while preserving the same real-time speed.
- Temporary overlay only; the underlying battle layout remains unchanged.
- The previous Legendary working phrase is retired and must not return.

Composition direction:

- Large distressed manga-ink two-line title on the left.
- Close face, shoulder, and chest crop of R4 on the right.
- Use two complete pixel-registered monochrome plates: a black-background
  positive plate and a white-background negative plate.
- Use dry-brush strokes, splatter, scratches, and halftone texture.
- Animate the approved `07-energy-divider.png` as a segmented electrical motion
  graphic above both monochrome plates.
- Use `09-foreground-foil-monochrome-holographic-v2.png` as the active foil. It
  is black, silver, and white only; the blue/yellow source foil is retired from
  the active render stack.
- Do not add a metallic arcade frame, orange perimeter, new colored sweep, or a
  broad holographic light band.
- Preserve R4's short blond low side fade, sharper youthful warrior face, slim
  proportions, and smooth armor construction in monochrome.
- Add clearly visible chromatic aberration at the four outer corners of the
  complete 1250 x 618 upper battle screen. Keep the central title and R4 portrait
  sharp.

Motion sequence:

1. Staggered horizontal plate shards of the positive plate close from both sides.
2. Both halves meet with the sequence's only full-frame white flash.
3. Stack the complete positive and negative plates without independently
   scaling, cropping, or repositioning either image.
4. Run four alternating horizontal mask reveals from bottom to top. Each flip
   lasts four frames at 30 fps and uses a narrow 14 px smooth feather.
5. Animate the energy divider with segmented jitter, brightness pulses, and a
   faint offset echo above the swapping plates.
6. Animate only a black/white reflective shimmer through the monochrome foil.
7. Peak the stronger corner chromatic aberration at 11 px during the four
   inversion sweeps, retain a visible 5-7 px pulse during hold, then clear it.
8. Hold the complete positive plate long enough to bring the total presentation
   to approximately 2.93 seconds.
9. Shatter the positive plate outward and clear every insert pixel before returning to
   the unchanged battle screen.

Prohibited motion treatments:

- Hue rotation or any cyan, gold, rainbow, or colored sweep. The approved energy
  divider and foil are fixed foreground accents, not sweep sources.
- Opacity dissolve between the positive and negative plates.
- Screen/Add blending for the plate transition.
- A broad white holographic band. The only full-frame white flash is the center
  contact flash.

Authoritative assets and timing:

- `public/images/battle-ui/phrase-inserts/r4-young-knight/monochrome-sweep-v2/04-composite-positive.png`
- `public/images/battle-ui/phrase-inserts/r4-young-knight/monochrome-sweep-v2/08-composite-negative.png`
- `public/images/battle-ui/phrase-inserts/r4-young-knight/07-energy-divider.png`
- `public/images/battle-ui/phrase-inserts/r4-young-knight/monochrome-sweep-v2/09-foreground-foil-monochrome-holographic-v2.png`
- `public/images/battle-ui/phrase-inserts/r4-young-knight/monochrome-sweep-v2/r4-monochrome-v2-selected-extended-v6.webp`
- `public/images/battle-ui/phrase-inserts/r4-young-knight/monochrome-sweep-v2/r4-monochrome-v2-selected-extended-keyframes-v6.jpg`
- `public/images/battle-ui/phrase-inserts/r4-young-knight/monochrome-sweep-v2/r4-monochrome-plate-comparison.jpg`
- `public/images/battle-ui/phrase-inserts/r4-young-knight/monochrome-sweep-v2/R4_MONOCHROME_SWEEP_V2_MOTION_SPEC.md`

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

Owner direction (2026-10-31): revisit the core experience before adding production content. Preserve lottery-based competition and pachislot-style presentation; make player initiative and meaningful decisions clearer. The owner's performance, presentation and character-appeal concerns are not yet measured market/technical conclusions. Discovery proposals are not approved mechanics. Record the current hypothesis and next decision in `session-handoff.md`.

The owner supports exploring player-chosen risk/reward routes: higher victory chance with a smaller victory payout, or lower chance with a larger payout. Equal expected net points, equal victory probability and identical per-battle results are different requirements. Proposed payout locking, probability calculation, ability interactions and exact values still require design/validation; no gameplay implementation is authorized yet.

New reward proposal under discussion: differentiate victory bonus guarantees/weights by the selected card's rarity (R: super guaranteed; SR: super chance; SSR: regular or better; UR: default regular), retaining the opening Chance upgrade as a player-drawn opportunity. Exact floors, weights, superMax handling and priority against existing forced bonuses are unresolved. Preserving future Chance/bonus draws means the pre-battle contract would fix guarantee/distribution rules rather than an exact final point amount. This interpretation needs agreement; no rates were changed.

Proposed flow under discussion: enemy revealed first while player cards remain in hand; player chooses a card and then summons it to start battle. Show the card/enemy-conditioned offer and commit its victory payout before the first battle draw. This is a proposed replacement for automatic initial summoning, not the current implementation. Owner-confirmed rule: a summoned card never returns to hand. Do not add return/reuse/cooldown mechanics. Whether the card stays on the field after victory and when next-enemy selection opens remain separate unresolved rules.

Current priority order; implementation starts only when assigned by the owner:

1. Diagnose the agency/suspense gap, compare relevant games and validate a short core-loop proposal with minimal art/video. Team setup is complete; do not resume production merely because staff are ready.
2. Repair and verify Continue Battle, save boundaries, committed outcomes, rewards and next-draw pricing.
3. Add focused regression checks and reconcile simulator/runtime rules before using balance results.
4. Reconcile and approve individual ability requirements, then implement them incrementally.
5. Confirm R1 final attack deliverables/integration requirements and finalize R2's action/storyboard.
6. Improve attack payoff, character presentation and progression after the core loop is stable.

Do not overbuild mobile-specific behavior yet. Keep layouts responsive, but focus first on making the browser game loop fun and stable.

## Development Rule

Prefer small, safe changes.

Before changing battle logic, identify:

- What state drives the feature
- What visual reacts to that state
- What clears or resets the state
- What happens if the player navigates away or starts a new battle

Every presentation system should have a clear start, update, and cleanup path.
