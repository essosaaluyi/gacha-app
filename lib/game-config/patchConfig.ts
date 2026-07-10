// Hand-editable tuning config for the v-Next feature patch.
// Unlike generated.ts (which is regenerated from game-config/game-config.xlsx),
// this file is safe to edit directly. Values here can be migrated into the
// spreadsheet + tools/sync-game-config-from-spreadsheet.py later.

export type FakeoutVariant = "none" | "delayed3" | "classic";

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

  // Feature 2: how an attack attempt presents. Weighted lottery.
  // "classic" is the pre-patch enemy-counter fakeout, kept at weight 0 so it
  // can be tuned back on without a code change.
  fakeout: {
    variants: [
      { variant: "none" as FakeoutVariant, weight: 50 },
      { variant: "delayed3" as FakeoutVariant, weight: 50 },
      { variant: "classic" as FakeoutVariant, weight: 0 },
    ],
    delayedCycleGames: 3,
  },

  // Feature 3: resurrection (逆転) reveal for hidden wins on the "none" path.
  resurrection: {
    enabled: true,
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
  barReset: {
    realResetChance: 1 / 9,
    fakeChance: 1 / 6,
    fakePoints: 20,
    resetGamesTo: 5,
  },

  // Feature 6: post-bonus collection (pick-me) phase.
  collection: {
    gridSize: 12,
    composition: { collect: 1, empty: 1, chance: 1, point: 9 },
    roundingUnit: 100,
    chanceMultiplier: 2,
    cascadeStep: 0.25,
    replayGrantsExtraFlip: true,
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

  // Feature 8: shop foundation. Redeeming stays disabled until the points
  // economy has been test-run.
  shop: { enabled: false },

  eventLog: { maxEvents: 2000 },

  // Testing aids. forceFakeoutVariant overrides the fakeout lottery.
  debug: {
    forceFakeoutVariant: null as FakeoutVariant | null,
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

/** Merge stored overrides onto the live config. Runs once on module load. */
export function hydratePatchConfig() {
  const overrides = getPatchConfigOverrides();
  deepMerge(patchConfig as Record<string, unknown>, overrides as Record<string, unknown>);
}

/** Persist overrides and apply them to the live config immediately. */
export function savePatchConfigOverrides(
  overrides: DeepPartial<typeof patchConfig>
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  deepMerge(patchConfig as Record<string, unknown>, overrides as Record<string, unknown>);
}

export function clearPatchConfigOverrides() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(OVERRIDES_KEY);
}

hydratePatchConfig();
