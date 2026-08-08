import {
  cards as configuredCards,
  rarityRates,
} from "@/lib/game-config/generated";
import { patchConfig } from "@/lib/game-config/patchConfig";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";

export type Card = {
  name: string;
  rarity: string;
  image: string;
  backImage?: string;
};

export const cards: Card[] = configuredCards.map((card) => ({
  ...card,
  backImage: PLAYER_CARD_BACK_IMAGE,
}));

export function rollRarity() {
  // Admin-editable gacha odds override the spreadsheet rates when present.
  const rates: Record<string, number> = {
    ...rarityRates,
    ...patchConfig.gachaOdds,
  };

  const rand = Math.random() * 100;
  let cumulative = 0;

  for (const [rarity, rate] of Object.entries(rates)) {
    cumulative += rate;
    if (rand < cumulative) return rarity;
  }

  return Object.keys(rates).at(-1) ?? "R";
}

export function pullOne() {
  const rarity = rollRarity();
  // Feature 9 note: the daily lineup (lib/gacha/dailyRotation.ts) is
  // display-only for now; pulls still draw from the full pool.
  const pool = cards.filter((card) => card.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pullMany(count: number) {
  return Array.from({ length: count }, () => pullOne());
}
