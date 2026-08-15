// Feature 4: pure helpers for the Nested Loop Bonus — trigger detection,
// the nested-loop selection roll, and the Chance-card reward table.

import { patchConfig } from "@/lib/game-config/patchConfig";
import type { BattleOutcome } from "@/lib/battle-pixi/core/resultLottery";

/** True if a main-loop draw should drop into the nested loop. */
export function isNestedTriggerOutcome(outcome: BattleOutcome): boolean {
  return patchConfig.nestedBonus.triggerOutcomes.includes(outcome);
}

/** True if this bonus should run as the nested loop rather than the classic one. */
export function rollNestedBonusSelected(): boolean {
  return Math.random() * 100 < patchConfig.nestedBonus.selectionShare;
}

/** Weighted reward when a Chance card appears inside the nested loop (50/100/200/300). */
export function rollNestedChancePoints(): number {
  const table = patchConfig.nestedBonus.nestedChanceTable;
  const total = table.reduce((sum, entry) => sum + entry.weight, 0);

  let roll = Math.random() * total;
  let picked = table[0]?.points ?? patchConfig.nestedBonus.nestedMinPoints;

  for (const entry of table) {
    roll -= entry.weight;
    if (roll < 0) {
      picked = entry.points;
      break;
    }
  }

  return picked;
}
