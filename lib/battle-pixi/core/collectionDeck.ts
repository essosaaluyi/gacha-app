// Builds the 12-card Pick a Bonus table used by both normal and extra rounds.
// The accepted prototype was tuned at a 600P cap. Production bonus totals can
// vary, so its point values are scaled while its card and pick distribution
// remain unchanged.

import { patchConfig } from "@/lib/game-config/patchConfig";

export type CollectionCardType =
  | "collect"
  | "empty"
  | "chance"
  | "doubleAll"
  | "mystery"
  | "pick"
  | "point";

export type CollectionCard = {
  type: CollectionCardType;
  points: number;
  picks: number;
};

function fisherYates<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function scalePointValue(value: number, cap: number) {
  const baseCap = Math.max(1, patchConfig.collection.baseCap);
  return Math.max(1, Math.round((value * cap) / baseCap));
}

export function buildCollectionDeck(
  bonusCap: number,
  extraMode = false
): CollectionCard[] {
  const config = patchConfig.collection;
  const values = extraMode
    ? config.extraPointValues
    : config.standardPointValues;
  const pickBonuses = extraMode
    ? config.extraPickBonuses
    : config.standardPickBonuses;
  const emptyCount = extraMode
    ? config.extraEmptyCards
    : config.standardEmptyCards;

  const cards: CollectionCard[] = values.map((value, index) => ({
    type: "point",
    points: scalePointValue(value, bonusCap),
    picks: pickBonuses[index] ?? 0,
  }));

  for (let index = 0; index < emptyCount; index += 1) {
    cards.push({ type: "empty", points: 0, picks: 0 });
  }

  for (let index = 0; index < config.chanceCards; index += 1) {
    cards.push({ type: "chance", points: 0, picks: 0 });
  }

  return fisherYates(cards);
}
