# Character Ability Notes - Recovered

Recovered date: 2026-08-23

Status: Recovered design notes under owner review. Owner-confirmed revisions override the recovered matrix below.

Implementation status: Specification only. After every character is approved, these rules must be implemented in the actual game logic and covered by automated and battle-flow tests before this work is considered complete.

Recovered from:

- `output/pdf/card-first-battle-presentation-system.pdf`
- `tmp/pdfs/card-first-report/build_card_first_report.py`
- `output/design-examples/card-first-report-pages/page-09-ability-matrix-part-1.png`
- `output/design-examples/card-first-report-pages/page-10-ability-matrix-part-2.png`

Search result:

- I did not find a separate original raw ability-note file in the current project tree.
- Git snapshots checked contained character names, animation references, and card-system handoff material, but not this full ability behavior matrix.

## Core Ability Presentation Rule

Each ability should resolve through an honest Set Effect Card only when that card represents real internal state. A Set Effect Card may represent:

- Modifier
- Defense
- Counter
- Progress
- Delay
- Substitution
- Target expansion
- Stored result
- Destruction

If a Set Effect Card flips, it must do something real. It must not exist only to manufacture suspense.

## Resolution Timing Rule

Set cards flip before the dependent final reveal when causally required.

Standard resolution order:

1. Character cards remain visible.
2. Set Effect Cards are placed earlier or on mode entry.
3. Player presses Draw.
4. Relevant enemy set card flips/resolves.
5. Relevant player set card flips/resolves.
6. Triggered character abilities resolve in a clearly labeled chain.
7. Final three-symbol combination reveals.
8. Attack/block/survival animation resolves.
9. Used set cards turn sideways, crack, discard, or leave field.

Visual order alone must never secretly change odds.

## Ability Matrix

| Character | Set-card role | Ability behavior | Timing / presentation note |
| --- | --- | --- | --- |
| Vigilante | Last-stand survival | The first time an enemy Fatal attack would destroy Vigilante, perform one 50% survival check. On success, Vigilante survives the attack. The ability is then lost. | Determine the check during enemy Fatal attack resolution. If successful, show an apparent destruction, a close-up eye cut-in, and Vigilante still standing. Mark the ability as consumed. |
| Blood Man | Fatal counter conversion | If Blood Man survives Enemy Fatal Mode, the player is guaranteed to enter Player Fatal Mode. This guarantees the mode activation only, not a successful defeat result. | After survival is confirmed, show Blood Man's Set Effect Card and a close-up eye cut-in before transitioning into Player Fatal Mode. |
| Green Scale Dragon | Counter hold | Each time the enemy survives Player Fatal Mode, perform a 50% check. On success, hold the enemy attack counter at its current value for 3 turns. If already held, reset the remaining duration to 3 turns; durations do not stack. | Show the character cut-in, apply a visible debuff effect to the enemy counter, and place a tilted `HOLD` label over it using the existing bonus-hold visual language. |
| R1 Triplet Baby Dragon | Target expansion | On every draw while the character is active, perform a 25% check. On success, mark all three slots as red target slots for that draw only. | Reveal the Set Effect Card before the draw result and visibly change all three slots to the red target state. Clear the effect after the current draw resolves. |
| R3 Dragon Raider | Random target expansion | On every draw while the character is active, perform a 50% check. On success, randomly select one eligible non-target slot and mark it as an additional red target for that draw only. | Reveal the Set Effect Card before the result, visibly mark the randomly selected slot red, and clear the added target after the draw resolves. |
| White Sword Man | Independent target expansion | On every draw, begin with the normal first target slot. Independently check 75% for the second slot and 75% for the third slot. | Show each successful additional slot as a red target. The second and third checks must remain independent and visually distinct. |
| Mami | Post-victory sacrifice | After the player defeats an enemy and earns the bonus points, store Mami's effect. At the start of the next turn, Mami defeats herself and is removed from the remaining battle order. For the next 3 turns, every Attack card the player draws has a 100% chance to land. | Show Mami's defeat and removal first, then apply a clearly labeled three-turn guaranteed-hit buff. The buff remains active after Mami is gone and does not guarantee that an Attack card will be drawn. |
| Abandoned Doll | Recurring self-destruction | Beginning in round 2, perform a 50% check during every round-start sequence. On success, Abandoned Doll defeats herself and is removed from battle. | Resolve after the other round-start effects. Show Doll's defeat, then reveal the next character using the normal character reveal animation. |
| Necro Runner | Fourth Fatal card | If Necro Runner is active when a Player or Enemy Fatal Mode begins, add one extra attempt by dealing a fourth progress card. | The fourth card is a visible exception to default Fatal Mode capacity. Check Necro Runner's active state separately at the start of each Fatal Mode. |
| Red Torn Dragon | Empty counter-dodge | Every Empty draw that triggers an enemy attack performs an independent 10% dodge check. On success, Red Torn Dragon completely avoids the attack and receives no damage or defeat. | Show the 10% ability activation, character cut-in, and a clear `DODGE` or `MISS` result before returning to battle. |
| Nightcrawler | Chance-triggered counter hold | When Nightcrawler draws a Chance card, automatically hold the enemy attack counter at its current value for 3 turns. A new trigger during an active hold resets the remaining duration to 3 turns; durations do not stack. | Show Nightcrawler's cut-in, apply a freeze/debuff treatment to the enemy counter, and display the tilted `HOLD` label and remaining duration. |
| Young Knight | Per-enemy survival growth | When an enemy attack lands but does not defeat Young Knight, or Enemy Fatal Mode fails to defeat him, add 10 percentage points to his Attack-card landing chance. Stack up to a maximum 100% landing chance. | Show `+10%` with an aura on each trigger. Keep the bonus while fighting the current enemy, then reset it at the start of the next round after Young Knight defeats that enemy. |
| Double Striker | Dual-combination Fatal field | During Player Fatal Mode, reveal 6 cards across 3 slots. The top row and bottom row form separate three-card combinations. If either row succeeds, the player wins and proceeds to the Bonus Round. | Evaluate both rows independently. If both succeed, show the double result but grant no additional mechanical benefit, points, or reward. |
| Ghost of Emperor | Delayed freeze defeat | On every draw while active, perform an independent 50% check. On success, predetermine the enemy's defeat and play the freeze video at a random valid click during the successful draw or within the following 2 turns. | Stop further ability checks once the win is queued. Lock player clicks while the freeze video plays, then resolve the enemy as defeated and transition to the Bonus Round. |

