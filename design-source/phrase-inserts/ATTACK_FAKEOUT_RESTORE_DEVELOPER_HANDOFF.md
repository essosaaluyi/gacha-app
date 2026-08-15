# Attack Fakeout Dialogue Insert - Developer Handoff

Date: 2026-07-28
Status: Game-ready frame and icon assets supplied
Authority: `PROJECT_BIBLE.md`, especially "Attack Fakeout Inserts"

## Goal

Restore the existing attack fakeout dialogue presentation using the new green-gold
Split Bezel frames. This is a temporary battle overlay. Do not redesign the battle
screen, add permanent zones, or leave any layer visible after the sequence clears.

## System Boundary

The attack-fakeout dialogue insert is the compact green-gold Split Bezel component
with a circular character icon, large lower character-name plate, empty small side
plate, and phrase field.

The full-stage orange metal R4 Young Knight presentation with oversized layered text,
engraved portrait, and central energy tear is a separate work-in-progress **Player
Fatal Mode Opening Insert**. It must not be mounted, named, documented, or previewed
as an attack-fakeout dialogue insert.

Authoritative sequence, revised by the owner on 2026-07-29:

1. Each of the three fakeout games creates one dialogue after card 1 finishes
   flipping and settles.
2. The speaker is selected once per fakeout game and may be either the active
   player card or the current enemy. Do not re-roll on render.
3. The first dialogue occupies the upper row. The second dialogue occupies the
   lower row. Both remain visible into the next fakeout game.
4. When the third dialogue is ready, scroll the two-entry history: the oldest upper
   entry moves upward and fades out, the lower entry moves into the upper row, and
   the third entry enters the lower row.
5. Never show more than two readable dialogue boxes. Complete the oldest entry's
   fade/unmount before the third entry becomes readable.
6. Horizontal orientation always follows the speaker: player frame/icon on the
   left, enemy frame/icon on the right.
7. Keep the final two entries visible through the remaining fakeout suspense and
   clear them immediately before the hit/dodge payoff.

## Game-Ready Assets

### Player Frame

- Asset name: Attack Fakeout Split Bezel - Player
- Purpose: Reusable left-side player dialogue frame with an empty portrait socket,
  phrase field, nameplate, and side-marker plate.
- Prompt: Sleek Japanese smart-slot battle dialogue insert, mirrored player-side
  construction, dark emerald smoked acrylic, near-black understructure, slim gilded
  yellow-gold rails, circular portrait disc on the left, long phrase field extending
  right, large empty nameplate, small empty player marker plate, no character and no
  text, isolated on a flat chroma background for alpha extraction.
- Negative prompt: Character, portrait, lettering, logo, phrase, opaque rectangular
  background, cyan frame, silver-dominant frame, ornate scrollwork, thick bezel,
  copied game frame, excessive glow.
- Aspect ratio: 2065:762 source canvas; visible insert approximately 4:1.
- Background requirement: Transparent alpha outside the frame. Smoked acrylic areas
  intentionally remain dark and semi-opaque.
- Filename:
  `public/images/battle-overlays/attack-fakeout/frames/attack-fakeout-frame-player-v1.png`
- Developer notes: RGBA PNG, 2065 x 762, transparent corners, no baked character or
  text. Player icon is clipped inside the left portrait disc.

### Enemy Frame

- Asset name: Attack Fakeout Split Bezel - Enemy
- Purpose: Reusable right-side enemy dialogue frame with an empty portrait socket,
  phrase field, nameplate, and side-marker plate.
- Prompt: Sleek Japanese smart-slot battle dialogue insert, enemy-side construction,
  dark emerald smoked acrylic, near-black understructure, slim gilded yellow-gold
  rails, circular portrait disc on the right, long phrase field extending left,
  large empty nameplate, small empty enemy marker plate, no character and no text,
  isolated on a flat chroma background for alpha extraction.
- Negative prompt: Character, portrait, lettering, logo, phrase, opaque rectangular
  background, cyan frame, silver-dominant frame, ornate scrollwork, thick bezel,
  copied game frame, excessive glow.
