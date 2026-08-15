export const PLAYER_CARD_BACK_IMAGE = "/images/cards/player/card-back-latest.png";

export type CardAssetSet = {
  frontImage: string;
  backImage: string;
};

export function getPlayerCardAssetSet(cardId: string): CardAssetSet {
  return {
    frontImage: `/images/cards/player/${cardId}/card.webp`,
    backImage: PLAYER_CARD_BACK_IMAGE,
  };
}

export function resolvePlayerCardBack(backImage?: string) {
  return backImage || PLAYER_CARD_BACK_IMAGE;
}
