import type { BattleResult } from "@/lib/battle-pixi/core/resultLottery";

/**
 * Which anticipation tell, if any, a drawn hand has earned.
 *
 * `null` is the common case and the important one: an ordinary hand gets no
 * tell at all, so the disc lighting up always means something. The three that
 * do earn one are the hands a player can act on the anticipation of — a chance
 * in the hand, an attack, or the triple.
 *
 * Read once, when the hand is drawn on the first Draw press. The lottery has
 * already decided by then; nothing downstream re-rolls it.
 */
export type DrawTell = "chance" | "attack" | "triple" | null;

export function readDrawTell(result: BattleResult): DrawTell {
  // Checked first because a triple is also three Chance cards, and it is the
  // bigger read of the two.
  if (result.result === "TripleChance") return "triple";
  if (result.cards.includes("Chance")) return "chance";
  if (result.result === "Attack") return "attack";
  return null;
}
