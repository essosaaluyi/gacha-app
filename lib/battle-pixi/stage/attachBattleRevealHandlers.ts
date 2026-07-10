import { Sprite, Texture } from "pixi.js";

import { revealCard } from "@/lib/battle-pixi/presentation/cardRevealSystem";

type BattleSymbolName =
  | "Attack"
  | "Defense"
  | "Coin"
  | "Reply"
  | "Bar"
  | "Chance"
  | "Empty";

type AttachBattleRevealHandlersArgs = {
  cards: Sprite[];
  revealed: boolean[];
  currentCards: BattleSymbolName[];
  symbolTextures: Record<BattleSymbolName, Texture>;
  onRevealComplete: () => void;
};

export function attachBattleRevealHandlers({
  cards,
  revealed,
  currentCards,
  symbolTextures,
  onRevealComplete,
}: AttachBattleRevealHandlersArgs) {
  cards.forEach((card, index) => {
    card.removeAllListeners("pointertap");

    card.on("pointertap", () =>
      revealCard({
        card,
        cardIndex: index,
        revealed,
        currentCards,
        symbolTextures,
        onRevealComplete,
      })
    );
  });
}