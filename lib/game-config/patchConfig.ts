// Hand-editable tuning config for the v-Next feature patch.
// Unlike generated.ts (which is regenerated from game-config/game-config.xlsx),
// this file is safe to edit directly. Values here can be migrated into the
// spreadsheet + tools/sync-game-config-from-spreadsheet.py later.

// How a single buildup game of the attack fakeout presents itself. Rolled
// fresh for every buildup game, so a cycle is a random mix of the two.
export type FakeoutPresentation = "dialogue" | "chanceReveal";

// Declared here rather than imported from fakeoutChanceRevealStore: that store
// reads this config, so importing back would close a dependency cycle.
export type ChanceRevealColorName = "blue" | "green" | "red";

export const patchConfig = {
  // Gacha pull odds (%) by rarity. Editable in /admin; overrides the
  // spreadsheet-generated rarityRates when present.
  gachaOdds: { R: 60, SR: 25, SSR: 10, UR: 5 } as Record<string, number>,

  economy: {
    // Cost of the NEXT draw, keyed by the PREVIOUS game's outcome.
    drawCosts: {
      normal: 3,
      afterReply: 0,
      afterChance: 1,
      afterBar: 0,
    },
  },

  // Feature 1: attack-attempt chance (%) when the target slot is Empty,
  // keyed by the rarity of the player's currently-active battle card.
  emptySlotAttack: {
    ratesByTier: { R: 10, SR: 20, SSR: 30, UR: 40 } as Record<string, number>,
  },

  // The two "fatal" windows, both counted in draws.
  //
  // enemyWindowTurns: once the enemy's attack counter empties, the player has
  //   this many draws to escape. Escaping (counter or reset) means surviving
  //   and refilling the enemy's counter; failing kills the active card. The
  //   escape symbols themselves are still read in BattlePixiStage.
  // playerWindowGames: after the player lands an attack, this many draws to
  //   hit again and finish the enemy off.
  fatalMode: {
    enemyWindowTurns: 3,
    playerWindowGames: 2,
  },

  // Feature 2: the attack fakeout cycle.
  //
  // A presented attack attempt always arms the same shape: `buildupGames`
  // games of tension, then one payoff game. The payoff game starts the
  // electricity struggle on the draw click and names the winner on the third
  // flip — so the player has the whole cycle to overturn a predetermined miss.
  //
  // There is no longer an outer "which cycle shape" lottery. The only roll is
  // per buildup game: does this game show dialogue, or the chance reveal
  // visual. It is re-rolled every game and cleared on the next draw.
  fakeout: {
    buildupGames: 3,
    presentations: [
      { presentation: "dialogue" as FakeoutPresentation, weight: 50 },
      { presentation: "chanceReveal" as FakeoutPresentation, weight: 50 },
    ],
    chanceRevealColors: {
      win: { blue: 10, green: 30, red: 60 },
      lose: { blue: 65, green: 30, red: 5 },
    },

    // Characters/colours that actually have authored two-layer frames. The
    // reveal is never attempted outside this list -- without the gate an
    // unauthored card fires ~180 requests that all 404. There is no fallback
    // presentation, so an uncovered pair simply shows nothing.
    // Extend as frame sequences are delivered.
    chanceRevealComposite: {
      characters: ["UR3"] as string[],
      colors: ["blue"] as ChanceRevealColorName[],
    },

    // Test aid: pins the reveal to the one character/colour pair that has
    // artwork, so it plays regardless of which card is actually active.
    // Off by default -- the real card + colour lottery applies. Flip to true
    // to preview the reveal without needing a UR3 card in hand.
    chanceRevealTest: {
      enabled: false,
      forceCharacter: "UR3",
      forceColor: "blue" as ChanceRevealColorName,
    },
  },

  // Bonus grade. Rolled once, at the opening draw, and it decides both which
  // opening video plays and what the bonus is:
  //   regular  -> 5/5 classic bonus
  //   super    -> 7/7 classic bonus
  //   superMax -> nested loop bonus, delivered via the freeze
  //
  // Drawing a Chance card in the opening hand is the "bonus chance": it takes
  // the regular bonus off the table, so the player is guaranteed at least a
  // super. Weights are relative, not percentages.
  bonusType: {
    base: { regular: 6, super: 3, superMax: 1 },
    withBonusChance: { super: 7, superMax: 3 },
    regularGames: 5,
    superGames: 7,

    // Freeze: how superMax is delivered. A regular/super opening starts
    // playing, the freeze cuts in partway through, and the super-max opening
    // follows it.
    //
    // The cut lands at any random point after minMs. There is no fixed upper
    // bound — the ceiling is whatever the running clip actually allows, which
    // is its duration minus the tail guard. That matters because the two
    // openings are different lengths (regular 11.6s, super 15.5s), so a fixed
    // ceiling would either never fire on the short one or waste the long one.
    freeze: {
      minMs: 4000,
      // Never cut in this close to the end; the freeze needs room to read.
      tailGuardMs: 1200,
    },
  },

  // Feature 3: resurrection (reversal) reveal for hidden wins on the "none" path.
  // OFF: the glitch visual read as cheap and players could not tell what had
  // triggered it. With this off a hidden win simply resolves as a normal win
  // on the spot (Attack Success -> Fatal Mode) instead of being hidden and
  // revealed a game later. The code is kept so a better version can be built.
  resurrection: {
    enabled: false,
    revealDelayMs: 1200,
  },

  // Feature 4: nested loop bonus (runs alongside the classic bonus).
  nestedBonus: {
    // % chance the nested bonus is chosen over the classic one when a bonus starts.
    selectionShare: 50,
    mainLoopGames: 10,
    nestedLoopGames: 3,
    // Outcomes that drop the main loop into the nested loop.
    triggerOutcomes: [
      "Reply",
      "Attack",
      "Defense",
      "Coin",
      "Bar",
      "SingleChance",
      "DoubleChance",
      "TripleChance",
    ] as string[],
    nestedMinPoints: 20,
    // Reward table when a Chance card appears inside the nested loop.
    nestedChanceTable: [
      { points: 50, weight: 80 },
      { points: 100, weight: 10 },
      { points: 200, weight: 7 },
      { points: 300, weight: 3 },
    ],
  },

  // Bonus "BAR" reset mechanic (classic bonus). Each bonus game rolls:
  //   realResetChance → BAR/BAR/BAR: a genuine reset (games back to 5)
  //   fakeChance      → BAR/BAR/EMPTY: a fakeout that pays fakePoints instead
  //   otherwise       → a normal bonus reward (no bar shown)
  // A left-arrow + BAR indicator animates on both bar events to build the
  // "reset chance" tension while the cards flip.
  //
  // There is no resetGamesTo lever any more: a reset restores the bonus to the
  // length it was won with (7G back to 7/7, 5G back to 5/5). The old fixed 5
  // quietly shortened every 7G bonus that hit a reset.
  barReset: {
    realResetChance: 1 / 7,
    fakeChance: 1 / 5,
    fakePoints: 20,
  },

  // Feature 6: post-bonus collection (pick-me) phase.
  // Picks are finite, so running low is the tension. Cards that pay AND grant a
  // pick are the relief; the deliberate cost of that generosity is a higher
  // EMPTY count. `empty` is therefore the main lever for how long a run lasts.
  collection: {
    gridSize: 12,
    // Accepted 600P prototype table. Real bonus values scale these weights to
    // the amount won in the preceding bonus, preserving the tested pacing.
    baseCap: 600,
    standardPointValues: [80, 90, 100, 110, 120, 130, 140, 150, 160, 170] as number[],
    standardPickBonuses: [1, 1, 1, 1, 2, 2, 0, 0, 0, 1] as number[],
    standardEmptyCards: 1,
    extraPointValues: [100, 120, 140, 160, 180, 200] as number[],
    extraPickBonuses: [1, 0, 0, 0, 1, 1] as number[],
    extraEmptyCards: 5,
    chanceCards: 1,
    roundingUnit: 100,
    chanceMultiplier: 2,
    initialFlips: 3,
  },

  // Feature 9: daily-rotating gacha + simulated community stats.
  dailyGacha: {
    activeCardsPerDay: 7,
    communitySim: { basePulls: 400, variance: 0.35 },
  },

  // Feature 10: gift box.
  giftBox: {
    adRewardPoints: 100,
    milestones: [
      { id: "games-50", games: 50, points: 200, title: "50 Games Played" },
      { id: "games-200", games: 200, points: 500, title: "200 Games Played" },
    ],
  },

  // Daily claim (existing TopBar button). Real lever is the point_settings
  // rows member_daily_points / guest_daily_points (editable in /admin);
  // these are the code fallbacks when those rows are absent.
  dailyClaim: { memberDaily: 200, guestDaily: 200 },

  // Starting stake for a battle run. Applied as a floor (top up to this when
  // below it), never as a repeatable grant -- see resetBattleRun.
  battleStart: { minimumPoints: 100 },

  // Feature 8: shop foundation. Redeeming stays disabled until the points
  // economy has been test-run (admin can flip enabled to 1/true).
  shop: {
    enabled: false as boolean | number,
    items: [
      {
        id: "pull-ticket-1",
        title: "Single Pull Ticket",
        desc: "One free gacha pull.",
        cost: 100,
      },
      {
        id: "pull-ticket-10",
        title: "10 Pull Ticket",
        desc: "A full 10-pull, at a discount.",
        cost: 900,
      },
      {
        id: "bgm-pack",
        title: "Bonus BGM Pack",
        desc: "Unlocks extra background tracks.",
        cost: 300,
      },
    ],
  },

  // Battle cabinet (v8 shell): Pixi table layout overrides, applied only in
  // cabinet mode. Units are Pixi canvas px (1200x500 stage, displayed at
  // scale .82 inside the table glass). Values are chosen so the card stack
  // matches the disk exit pocket and cards land on the three recessed bays in
  // the premium table plate.
  cabinetTable: {
    CARD_SCALE: 0.22,
    CARD_START_X: 132,
    CARD_START_Y: 189, // aligned with the disk exit gate row
    CARD_END_X: 313,
    CARD_END_Y: 189,
    SLOT1_X: 285,
    SLOT1_Y: 237,
    SLOT2_X: 600,
    SLOT2_Y: 237,
    SLOT3_X: 915,
    SLOT3_Y: 237,
  },

  // Slot-machine reel mechanics layered over the three-card table.
  // Presentation only — none of this touches the outcome lottery. The hand is
  // already decided by resultLottery before a single card is flipped; these
  // rules only change how that decided hand is delivered to the player.
  reelMechanics: {
    // Combination flash, fired as the completing card settles.
    //
    // The table reads as circuitry that has just electrically detected the
    // cards. Once all three are down, thin digital traces escape from the
    // bottom edge of each card and snake outward across the table in
    // right-angle steps, the way a current runs through a printed board.
    //
    // The table is split into three sections, one per card — three reels in
    // slot terms — and each section's card emits its own traces. Everything is
    // drawn on the table's perspective plane, so the traces foreshorten with
    // the table and stay inside the glass.
    flash: {
      enabled: true,
      // Symbols that pay a flash when all three match.
      tripleSymbols: ["Coin", "Bar", "Defense", "Reply"] as string[],
      // Attack landing on the target slot flashes too.
      attackOnTarget: true,
      // Chance flashes, brightness scaling with how many landed.
      chance: true,
      // Total run time of the trace burst.
      holdMs: 1000,
      // Fired this long after the last card settles, so it lands together with
      // the existing shine sweep rather than as a separate beat.
      startDelayMs: 460,

      trace: {
        // Traces emitted per card. Three sections x this many.
        // Read together with widthPx: the burst is meant to look like fine
        // etched circuitry, so it is many hair-thin lines rather than a few
        // heavy ones.
        perCard: 20,
        // Right-angle turns per trace (min, max).
        segments: [3, 7] as [number, number],
        // Step sizes as a fraction of the table, per straight run.
        stepAcross: [0.04, 0.3] as [number, number],
        stepToward: [0.05, 0.22] as [number, number],
        // Line weight in stage px (min, max).
        widthPx: [0.5, 1.3] as [number, number],
        // Far limit of the trace field, in normalised table space (v=0 is the
        // top of the Pixi plane, which sits ABOVE the table artwork -- the
        // felt does not start until further down). Traces used to be allowed
        // up to v=0.02 and so ran off the top of the table into the cabinet.
        // Card bays begin at v≈0.22, so this keeps the field on the felt with
        // a little room above the cards. Raise it if any still escape.
        minV: 0.16,
        // Length of the bright travelling tail, as a fraction of the path.
        tailFraction: 0.55,
        // Sideways offset of the red/blue fringe copies, in stage px. This is
        // what gives the traces the reference's chromatic shimmer.
        // Scaled down with widthPx: at the old 1.4 the fringe copies were
        // wider apart than the hairlines themselves and read as three lines.
        chromaOffsetPx: 0.8,
      },
    },

    // Tenpai: two shown cards match, so the one still face down can
    // complete the line. Raises the REACH text only — the flip is never held
    // back, and the player can turn the last card whenever they like.
    tenpai: {
      enabled: true,
    },
  },

  eventLog: { maxEvents: 2000 },

  // Testing aids. forceFakeoutPresentation pins every buildup game to one
  // presentation instead of rolling dialogue/chanceReveal per game.
  debug: {
    forceFakeoutPresentation: null as FakeoutPresentation | null,

    // Pins a battle outcome to a fixed probability (0-1), overriding the
    // spreadsheet odds. Every other outcome keeps its relative odds and shares
    // whatever probability is left, so the distribution still sums to 1.
    // Empty = spreadsheet values. Testing aid only; leave empty for release.
    // Example: { SingleChance: 0.5 } to exercise the chance reward quickly.
    //
    // TEST ONLY — half of all hands are forced to a single Chance so the land
    // cue, impact wave, and points reveal remain easy to test. Set back to {}
    // before shipping to restore the spreadsheet odds.
    forceResultProbability: { SingleChance: 0.5 } as Record<string, number>,
  },
};

