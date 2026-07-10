import type {
  BattleResult,
  BattleCardSymbol,
} from "./resultLottery";
import { CHANCE_RATE_PER_CARD } from "@/lib/game-config/generated";
import { patchConfig } from "@/lib/game-config/patchConfig";

export type EvaluatedBattleResult = {
  targetCard: BattleCardSymbol;
  chanceCount: number;
  attackOnTarget: boolean;
  chanceAttack: boolean;
  emptySlotAttack: boolean;
  emptySlotAttackRate: number;
  attackAttempt: boolean;
  chanceAttackRate: number;
};

export function evaluateResult(
  battleResult: BattleResult,
  playerTier?: string
): EvaluatedBattleResult {
  const targetCard =
    battleResult.cards[battleResult.targetSlot];

  const chanceCount = battleResult.cards.filter(
    (card) => card === "Chance"
  ).length;

  const attackOnTarget = targetCard === "Attack";

  const chanceAttack = chanceCount > 0;

  const chanceAttackRate = Math.min(
    chanceCount * CHANCE_RATE_PER_CARD,
    100
  );

  // Feature 1: an Empty target slot rolls for an attack attempt at a rate
  // set by the tier of the player's active battle card (R 10% ... UR 40%).
  const emptySlotAttack =
    targetCard === "Empty" && !chanceAttack;

  const emptySlotAttackRate =
    patchConfig.emptySlotAttack.ratesByTier[playerTier ?? "R"] ??
    patchConfig.emptySlotAttack.ratesByTier.R;

  const attackAttempt =
    attackOnTarget || chanceAttack || emptySlotAttack;

  return {
    targetCard,
    chanceCount,
    attackOnTarget,
    chanceAttack,
    emptySlotAttack,
    emptySlotAttackRate,
    attackAttempt,
    chanceAttackRate,
  };
}