## Owner-Reviewed Ability Details

### Vigilante

**Ability name:** `[WORKING LABEL: Last Stand]`

**Confirmed game behavior**

- Trigger: The first enemy Fatal attack that would destroy Vigilante.
- Effect: Perform a single 50% survival check.
- Success: Vigilante survives that Fatal attack.
- Failure: The Fatal attack resolves normally and Vigilante is destroyed.
- Usage: The check can occur only once. After it triggers, the ability is consumed and cannot trigger again during that battle.
- State communication: The ability's ready/consumed state must be visible to the player.

**Confirmed visual presentation on success**

1. The enemy performs the Fatal attack.
2. Vigilante appears to be destroyed.
3. A close-up eye cut-in interrupts the apparent defeat.
4. The field returns to show Vigilante still standing.
5. The survival result and consumed ability state are shown clearly.

**Implementation note**

The 50% result should be determined before the success cinematic begins. The destruction image is a dramatic fakeout and must not imply that the game rerolled or changed the odds during the animation.

**Needs confirmation**

- Final ability name and player-facing description.
- Whether the 50% percentage is shown during battle, only on the ability details page, or both.
- Whether the apparent destruction uses the normal destruction animation or a dedicated non-final variation.
- Whether the ability is consumed on the trigger attempt regardless of outcome. This draft assumes yes; on failure, Vigilante is destroyed anyway.

### Blood Man

**Ability name:** `[WORKING LABEL: Fatal Counter]`

**Confirmed game behavior**

- Trigger: Blood Man survives Enemy Fatal Mode.
- Effect: The player is guaranteed to enter Player Fatal Mode.
- Scope: The guarantee applies only to activating Player Fatal Mode. It does not guarantee that the enemy will be defeated or that any Fatal result will succeed.
- Timing: Resolve the ability after Blood Man's survival is confirmed and before Player Fatal Mode begins.

**Confirmed visual presentation**

1. Enemy Fatal Mode finishes and Blood Man is shown to have survived.
2. Blood Man's Set Effect Card activates.
3. A close-up eye cut-in confirms the character ability trigger.
4. The interface transitions into Player Fatal Mode.
5. Player Fatal Mode then resolves under its normal rules and odds.

**Implementation note**

The UI must distinguish `Player Fatal Mode guaranteed` from `Fatal victory guaranteed`. Do not use gold or other guaranteed-success language for the eventual battle result unless that result is independently guaranteed.

