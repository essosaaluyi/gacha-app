import {
  Container,
  Rectangle,
  Texture,
} from "pixi.js";

import { UI } from "@/lib/battle-pixi/config";
import type { BattleCardView } from "@/lib/battle-pixi/presentation/battleCardView";

type ResetBattleCardsToGroupArgs = {
  drawCards: BattleCardView[];
  cardGroup: Container;
  cardBackTexture: Texture;
  revealed: boolean[];
  setRevealedCount: (value: number) => void;
  setCardsReleased: (value: boolean) => void;
  /** Layout values (cabinet mode overrides card scale/start); defaults to UI. */
  layout?: {
    CARD_SCALE: number;
    CARD_START_X: number;
    CARD_START_Y: number;
  };
};

export function resetBattleCardsToGroup({
  drawCards,
  cardGroup,
  cardBackTexture,
  revealed,
  setRevealedCount,
  setCardsReleased,
  layout = UI,
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
    card.scale.set(layout.CARD_SCALE);
    card.rotation = UI.CARD_ROTATION;
    card.eventMode = "none";
  });

  cardGroup.visible = true;
  cardGroup.x = layout.CARD_START_X;
  cardGroup.y = layout.CARD_START_Y;
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