// ---------------------------------------------------------------------------
// Runtime overrides (admin page). The admin panel writes a JSON patch to
// localStorage; on load we deep-merge it onto the live patchConfig object.
// Because every consumer imports the same object by reference and reads its
// fields at call time, edits take effect without a code change.
// ---------------------------------------------------------------------------

const OVERRIDES_KEY = "patch_config_overrides";

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
) {
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      deepMerge(targetValue, sourceValue);
    } else {
      target[key] = sourceValue;
    }
  }
}

export function getPatchConfigOverrides(): DeepPartial<typeof patchConfig> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(OVERRIDES_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * deepMerge can add and change keys but never delete them, which is wrong for
 * the outcome pins: that object is a dictionary the admin owns wholesale, and
 * un-pinning an outcome means removing its key. Merging an override that omits
 * it would silently leave the old pin (or the code default) in place, so the
 * pins are assigned outright whenever the overrides carry them.
 */
function applyOverrides(overrides: DeepPartial<typeof patchConfig>) {
  deepMerge(patchConfig as Record<string, unknown>, overrides as Record<string, unknown>);

  const pins = overrides?.debug?.forceResultProbability;

  if (pins) {
    patchConfig.debug.forceResultProbability = {
      ...(pins as Record<string, number>),
    };
  }
}

/** Merge stored overrides onto the live config. Runs once on module load. */
export function hydratePatchConfig() {
  applyOverrides(getPatchConfigOverrides());
}

/** Persist overrides and apply them to the live config immediately. */
export function savePatchConfigOverrides(
  overrides: DeepPartial<typeof patchConfig>
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  applyOverrides(overrides);
}

export function clearPatchConfigOverrides() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(OVERRIDES_KEY);
}

hydratePatchConfig();