**Needs confirmation**

- Final ability name and player-facing description.
- Whether this ability can activate more than once per battle if Enemy Fatal Mode occurs more than once.
- Whether Player Fatal Mode begins immediately after the cut-in or at the next normal player opportunity.

### Green Scale Dragon

**Ability name:** `[WORKING LABEL: Counter Hold]`

**Confirmed game behavior**

- Trigger: The enemy survives Player Fatal Mode.
- Check: Perform a 50% activation check each time the trigger occurs.
- Success: Hold the enemy attack counter at its current value for 3 turns.
- During the hold: The counter does not decrease.
- After the hold: The counter resumes from the value it had when the hold began.
- Usage: The ability is repeatable and may check every time the enemy survives Player Fatal Mode.
- Retrigger behavior: If the counter is already held, reset the remaining duration to 3 turns.
- Stacking rule: Do not add durations together; the hold cannot become 6 turns from two successful checks.
- Failure: The enemy attack counter continues normally.

**Confirmed visual presentation on success**

1. Green Scale Dragon's character cut-in appears.
2. A debuff effect is applied directly to the enemy attack counter.
3. A tilted `HOLD` label appears over the counter.
4. The treatment follows the existing bonus-hold visual language.
5. The interface visibly communicates the remaining hold duration.
6. When the 3-turn hold ends, the debuff and `HOLD` treatment clear and the counter resumes.

**Implementation note**

This effect freezes the existing counter value; it does not add 3 to the counter. The 50% result must be determined when the enemy survives Player Fatal Mode, before the success presentation begins.

**Needs confirmation**

- Final ability name and player-facing description.
- What counts as one hold turn: every player draw, every completed battle exchange, or another existing turn unit.

### R1 Triplet Baby Dragon

**Ability name:** `[WORKING LABEL: Triple Target]`

**Confirmed game behavior**

- Trigger: Every draw while R1 Triplet Baby Dragon is active.
- Check: Perform an independent 25% activation check for that draw.
- Success: Mark all three slots as red target slots.
- Duration: The effect applies only to the current draw.
- Cleanup: Remove the expanded target state immediately after that draw resolves.
- Failure: The current draw uses the normal target-slot arrangement.

**Confirmed visual presentation on success**

1. R1 Triplet Baby Dragon's Set Effect Card activates before the draw result.
2. All three slots change to the red target state.
3. The draw resolves with all three slots visibly marked as targets.
4. The target expansion clears after the result is completed.

**Implementation note**

This is a temporary target-state expansion for one draw. It must not silently persist into the next draw.

**Needs confirmation**

- Final ability name and player-facing description.

### R3 Dragon Raider

**Ability name:** `[WORKING LABEL: Raider Target]`

**Confirmed game behavior**

- Trigger: Every draw while R3 Dragon Raider is active.
- Check: Perform an independent 50% activation check for that draw.
- Success: Randomly select one eligible non-target slot and add it as a red target slot.
- Duration: The additional target applies only to the current draw.
- Cleanup: Remove the additional target state immediately after that draw resolves.
- Failure: The current draw uses the normal target-slot arrangement.

**Confirmed visual presentation on success**

1. R3 Dragon Raider's Set Effect Card activates before the draw result.
2. One eligible non-target slot is selected randomly.
3. The selected slot changes to the red target state.
4. The draw resolves with the additional target clearly visible.
5. The additional target state clears after the result is completed.

**Implementation note**

The random selection must be made from eligible slots that are not already targets. The chosen slot and 50% activation result should be determined before the reveal animation begins.

**Needs confirmation**

- Final ability name and player-facing description.
- Behavior when every eligible slot is already a target.

### White Sword Man

**Ability name:** `[WORKING LABEL: Independent Targeting]`

**Confirmed game behavior**

- Trigger: Every draw while White Sword Man is active.
- Base state: Begin with the normal first target slot.
- Second-slot check: Perform an independent 75% activation check.
- Third-slot check: Perform a separate independent 75% activation check.
- Success: Mark each successfully activated additional slot as a red target for the current draw.
- Duration: All additional target states clear after the current draw resolves.

**Possible outcomes**

- First target only: both 75% checks fail.
- First and second targets: only the second-slot check succeeds.
- First and third targets: only the third-slot check succeeds.
- All three targets: both checks succeed.

**Confirmed visual presentation**