- Aspect ratio: 2063:762 source canvas; visible insert approximately 4:1.
- Background requirement: Transparent alpha outside the frame. Smoked acrylic areas
  intentionally remain dark and semi-opaque.
- Filename:
  `public/images/battle-overlays/attack-fakeout/frames/attack-fakeout-frame-enemy-v1.png`
- Developer notes: RGBA PNG, 2063 x 762, transparent corners, no baked character or
  text. Enemy icon is clipped inside the right portrait disc.

### Character Icon Library

- Asset name: Attack Fakeout Character Icons
- Purpose: Small, identifiable player and enemy portraits for the frame sockets.
- Prompt: Owner-supplied approved transparent character icons.
- Negative prompt: Do not regenerate, recolor, mirror, stretch, or replace the icons
  with card artwork.
- Aspect ratio: Variable transparent portrait crops, approximately square.
- Background requirement: Existing transparent alpha must be preserved.
- Filename:
  `public/images/battle-overlays/attack-fakeout/icons/{card-or-enemy-id}.png`
- Developer notes: 28 files are present. Player IDs are `R1-R4`, `SR1-SR4`,
  `SSR1-SSR4`, and `UR1-UR3`. Enemy IDs are `enemy1-enemy13`. Resolve the icon from
  the active card ID or enemy ID, not from its display name.

## Composition Contract

Runtime layers from back to front:

1. Unchanged battle screen.
2. Transparent frame PNG, including the emerald portrait-disc backing.
3. Character icon above the frame, clipped to the inner portrait circle.
4. Foreground frame pass containing the empty lower plates and portrait edge above
   the clipped icon.
5. Dynamic card/character name inside the large lower nameplate.
6. Dynamic phrase text inside the main smoked-glass field.
7. Short tone flash and edge highlights.

Important correction: the supplied frame's portrait disc is opaque. Placing the icon
behind the frame hides it. The icon must sit above the emerald disc, be clipped to the
inner circular opening, and remain inside the gold rim. Never leave the portrait
container as `overflow: visible`.

Do not render the live `PLAYER`/`ENEMY` side marker. The small side-marker plate
remains empty. Render the card/character name in the large lower nameplate. The
foreground plate pass, name, and phrase must all sit in front of the portrait.

Never bake the icon, name, or phrase into the frame.

## Placement And Text

- Use approximately 70-74% of the battle-stage width, with a 920 px maximum on the
  1250 x 618 reference stage. The previous 86% width makes the disc and empty glass
  dominate the battlefield.
- Upper row: approximately `top: 9%`.
- Lower row: approximately `top: 43%`.
- Player horizontal anchor: `left: 2.5%`.
- Enemy horizontal anchor: `right: 2.5%`.
- Row position represents dialogue age; horizontal position represents speaker side.
  A player may therefore appear in either the upper-left or lower-left position, and
  an enemy may appear in either the upper-right or lower-right position.
- Keep the approved 80% runtime scale. The upper and lower rows are intentionally
  sized to hold two inserts without collision.
- Preserve the current mirrored visual grammar.
- Name: centered in the large lower nameplate, one line only. Use the approved
  character-sheet display name, not the runtime rarity ID or `Enemy N` placeholder.
- Phrase: centered, maximum two lines. Prefer 14-52 characters. Scale down within a
  controlled minimum rather than clipping or expanding the frame.
- Maintain safe padding inside every gold rail and keep text clear of the portrait.
- Check the battle stage at 1250 x 618 plus responsive desktop and mobile layouts.

### Internal Placement Percentages

Percentages are relative to each frame container.

| Element | Player | Enemy |
| --- | --- | --- |
| Portrait inner circle | left 8%; top 11.75%; width 22.5%; aspect 1:1 | right 8%; top 11.75%; width 22.5%; aspect 1:1 |
| Phrase safe area | left 34%; right 7%; top 43%; height 21% | left 7%; right 34%; top 43%; height 21% |
| Name safe area | left 11.5%; top 64%; width 28.5%; height 10.5% | right 11.5%; top 64%; width 28.5%; height 10.5% |

