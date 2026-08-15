// Which of the three bonus openings a won bonus plays, and therefore what the
// bonus itself is.
//
//   regular  -> 5/5 classic bonus
//   super    -> 7/7 classic bonus
//   superMax -> the nested loop bonus
//
// This replaces two older rules that decided the same thing separately: a flat
// 50% nested-vs-classic roll at enemy defeat, and a "Chance in the opening hand
// means 7 games" branch in the draw handler. Both are folded in here so the
// bonus grade is one decision with one set of odds.

import { patchConfig } from "@/lib/game-config/patchConfig";

export type BonusType = "regular" | "super" | "superMax";

function weightedPick(weights: Partial<Record<BonusType, number>>): BonusType {
  const entries = Object.entries(weights) as [BonusType, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);

  if (total <= 0) return "regular";

  let roll = Math.random() * total;

  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return type;
  }

  return entries[entries.length - 1][0];
}

/**
 * Rolls the bonus grade.
 *
 * `openingHandHasChance` is the bonus chance: drawing a Chance card in the
 * opening game removes the regular bonus from the table entirely, so the
 * player is guaranteed at least a super bonus.
 */
export function rollBonusType(openingHandHasChance: boolean): BonusType {
  const odds = patchConfig.bonusType;

  return weightedPick(
    openingHandHasChance ? odds.withBonusChance : odds.base
  );
}

/** Classic-bonus game count for a grade. superMax runs the nested loop instead. */
export function bonusGamesForType(type: BonusType): number {
  return type === "super"
    ? patchConfig.bonusType.superGames
    : patchConfig.bonusType.regularGames;
}
