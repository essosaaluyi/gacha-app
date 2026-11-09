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
  attackOffTarget: boolean;
  attackCardRate: number;
  chanceAttack: boolean;
  emptySlotAttack: boolean;
  emptySlotAttackRate: number;
  attackAttempt: boolean;
  chanceAttackRate: number;
};

export function evaluateResult(
  battleResult: BattleResult,
  playerTier?: string,
  playerCardId?: string,
  resolvedPlayerWinRate?: number
): EvaluatedBattleResult {
  const targetCard =
    battleResult.cards[battleResult.targetSlot];

  const chanceCount = battleResult.cards.filter(
    (card) => card === "Chance"
  ).length;

  const attackOnTarget = targetCard === "Attack";
  const attackOffTarget =
    !attackOnTarget && battleResult.cards.includes("Attack");

  // W RATE is character-owned. An unknown ID intentionally receives no hidden
  // rarity fallback; missing roster data should fail closed and be noticeable.
  const printedWinRate =
    resolvedPlayerWinRate ??
    patchConfig.playerWinRate.ratesByCard[playerCardId ?? ""] ??
    0;

  const attackCardRate = attackOnTarget
    ? printedWinRate
    : attackOffTarget
      ? printedWinRate / 2
      : 0;

  const chanceAttack = chanceCount > 0;

  const chanceTargetBonus =
    targetCard === "Chance"
      ? patchConfig.tableCards.chanceTargetAttackBonus
      : 0;

  const chanceAttackRate = Math.min(
    chanceCount * CHANCE_RATE_PER_CARD + chanceTargetBonus,
    100
  );

  // Feature 1: an Empty target slot rolls for an attack attempt at a rate
  // set by the tier of the player's active battle card (R 10% ... UR 40%).
  const emptySlotAttack =
    targetCard === "Empty" && !chanceAttack && !attackOffTarget;

  const emptySlotAttackRate =
    patchConfig.emptySlotAttack.ratesByTier[playerTier ?? "R"] ??
    patchConfig.emptySlotAttack.ratesByTier.R;

  const attackAttempt =
    attackOnTarget || attackOffTarget || chanceAttack || emptySlotAttack;

  return {
    targetCard,
    chanceCount,
    attackOnTarget,
    attackOffTarget,
    attackCardRate,
    chanceAttack,
    emptySlotAttack,
    emptySlotAttackRate,
    attackAttempt,
    chanceAttackRate,
  };
}