1. The normal first target remains active.
2. Resolve and present the second-slot 75% check.
3. Resolve and present the third-slot 75% check separately.
4. Each successful slot changes to the red target state.
5. The draw resolves with the resulting target arrangement.
6. Additional target states clear after the result is completed.

**Implementation note**

Do not combine the two 75% checks into a single roll. The third target may activate even if the second target does not.

**Needs confirmation**

- Final ability name and player-facing description.

### Mami

**Ability name:** `[WORKING LABEL: Final Blessing]`

**Confirmed game behavior**

- Trigger: The player defeats the enemy and receives the resulting bonus points while Mami's ability is eligible.
- Stored effect: Queue Mami's sacrifice for the next turn.
- Activation timing: At the start of that next turn, before other normal turn effects resolve.
- Cost: Mami defeats herself, leaves the field, and is removed from the remaining battle order for that battle.
- Benefit: For the next 3 turns, every Attack card the player draws has a 100% chance to land.
- Scope: The buff does not increase the chance of drawing an Attack card and does not increase attack damage.
- Duration: Count down one unit for each qualifying turn, then remove the buff after the third turn resolves.

**Proposed visual presentation**

1. After the victory and bonus-point award, briefly mark Mami's ability as queued.
2. At the start of the next turn, move Mami's card into the resolution lane.
3. Show Mami's character cut-in or final-effect cue.
4. Mami's card enters the normal defeated state and leaves the field and remaining battle order.
5. Apply a clearly labeled `GUARANTEED HIT` buff to the player with a visible `3`-turn duration.
6. Reduce the displayed duration as each applicable turn resolves.

**Implementation note**

Mami's defeat and removal must resolve before the buff becomes active. The queued state should survive the transition from the defeated enemy and bonus-point award into the next turn. Once granted, the buff remains active for its full duration even though Mami is no longer present.

**Needs confirmation**

- What counts as one of the 3 buff turns.
- Final ability name and player-facing description.

### Abandoned Doll

**Ability name:** `[WORKING LABEL: Cursed Decay]`

**Confirmed game behavior**

- Initial timing: The ability does not check during round 1.
- Trigger: Beginning in round 2, perform the check during every round-start sequence.
- Check: Perform an independent 50% self-destruction check each eligible round.
- Success: Abandoned Doll defeats herself, leaves the field, and is removed from the remaining battle order.
- Failure: Abandoned Doll remains active or eligible, and the ability checks again at the start of the next round.
- Priority: Resolve this check after the other normal round-start effects have finished.
- End condition: Stop checking after Abandoned Doll is defeated or the battle ends.

**Proposed visual presentation on success**

1. Complete the other normal round-start effects.
2. Show Abandoned Doll's character cut-in with a distinct cursed/doll treatment.
3. Reveal the predetermined successful 50% self-destruction result.
4. Move her card into the normal defeated state and remove it from the remaining battle order.
5. Bring forward the next character using the normal character reveal animation.

**Implementation note**

Each eligible round uses a new independent 50% check. Previous failures do not change the probability of later checks. Determine the result before its presentation begins; the animation must not imply that the roll changes during the reveal.

**Needs confirmation**

- Whether self-destruction grants any secondary benefit or is purely a negative effect.
- Final ability name and player-facing description.

### Necro Runner

**Ability name:** `[WORKING LABEL: Fourth Run]`

**Confirmed game behavior**

- Eligibility: Necro Runner must be active when the relevant Fatal Mode begins.
- Player Fatal Mode: Add one extra attempt, increasing the default total from 3 to 4.
- Enemy Fatal Mode: Add one extra attempt, increasing the default total from 3 to 4.
- State check: Evaluate Necro Runner's active state separately whenever a Player or Enemy Fatal Mode begins.
- Inactive state: If Necro Runner has already been defeated or is otherwise inactive when Fatal Mode begins, do not add the fourth attempt.
- Scope: The ability changes the number of Fatal attempts; it does not change the odds of any individual attempt.

**Confirmed visual presentation**

1. Enter Player or Enemy Fatal Mode with the normal three progress cards visible.
2. If Necro Runner is active, show the character ability cut-in or Set Effect Card activation.
3. Deal a clearly visible fourth progress card into the Fatal sequence.
4. Maintain the normal one-card-per-attempt resolution grammar across all four attempts.

**Implementation note**

The fourth card must represent a real additional Fatal attempt. It must not be a decorative card or a hidden probability modifier.

**Needs confirmation**

- Final ability name and player-facing description.

### Red Torn Dragon

**Ability name:** `[WORKING LABEL: Empty Dodge]`

