import type { BarChanceOutcome, BattleCardSymbol } from "./resultLottery";

/**
 * BAR CHANCE tells its result by the ORDER the cards are turned, not by where
 * they lie. The lottery has already decided the outcome; this only decides
 * which card carries the miss.
 *
 *   Starting from either end   the first two cards turned are always BAR, and
 *                              the last one says whether the line is made.
 *                              A BAR on the first card promises nothing.
 *   Starting from the middle   the middle card is the whole answer: BAR means
 *                              the line is made, anything else means it is not.
 *
 * So on a miss, the Empty sits on the middle card if that is turned first, and
 * otherwise on whichever card is turned last. A hit is three BARs however it
 * is turned.
 *
 * Call this just before a card is turned. `cards` is the hand as it stands,
 * `revealed` marks the cards already turned (their symbols are never changed),
 * `slot` is the card about to turn. Returns the hand to show from now on.
 */
export function arrangeBarChanceCards(
  outcome: BarChanceOutcome,
  cards: readonly BattleCardSymbol[],
  revealed: readonly boolean[],
  slot: number
): BattleCardSymbol[] {
  if (outcome === "success") return ["Bar", "Bar", "Bar"];

  const slots = [0, 1, 2];
  let miss = slots.find((index) => revealed[index] && cards[index] === "Empty");

  if (miss === undefined) {
    const turned = slots.filter((index) => revealed[index]).length;
    // The cards still face down after this one turns.
    const waiting = slots.filter((index) => !revealed[index] && index !== slot);

    if (turned === 0 && slot === 1) miss = 1;
    // Not yet decided between the two that wait: it goes to whichever of them
    // turns last, which the next call settles. Until then it rests on the last.
    else miss = waiting.length > 0 ? waiting[waiting.length - 1] : slot;
  }

  return slots.map((index) => (index === miss ? "Empty" : "Bar"));
}
