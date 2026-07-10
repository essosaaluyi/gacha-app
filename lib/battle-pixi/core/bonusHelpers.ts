import { BattleResult } from "@/lib/battle-pixi/core/resultLottery";

export function hasChanceCard(
  result: BattleResult
) {
  return result.cards.includes("Chance");
}

export function hasBarCard(
  result: BattleResult
) {
  return result.cards.includes("Bar");
}