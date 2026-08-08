// Feature 6: builds the face-down deck for the post-bonus pick phase.
// Pure and config-driven.
//
// Design (mirrors a classic pachislot AT): a pick can pay points AND extend the round at
// the same time. Picks are finite, so running low is the tension and a combo
// card is the relief. The cost of that generosity is a deck carrying more
// EMPTY cards — the dud density is the balancing lever.
//
// Point values are drawn from a denomination ladder and allocated so the deck
// sums to the bonus total. That makes "MAX" on the board literally true: a
// perfect run pays exactly the bonus the player won.

import { patchConfig } from "@/lib/game-config/patchConfig";

export type CollectionCardType =
  | "collect" // ends the round
  | "empty" // dud
  | "chance" // doubles the next pick
  | "doubleAll" // doubles everything banked so far
  | "mystery" // shows "?", resolves to a pre-assigned value
  | "pick" // grants extra picks only
  | "point"; // pays points, and may also grant picks (the combo card)

export type CollectionCard = {
  type: CollectionCardType;
  /** Payout for point/mystery cards. */
  points: number;
  /** Extra picks granted. Non-zero on "pick" and on combo point cards. */
  picks: number;
};

function fisherYates<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Splits `total` across `count` cards using the denomination ladder, keeping
 * the sum exact so the board's MAX is achievable. Falls back to an even split
 * when the total is too small for the ladder to be meaningful.
 */
function allocatePoints(total: number, count: number, ladder: number[]): number[] {
  if (count <= 0) return [];

  const rungs = [...ladder].filter((v) => v > 0).sort((a, b) => a - b);
  if (rungs.length === 0 || total <= 0) return new Array(count).fill(0);

  const values: number[] = [];
  let remaining = total;

  for (let i = 0; i < count - 1; i += 1) {
    const cardsLeft = count - i;
    // Stay affordable: never take so much that the remaining cards must be 0.
    const ceiling = remaining - (cardsLeft - 1) * rungs[0];
    const affordable = rungs.filter((v) => v <= ceiling);
    const pick =
      affordable.length > 0
        ? affordable[Math.floor(Math.random() * affordable.length)]
        : rungs[0];

    values.push(pick);
    remaining -= pick;
  }

  // The last card absorbs the remainder so the deck sums to exactly `total`.
  values.push(Math.max(0, remaining));
  return values;
}

export function buildCollectionDeck(bonusTotal: number): CollectionCard[] {
  const { composition, pointLadder, comboPickCards, pickCardPicks } =
    patchConfig.collection;

  const ladder = pointLadder ?? [10, 20, 50, 100, 300, 1000];
  const pointCount = Math.max(1, composition.point);
  const values = allocatePoints(bonusTotal, pointCount, ladder);

  const cards: CollectionCard[] = [];

  const push = (type: CollectionCardType, points = 0, picks = 0) =>
    cards.push({ type, points, picks });

  for (let i = 0; i < composition.collect; i += 1) push("collect");
  for (let i = 0; i < composition.empty; i += 1) push("empty");
  for (let i = 0; i < composition.chance; i += 1) push("chance");
  for (let i = 0; i < (composition.doubleAll ?? 0); i += 1) push("doubleAll");
  for (let i = 0; i < (composition.pick ?? 0); i += 1)
    push("pick", 0, pickCardPicks ?? 1);

  // Mystery hides a real value chosen now, not during the flip — the reward is
  // always settled before any animation starts.
  for (let i = 0; i < (composition.mystery ?? 0); i += 1) {
    push("mystery", ladder[Math.floor(Math.random() * ladder.length)]);
  }

  // The Yoshimune-style combo: the first N point cards also extend the round.
  const combos = Math.min(comboPickCards ?? 0, pointCount);
  values.forEach((points, index) => {
    push("point", points, index < combos ? 1 : 0);
  });

  return fisherYates(cards);
}
