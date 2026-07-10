import {
  Container,
  Rectangle,
  Sprite,
  Texture,
} from "pixi.js";

import { UI } from "@/lib/battle-pixi/config";

type ResetBattleCardsToGroupArgs = {
  drawCards: Sprite[];
  cardGroup: Container;
  cardBackTexture: Texture;
  revealed: boolean[];
  setRevealedCount: (value: number) => void;
  setCardsReleased: (value: boolean) => void;
};

export function resetBattleCardsToGroup({
  drawCards,
  cardGroup,
  cardBackTexture,
  revealed,
  setRevealedCount,
  setCardsReleased,
}: ResetBattleCardsToGroupArgs) {
  drawCards.forEach((card) => {
    if (card.parent !== cardGroup) {
      card.parent?.removeChild(card);
      cardGroup.addChild(card);
    }

    card.texture = cardBackTexture;
    card.visible = false;
    card.x = 0;
    card.y = 0;
    card.alpha = 1;
    card.scale.set(UI.CARD_SCALE);
    card.rotation = UI.CARD_ROTATION;
    card.eventMode = "none";
  });

  cardGroup.visible = true;
  cardGroup.x = UI.CARD_START_X;
  cardGroup.y = UI.CARD_START_Y;
  cardGroup.alpha = 1;
  cardGroup.eventMode = "static";
  cardGroup.cursor = "grab";
  cardGroup.hitArea = new Rectangle(-30, -130, 300, 260);

  revealed[0] = false;
  revealed[1] = false;
  revealed[2] = false;

  setRevealedCount(0);
  setCardsReleased(false);
}