Portrait behavior:

- Use the approved icon file, not the battlefield character or full card.
- `overflow: hidden` and circular clipping are required.
- Fill the inner circle with a bust crop. Do not show the entire body.
- Keep the face near the upper-middle of the disc; shoulders may reach the lower rim.
- Preserve the icon's natural proportions. Do not stretch it.

Text-fit behavior:

- Both text layers must be constrained by their safe-area boxes. Neither may render
  over the portrait, gold rail, battle screen, or outside the insert container.
- Vertically center the name and align it to the left inside the large nameplate.
  Preserve a clear inner-left inset so the first letter never touches the bevel.
- Keep the name on one line. Start near 18 px on the 1090 x 350 reference stage and
  reduce only as required, to an 11 px minimum. If the approved display name still
  does not fit, truncate with an ellipsis rather than crossing the rail.
- Center the phrase on both axes and allow a maximum of two lines. Start near 23 px
  on the reference stage and reduce to a 14 px minimum. Measure the rendered text;
  do not rely on character count alone.
- Preserve approved wording, capitalization, and punctuation. Do not rewrite text
  to make it fit.
- Use a dark hard shadow for both name and phrase. Do not add colored text glow.

### Approved Runtime Scale Revision

- Render the complete dialogue insert at 80% of its previous runtime size.
- Desktop width changes from `min(72%, 920px)` to `min(57.6%, 736px)`.
- Mobile width changes from `88%` to `70.4%`.
- Preserve the frame aspect ratio and all internal layer percentages.
- Scale portrait, frame passes, name, phrase, shadows, and entrance travel as one
  composition. Do not reduce only the frame while leaving the live text oversized.
- Reference text sizes at the reduced scale are approximately 14.4 px for the name
  and 18.4 px for the phrase. Retain dynamic fitting for long approved copy.

## Character-Sheet Content Binding

Resolve content by stable card/enemy ID. Do not derive a display name from rarity,
filename, or the current runtime `name` field because those fields currently contain
values such as `SSR4` and `Enemy 1`.

### Player Display Names

| Card ID | Character-sheet display name | Approved phrase status |
| --- | --- | --- |
| R1 | Triplets Baby Dragon | Missing |
| R2 | Green Scale Dragon | Missing |
| R3 | Dragon Raider | Missing |
| R4 | Young Knight | Missing |
| SR1 | Necro Runner | Missing |
| SR2 | Red Torn Dragon | Missing |
| SR3 | Vigilante | Missing |
| SR4 | Night Crawler | Missing |
| SSR1 | Great Thunder Dragon | Missing |
| SSR2 | Blood Man | Missing |
| SSR3 | Ghost of Emperor | Missing |
| SSR4 | White Sword Man | Missing |
| UR1 | Mami | Missing |
| UR2 | Double Striker | Missing |
| UR3 | Abandoned Doll | Missing |

### Enemy Display Names

| Enemy ID | Character-sheet display name | Approved phrase status |
| --- | --- | --- |
| enemy1 | Mourning Talon - Elias | 3 approved phrases |
| enemy2 | Rift Stalker | Missing; `Phrase pending` is not dialogue |
| enemy3 | Voidscale Tyrant | Missing; `Phrase pending` is not dialogue |
| enemy4 | Crimson Regent - Marcus | Missing; `Phrase pending` is not dialogue |
| enemy5 | Skymaw Harrier | Missing; `Phrase pending` is not dialogue |
| enemy6 | Roseblood Noble - Julian | Missing; `Phrase pending` is not dialogue |
| enemy7 | Redline Assassin - Kira | Missing; `Phrase pending` is not dialogue |
| enemy8 | Moonplate Sentinel | Missing; `Phrase pending` is not dialogue |
| enemy9 | Ghostblade Ronin - Ren | Missing; `Phrase pending` is not dialogue |
| enemy10 | Velvet Trickster - Felix | Missing; `Phrase pending` is not dialogue |
| enemy11 | Ruinroot Titan | Missing |
| enemy12 | Halo Executioner - Diana | Missing; `Phrase pending` is not dialogue |
| enemy13 | Lantern Ronin - Sora | Missing; `Phrase pending` is not dialogue |