**Confirmed game behavior**

- Trigger: Every Empty draw that causes an enemy attack while Red Torn Dragon is active.
- Check: Perform a new independent 10% dodge check for each eligible enemy attack.
- Success: Completely avoid the incoming attack.
- Successful result: Red Torn Dragon receives no damage and cannot be defeated by that attack.
- Failure: Resolve the enemy attack normally, including its normal damage and defeat rules.
- Repeatability: The ability remains eligible for every qualifying Empty-triggered enemy attack.

**Proposed visual presentation on success**

1. Determine the 10% result before the enemy attack presentation resolves.
2. Begin the enemy attack and trigger Red Torn Dragon's character cut-in.
3. Show a dodge movement or survival reveal.
4. Display a clear `DODGE` or `MISS` result near the character or attack lane.
5. Apply no damage and return to the normal battle flow.

**Implementation note**

This is a complete attack avoidance effect, not damage reduction and not survival at zero health. Each Empty-triggered attack uses a separate 10% roll.

**Needs confirmation**

- Final ability name and player-facing description.
- Final on-screen result label: `DODGE`, `MISS`, or another approved term.

### Nightcrawler

**Ability name:** `[WORKING LABEL: Chance Freeze]`

**Confirmed game behavior**

- Trigger: Nightcrawler draws a Chance card while active.
- Activation: The counter hold activates automatically; there is no separate percentage check.
- Effect: Hold the enemy attack counter at its current value for 3 turns.
- During the hold: The enemy attack counter does not decrease.
- After the hold: The counter resumes from the value it had when the hold began.
- Repeatability: Each eligible Chance draw can trigger the ability.
- Retrigger behavior: If the counter is already held, reset the remaining duration to 3 turns.
- Stacking rule: Do not add durations together; the hold cannot become 6 turns from two triggers.

**Proposed visual presentation**

1. Reveal the Chance card result.
2. Show Nightcrawler's character cut-in or Set Effect Card activation.
3. Apply a freeze/debuff treatment directly to the enemy attack counter.
4. Place a tilted `HOLD` label over the counter and show the remaining duration.
5. Keep the counter visibly frozen for all 3 turns.
6. Clear the treatment and resume the counter when the hold expires.

**Implementation note**

This effect freezes the existing counter value; it does not add 3 to the counter. Use the shared counter-hold state and UI grammar established for Green Scale Dragon, with Nightcrawler-specific art and effects.

**Needs confirmation**

- Final ability name and player-facing description.

### Young Knight

**Ability name:** `[WORKING LABEL: Unbroken Growth]`

**Owner-described game behavior**

- Trigger A: An enemy attack lands on Young Knight, but he survives it.
- Trigger B: Enemy Fatal Mode fails to defeat Young Knight.
- Effect: Add 10 percentage points to the landing chance of Attack cards for each qualifying trigger.
- Stacking: Add the bonus in 10-percentage-point increments.
- Maximum: Attack-card landing chance cannot exceed 100%.
- Damage: The ability does not increase attack damage.
- Persistence: The accumulated increase remains active while fighting the current enemy.
- Reset: If Young Knight defeats that enemy, reset the accumulated increase to its base value at the start of the next round.

**Confirmed visual presentation**

1. Confirm that Young Knight survived the attack or Enemy Fatal Mode.
2. Show Young Knight's character cut-in or ability activation.
3. Display a clear `+10%` numeric increase.
4. Apply or intensify an aura effect around Young Knight.
5. Keep the accumulated percentage visible or available in the character state details.
6. At the next round after Young Knight defeats the enemy, remove the aura and show the accumulated value returning to its base state.

**Implementation note**

Do not show `+10%` before survival is confirmed. Each qualifying event should update the accumulated value exactly once.

**Needs confirmation**

- Final ability name and player-facing description.

### Double Striker

**Ability name:** `[WORKING LABEL: Double Draw]`

**Confirmed game behavior**

- Trigger: Player Fatal Mode begins while Double Striker's ability is active.
- Field expansion: Increase the draw field from 3 cards to 6 cards.
- Slot structure: Keep 3 horizontal result slots, with 2 cards assigned to each slot.
- Reveal: Reveal all 6 cards during the Fatal draw.
- Combination A: The 3 top cards form one complete three-card combination.
- Combination B: The 3 lower cards form a separate complete three-card combination.
- Evaluation: Evaluate the top and bottom combinations independently.
- Win condition: A success from either combination is enough to win the Player Fatal Mode result.
- Transition: After a successful result, proceed to the Bonus Round.
- Double success: If both combinations succeed, the outcome remains one win and grants no additional benefit.

