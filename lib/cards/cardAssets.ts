export const PLAYER_CARD_BACK_IMAGE = "/images/cards/player/card-back-latest.png";

export type CardAssetSet = {
  frontImage: string;
  backImage: string;
};

/**
 * Player card fronts redrawn since they first shipped, by card id. Files under
 * public/ are cached for a year, so a redrawn front gets a new name rather than
 * being written over the old one.
 *
 * v2 (owner, 2026-11-18): the white ground round the card, and the marks
 * printed on it, cleared, so the card stands on a see-through ground as UR1,
 * SR1 and SSR1 always did. The card itself is where it was on the canvas.
 */
const PLAYER_CARD_FRONT_FILES: Record<string, string> = {
  R1: "card.v2.webp", R2: "card.v2.webp", R3: "card.v2.webp", R4: "card.v2.webp",
  SR2: "card.v2.webp", SR3: "card.v2.webp", SR4: "card.v2.webp",
  SSR2: "card.v2.webp", SSR3: "card.v2.webp", SSR4: "card.v2.webp",
  UR2: "card.v2.webp", UR3: "card.v2.webp",
};

/** The current front of a player card ("R1", "SSR2" ...). */
export function playerCardFrontImage(cardId: string) {
  return `/images/cards/player/${cardId}/${PLAYER_CARD_FRONT_FILES[cardId] ?? "card.webp"}`;
}

/**
 * A stored picture of a player card brought up to its current front. Pulls,
 * decks and saved hands keep the path they were made with, which may name a
 * front that has since been redrawn. Any other path is returned as it is.
 */
export function currentPlayerCardImage(image: string) {
  const id = image.match(/^\/images\/cards\/player\/([A-Z]+\d+)\/card\.(?:webp|png)$/)?.[1];
  return id ? playerCardFrontImage(id) : image;
}

export function getPlayerCardAssetSet(cardId: string): CardAssetSet {
  return {
    frontImage: playerCardFrontImage(cardId),
    backImage: PLAYER_CARD_BACK_IMAGE,
  };
}

export function resolvePlayerCardBack(backImage?: string) {
  return backImage || PLAYER_CARD_BACK_IMAGE;
}