Approved enemy1 wording, copied exactly from the current character-sheet image:

1. `I know... this is the path I chose.`
2. `I see, then die....`
3. `What about those who had no one? You hypocrite!`

The sheet does not assign these three lines to specific triggers. Until phrase
assignment is approved, use the first listed line as enemy1's deterministic attack
fakeout line and retain the other two in its approved phrase pool. Do not silently
substitute the punctuation from a separate notes file.

For any character whose phrase status is missing:

- Still render the approved display name in the nameplate.
- Leave the phrase field empty and suppress the phrase text layer.
- Do not show rarity-generated lines, enemy-origin placeholders, `Phrase pending`,
  template instructions, or another character's line.

Content sources:

- Player names: the current player character sheets and
  `design-source/cards/CARD_SYSTEM_DEVELOPER_HANDOFF.md`.
- Phrase audit:
  `design-source/phrase-inserts/PHRASE_INSERT_SYSTEM_INITIAL_AUDIT.md`.
- Enemy1 visual sheet:
  `public/images/cards/enemy/enemy1/character-sheet/mourning-talon-elias-character-sheet.png`.
- Enemy detail notes can aid lookup, but the approved character-sheet image controls
  where punctuation conflicts.

## Conditional Phrase Color

Preserve the existing anticipation system exactly:

| Tone | Text color | Meaning |
| --- | --- | --- |
| White | `#F8FAFC` | Baseline |
| Blue | `#008FE1` | Mild expectation |
| Green | `#00AD0C` | Stronger expectation |
| Red | `#EC0000` | Highest expectation |

Preserve the existing success weights: white 25, blue 20, green 30, red 25.
Preserve the existing fail weights: white 45, blue 30, green 15, red 10.
Color affects phrase text and the short flash only; it must not recolor the permanent
green-gold frame.

Phrase text uses a dark hard shadow for contrast. Do not add colored outer glow.

## Timing And Persistence

- Trigger one dialogue on every fakeout game immediately after the first table card
  finishes its flip and settles. Use the first card's reveal-complete event, not the
  initial draw/click and not full three-card hand evaluation.
- Target frame, icon, name, and phrase entrance start: 0-80 ms after that first
  settled reveal. They enter as one composition; the frame must never appear early
  on draw while its phrase arrives later.
- Select the speaker once per fakeout game. For the current owner test, use an
  independent 50/50 player/enemy roll unless a configured weight already exists.
  Store the selected side with the pending dialogue so rendering cannot change it.
- Do not consume or resolve the fakeout result early. Presentation may move to the
  first reveal, but result evaluation, success/failure state, and battle balance stay
  on the existing authoritative path.
- Prevent duplicate dispatch when the hand later completes.
- Entrance: 280-360 ms directional slide with a quick gold rail catch-light.
- Portrait reveal: begin 40-80 ms after the frame; scale 0.92 to 1.00.
- Persistent hold: no per-insert auto-dismiss timer. Game 1's entry remains through
  game 2; game 2's entry remains through game 3.
- Third-entry scroll, 220-320 ms total:
  - Old upper entry translates upward by approximately 55-70% of its height and
    fades to 0.
  - Existing lower entry moves to the upper row.
  - Remove the old upper entry, then introduce the new entry in the lower row from
    its speaker side. At no point may three boxes be readable.
- Keep the last two entries visible after game 3 settles and through the fakeout
  suspense.
- Group exit: 180-240 ms, immediately before the attack hit/dodge payoff begins.
- Clear all dialogue layers before the attack character animation crosses their
  occupied area.
- Retain `pointer-events: none`.

## Dialogue Queue Rules

- Store up to two visible items in chronological order: index 0 is upper/older;
  index 1 is lower/newer.
