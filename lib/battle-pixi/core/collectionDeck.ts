// Feature 6: builds the 12-card face-down deck for the post-bonus
// collection (pick-me) phase. Pure and config-driven.

import { patchConfig } from "@/lib/game-config/patchConfig";

export type CollectionCardType = "collect" | "empty" | "chance" | "point";

export type CollectionCard = {
  type: CollectionCardType;
  points: number; // only meaningful for "point"
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
 * Splits `bonusTotal` across the point cards, each rounded to a clean unit
 * (default 100) so there are no messy decimals. The collection phase caps the
 * banked amount at bonusTotal, so the split only needs to be roughly even.
 */
export function buildCollectionDeck(bonusTotal: number): CollectionCard[] {
  const { composition, roundingUnit } = patchConfig.collection;
  const pointCount = composition.point;

  const unit = Math.max(1, roundingUnit);
  const perCard = Math.max(unit, Math.round(bonusTotal / pointCount / unit) * unit);

  const cards: CollectionCard[] = [];
  for (let i = 0; i < composition.collect; i++) cards.push({ type: "collect", points: 0 });
  for (let i = 0; i < composition.empty; i++) cards.push({ type: "empty", points: 0 });
  for (let i = 0; i < composition.chance; i++) cards.push({ type: "chance", points: 0 });
  for (let i = 0; i < pointCount; i++) cards.push({ type: "point", points: perCard });

  return fisherYates(cards);
}
