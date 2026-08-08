import {
  battleResultOdds as configuredBattleResultOdds,
  visualPatternsByResult as configuredVisualPatternsByResult,
} from "@/lib/game-config/generated";
import { patchConfig } from "@/lib/game-config/patchConfig";

export type BattleCardSymbol =
  | "Attack"
  | "Defense"
  | "Coin"
  | "Reply"
  | "Bar"
  | "Chance"
  | "Empty";

export type BattleOutcome =
  | "Attack"
  | "Defense"
  | "Coin"
  | "Reply"
  | "Bar"
  | "SingleChance"
  | "DoubleChance"
  | "TripleChance"
  | "Empty";

export type BattleResult = {
  result: BattleOutcome;
  cards: BattleCardSymbol[];
  targetSlot: 0 | 1 | 2;
};

type WeightedBattleResult = {
  result: BattleOutcome;
  weight: number;
};

type WeightedPattern = {
  cards: readonly BattleCardSymbol[];
  weight: number;
};

const RESULT_WEIGHT_TOTAL = 1_000_000;

const battleResultOdds = configuredBattleResultOdds as readonly {
  result: BattleOutcome;
  odds: number;
}[];

/** Spreadsheet odds ("1 in N") expanded to weights, with Empty as the remainder. */
const baseBattleResultWeights: WeightedBattleResult[] = (() => {
  const fixedWeights = battleResultOdds.map((item) => ({
    result: item.result,
    weight: Math.round(RESULT_WEIGHT_TOTAL / item.odds),
  }));

  const fixedTotal = fixedWeights.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  const emptyWeight = Math.max(
    0,
    RESULT_WEIGHT_TOTAL - fixedTotal
  );

  return [
    ...fixedWeights,
    {
      result: "Empty",
      weight: emptyWeight,
    },
  ];
})();

/**
 * The spreadsheet odds as percentage shares, ignoring any debug pins. Exposed
 * for the admin panel so an override can be shown next to the value it is
 * replacing -- `generated.ts` is rebuilt from the xlsx and must not be edited,
 * so the sheet figure is read-only reference, never an input.
 */
export function getBaselineResultShares(): Record<string, number> {
  const shares: Record<string, number> = {};

  for (const item of baseBattleResultWeights) {
    shares[item.result] = (item.weight / RESULT_WEIGHT_TOTAL) * 100;
  }

  return shares;
}

/** Outcomes in the order the admin panel lists them: most common first. */
export function getBattleOutcomeOrder(): string[] {
  return [...baseBattleResultWeights]
    .sort((a, b) => b.weight - a.weight)
    .map((item) => item.result);
}

/**
 * Applies any debug probability pins. A pinned outcome gets exactly its
 * requested share; the rest are scaled proportionally into what remains, so
 * their odds relative to each other are untouched and the total still sums to
 * one. Read per draw so the admin panel's runtime overrides take effect.
 */
export function getBattleResultWeights(): WeightedBattleResult[] {
  const pinned = patchConfig.debug.forceResultProbability ?? {};
  const pinnedResults = Object.keys(pinned);

  if (pinnedResults.length === 0) return baseBattleResultWeights;

  const pinnedShare = Math.min(
    1,
    pinnedResults.reduce((sum, key) => sum + Math.max(0, pinned[key]), 0)
  );

  const restWeight = baseBattleResultWeights
    .filter((item) => !pinnedResults.includes(item.result))
    .reduce((sum, item) => sum + item.weight, 0);

  const restScale =
    restWeight > 0 ? ((1 - pinnedShare) * RESULT_WEIGHT_TOTAL) / restWeight : 0;

  return baseBattleResultWeights.map((item) =>
    pinnedResults.includes(item.result)
      ? {
          result: item.result,
          weight: Math.max(0, pinned[item.result]) * RESULT_WEIGHT_TOTAL,
        }
      : { result: item.result, weight: item.weight * restScale }
  );
}

function pickWeighted<T extends { weight: number }>(items: readonly T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * total;

  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }

  return items[items.length - 1];
}

export function pickBattleResult(): BattleOutcome {
  return pickWeighted(getBattleResultWeights()).result;
}
function shuffleCards(cards: readonly BattleCardSymbol[]): BattleCardSymbol[] {
  return [...cards].sort(() => Math.random() - 0.5);
}

const visualPatternsByResult =
  configuredVisualPatternsByResult as Record<
    BattleOutcome,
    readonly WeightedPattern[]
  >;

export function generateTargetSlot(): 0 | 1 | 2 {
  return Math.floor(Math.random() * 3) as 0 | 1 | 2;
}

export function generateCardsFromResult(
  result: BattleOutcome
): BattleCardSymbol[] {
  const patterns = visualPatternsByResult[result];
  const selectedPattern = pickWeighted(patterns);

  // Defense, Reply, Bar stay visually matched.
  // Others are shuffled so Attack/Chance/Coin can land in random slots.
  if (
  result === "Defense" ||
  result === "Reply" ||
  result === "Bar" ||
  result === "Empty"
) {
  return [...selectedPattern.cards];
}

return shuffleCards(selectedPattern.cards);
}

// Dev-only console helper: `__sampleBattleOdds(20000)` reports the live
// outcome distribution, including any debug probability pins.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (
    window as Window & {
      __sampleBattleOdds?: (runs?: number) => Record<string, string>;
    }
  ).__sampleBattleOdds = (runs = 20000) => {
    const counts: Record<string, number> = {};
    let handsWithOneChance = 0;

    for (let i = 0; i < runs; i += 1) {
      const result = pickBattleResult();
      counts[result] = (counts[result] ?? 0) + 1;

      const cards = generateCardsFromResult(result);
      if (cards.filter((card) => card === "Chance").length === 1) {
        handsWithOneChance += 1;
      }
    }

    const pct = (n: number) => `${((100 * n) / runs).toFixed(2)}%`;
    const report: Record<string, string> = {};

    Object.keys(counts)
      .sort()
      .forEach((key) => {
        report[key] = pct(counts[key]);
      });

    report["** hands with exactly one Chance **"] = pct(handsWithOneChance);
    return report;
  };
}

export function drawBattleResult(): BattleResult {
  const result = pickBattleResult();

  return {
    result,
    cards: generateCardsFromResult(result),
    targetSlot: generateTargetSlot(),
  };
}