- Adding item 1 to an empty queue places it in the upper row.
- Adding item 2 places it in the lower row.
- Adding item 3 starts the scroll transaction described above and leaves items 2 and
  3 as the final queue.
- Do not replace the entire queue when a new side is shown.
- Do not dismiss an item after 1.24 seconds or any other fixed short timer.
- Random speaker selection is presentation-only and must not affect the predetermined
  fakeout success result, attack balance, or payoff.
- Resolve the active player card or current enemy at the moment the pending dialogue
  is created, so its icon, name, and phrase remain stable for the entry's lifetime.
- For characters with multiple approved phrases, choose without immediate repetition
  during one fakeout sequence. Preserve exact character-sheet wording.
- Characters with missing approved phrases still show their icon and approved name;
  their phrase field remains empty.

## Existing Implementation To Restore

- Component: `components/battle/AttackFakeoutInsert.tsx`
- Styling: `app/globals.css`, `.attack-fakeout-insert*` and `.afk-*`
- State and conditional tones:
  `lib/battle-pixi/state/attackFakeoutInsertStore.ts`
- Battle trigger path: `components/battle/BattlePixiStage.tsx`
- Tuning: `lib/game-config/patchConfig.ts`

The component remains mounted, and the tone logic is still present. The `classic`
player-then-enemy fakeout currently has weight `0`, so the full sequence is not
normally reachable. Restore it as an active configurable presentation path and use
the debug force for deterministic QA. Do not choose a permanent balance percentage
without owner confirmation.

Use the supplied icon library instead of the full card image currently stored in
`insert.subject.image`. Replace the current rarity-generated player lines and generic
enemy-origin lines with the character-sheet content binding above. Do not invent
replacement dialogue.

## Owner Placement Workstation

Route:

`http://localhost:3000/attack-fakeout-workstation`

The workstation is a separate design tool and does not alter the battle runtime.
It provides independent player and enemy presets with:

- Direct dragging and corner resizing for the complete insert and visual internal
  layers.
- Numeric stage coordinates for the insert.
- Percentage coordinates for portrait and phrase layers. The fixed name safe area is
  specified in this handoff.
- Portrait zoom, X/Y crop offset, circular clipping, and editable z-order.
- Live character icon, phrase, font-size, and anticipation-tone previews.
- Optional battle screenshot upload for checking placements against an exact game
  state.
- Browser autosave, JSON import, JSON download, and clipboard export.

The owner-approved workstation JSON overrides the provisional percentages in this
document. Developer implementation should retain the same `1090 x 350` reference
coordinate system or convert the exported stage pixels to responsive percentages
using the included `xPercent`, `yPercent`, and `widthPercent` values.

## Acceptance Check

- New transparent frame assets render with no black or magenta rectangle.
- Correct icon is selected for all 15 player cards and 13 enemies.
- Player icon is left; enemy icon is right.
- The small side-marker plate stays empty.
- The approved character-sheet display name renders in the large nameplate in front
  of the icon, vertically centered and left-aligned.
- The complete dialogue insert renders at 80% of the previous size on desktop and
  mobile without changing its aspect ratio.
- Approved phrase text remains fully inside the main glass field at desktop and
  mobile sizes.
- Missing phrases render as empty phrase fields; no generated placeholder dialogue
  appears.
- White, blue, green, and red phrase states all render and flash correctly.
- No dialogue frame appears on draw. Frame, icon, name, and phrase enter together
  after card 1 settles in each of the three fakeout games.
- Speaker side can be player or enemy on each game and remains stable after selection.
- Game 1 entry remains visible into game 2. Game 2 adds a second entry without
  replacing or auto-dismissing the first.
- Game 3 scrolls the history, removes the oldest entry, and adds the third while
  keeping no more than two readable boxes.
- Row placement follows age; horizontal placement follows side.
- The final two entries remain through fakeout suspense, then clear fully before the
  hit/dodge payoff.
- Final hit/dodge still executes in the established order after the hand resolves.
- Battle layout underneath is unchanged before and after the sequence.
- Missing icon lookup fails gracefully without showing a card back inside the disc.
