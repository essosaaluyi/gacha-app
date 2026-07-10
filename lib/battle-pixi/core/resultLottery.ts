import {
  battleResultOdds as configuredBattleResultOdds,
  visualPatternsByResult as configuredVisualPatternsByResult,
} from "@/lib/game-config/generated";

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

export const battleResultWeights: WeightedBattleResult[] = (() => {
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
  return pickWeighted(battleResultWeights).result;
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

export function drawBattleResult(): BattleResult {
  const result = pickBattleResult();

  return {
    result,
    cards: generateCardsFromResult(result),
    targetSlot: generateTargetSlot(),
  };
}
