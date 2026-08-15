import { Texture } from "pixi.js";
import type { BattleCardSymbol } from "../core/resultLottery";
import type { AnimationGuard } from "./animations";
import type { BattleCardView } from "./battleCardView";
import { playCardRevealPresentation } from "./cardPresentation";
import { pulseMagicCircle } from "@/lib/battle-pixi/state/magicCircleStore";
import { dismissChanceIcon } from "@/lib/battle-pixi/state/chanceIconOverlayStore";

type RevealCardParams = {
  card: BattleCardView;
  cardIndex: number;
  revealed: boolean[];
  currentCards: BattleCardSymbol[];
  symbolTextures: Record<BattleCardSymbol, Texture>;
  onRevealComplete: () => void;
  onFaceSwap?: () => void;
  closeDurationMs?: number;
  openDurationMs?: number;
  /**
   * Returns false once the owning hand has been superseded; the flip then
   * stops writing to the sprite and never fires `onRevealComplete`, so a stale
   * reveal cannot mutate a newer hand's card.
   */
  guard?: AnimationGuard;
};

const alwaysAlive: AnimationGuard = () => true;

function animatePhase(
  duration: number,
  onFrame: (progress: number) => void,
  onComplete: (() => void) | undefined,
  guard: AnimationGuard
) {
  const startTime = performance.now();

  const frame = (now: number) => {
    if (!guard()) return;

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
  onFaceSwap,
  closeDurationMs = 220,
  openDurationMs = 115,
  guard = alwaysAlive,
}: RevealCardParams) {
  if (revealed[cardIndex]) return;

  revealed[cardIndex] = true;
  dismissChanceIcon(cardIndex);

  const symbol = currentCards[cardIndex];

  // Dev-only: three of these per hand, every hand.
  if (process.env.NODE_ENV !== "production") {
    console.log(`Reveal Card ${cardIndex + 1}:`, symbol);
  }

  const startScaleX = card.scale.x;
  const startScaleY = card.scale.y;

  animatePhase(
    closeDurationMs,
    (progress) => {
      const eased = progress * progress;
      card.scale.set(startScaleX * (1 - 0.94 * eased), startScaleY);
    },
    () => {
      card.texture = symbolTextures[symbol];
      onFaceSwap?.();

      animatePhase(
        openDurationMs,
        (progress) => {
          const eased = 1 - Math.pow(1 - progress, 3);
          card.scale.set(startScaleX * (0.06 + 0.94 * eased), startScaleY);
        },
        () => {
          card.scale.set(startScaleX, startScaleY);
          card.skew.set(0, 0);

          playCardRevealPresentation(symbol);
          pulseMagicCircle();
          onRevealComplete();
        },
        guard
      );
    },
    guard
  );
}
