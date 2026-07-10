import { Sprite, Texture } from "pixi.js";
import type { BattleCardSymbol } from "../core/resultLottery";
import { playCardRevealPresentation } from "./cardPresentation";
import { pulseMagicCircle } from "@/lib/battle-pixi/state/magicCircleStore";
import { hideChanceIconOverlay } from "@/lib/battle-pixi/state/chanceIconOverlayStore";

type RevealCardParams = {
  card: Sprite;
  cardIndex: number;
  revealed: boolean[];
  currentCards: BattleCardSymbol[];
  symbolTextures: Record<BattleCardSymbol, Texture>;
  onRevealComplete: () => void;
};

function easeInOut(progress: number) {
  return progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

function animatePhase(
  duration: number,
  onFrame: (progress: number) => void,
  onComplete?: () => void
) {
  const startTime = performance.now();

  const frame = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1);

    onFrame(progress);

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      onComplete?.();
    }
  };

  requestAnimationFrame(frame);
}

export function revealCard({
  card,
  cardIndex,
  revealed,
  currentCards,
  symbolTextures,
  onRevealComplete,
}: RevealCardParams) {
  if (revealed[cardIndex]) return;

  revealed[cardIndex] = true;
  hideChanceIconOverlay();

  const symbol = currentCards[cardIndex];

  console.log(`Reveal Card ${cardIndex + 1}:`, symbol);

  const startScaleX = card.scale.x;
  const startScaleY = card.scale.y;

  animatePhase(
    130,
    (progress) => {
      const eased = easeInOut(progress);
      card.scale.set(startScaleX * (1 - 0.94 * eased), startScaleY);
    },
    () => {
      card.texture = symbolTextures[symbol];

      animatePhase(
        130,
        (progress) => {
          const eased = easeInOut(progress);
          card.scale.set(startScaleX * (0.06 + 0.94 * eased), startScaleY);
        },
        () => {
          card.scale.set(startScaleX, startScaleY);
          card.skew.set(0, 0);

          playCardRevealPresentation(symbol);
          pulseMagicCircle();
          onRevealComplete();
        }
      );
    }
  );
}