**Confirmed visual presentation**

1. Begin with the normal three-slot Fatal field.
2. Expand each slot into a two-card stack.
3. Place one card on top and one card beneath it in each slot.
4. Slightly offset the lower card so its symbol and important content remain visible.
5. Reveal all six cards while preserving clear left, center, and right slot grouping.
6. Present the top-row result and bottom-row result as two separate combinations.
7. If either row succeeds, communicate the win and transition to the Bonus Round.
8. Keep both results readable on desktop and mobile without cards covering critical labels.

**Implementation note**

Treat this as three stable two-card slot stacks, not six unrelated card positions. The three top cards share one result evaluation and the three lower cards share a second result evaluation. Use responsive offsets so both cards remain legible without changing the field dimensions during reveal.

**Needs confirmation**

- Final ability name and player-facing description.

### Ghost of Emperor

**Ability name:** `[WORKING LABEL: Emperor Freeze]`

**Confirmed game behavior**

- Trigger: Every draw while Ghost of Emperor is active.
- Check: Perform an independent 50% activation check on each draw.
- Failure: Continue the normal battle flow and check again on the next eligible draw.
- Success: Predetermine the current enemy's defeat and queue the freeze presentation.
- Presentation window: Trigger the freeze video at a randomly selected valid player click during the successful draw or within the following 2 turns.
- Queued state: Once success predetermines the win, stop performing further 50% checks.
- Input rule: Once the freeze begins, lock further player clicks until the freeze video finishes.
- Resolution: When the freeze video ends, resolve the enemy as defeated.
- Transition: Continue to the Bonus Round using the same flow as a normal enemy defeat.

**Confirmed visual presentation**

1. Determine the 50% result on the draw without exposing a misleading reroll.
2. On success, store the confirmed defeat result and choose a valid random click during the current successful draw or within the following 2 turns.
3. At that click, interrupt the normal flow with Ghost of Emperor's freeze video.
4. Disable or absorb player click input while the video is playing.
5. End the video on a clear enemy-defeated state.
6. Transition to the Bonus Round through the standard victory flow.

**Implementation note**

The enemy-defeat result is decided when the 50% check succeeds, not when the freeze video happens. Suppress additional Ghost of Emperor checks while that result is queued. Input locking must prevent duplicate draws, skipped resolution, and repeated Bonus Round transitions while the video is active.

**Needs confirmation**

- Final ability name and player-facing description.

## Fatal Mode Specific Notes

Fatal Mode is the first proof target for this system.

Default behavior:

- At mode entry, deal 3 face-down progress/guard cards to the defending side.
- Each game activates/resolves one card.
- Remaining physical cards show remaining games without a new meter.
- Do not add a separate Battle Tension Meter in phase one.

Necro Runner exception:

- If Necro Runner is active when Fatal Mode begins, visibly add a fourth progress card and one real additional attempt.
- Apply this rule to both Player Fatal Mode and Enemy Fatal Mode.
- Check Necro Runner's active state independently each time a Fatal Mode begins.

## Capacity Rules

- Default set-card capacity: 0-2 Set Effect Cards per side.
- Hard maximum: 3 Set Effect Cards per side.
- Only one resolving card per side at a time.
- Fatal Mode may show 3 progress/guard cards.
- Necro Runner may visibly add a fourth.
- Mobile may use overlap/fan layout, but active cards must move to a center resolution lane.

## Expectation Language

Expectation colors:

- Blue: standard.
- Green: advantage/modifier active.
- Red: critical danger or high opportunity, clarified by field side.
- Gold: guaranteed successful effect/result.
- Rainbow: premium/rare presentation attached to a guaranteed event.

Accessibility rule:

Color must always be paired with icon, label, motion, and/or field-side placement.

Exact modifiers must be shown when applied, for example:

- `+10%`
- `+3 delay`
- `90% target`
- `50% instant-kill check`

Full odds should remain on rules/ability pages.

## Phase-One Rejections

Do not implement these as phase-one ability systems:

- Decorative fake mechanical cards.
- Separate Battle Tension Meter.
- Full 10-card battle order lanes during combat.
- Generic Fighter/Guard/Chance/Empty TCG taxonomy.
- Momentum Seals as a new currency/system.
- Literal slot reels as the main battle interface.
- Opaque near-miss logic.
