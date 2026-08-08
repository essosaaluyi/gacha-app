import { Container, Sprite } from "pixi.js";

import { addBattleLog } from "@/lib/battle-pixi/state/battleLogStore";
import { playSfx } from "@/lib/audio/sfxStore";
import type { BattleCardView } from "@/lib/battle-pixi/presentation/battleCardView";
import { incrementGameCount } from "@/lib/battle-pixi/state/battleGameStore";
import { drawBattleResult } from "@/lib/battle-pixi/core/resultLottery";
import {
  addNestedPoints,
  clearNestedResultConfirm,
  consumeMainGame,
  consumeNestedGame,
  enterNestedLoop,
  finishNestedBonus,
  getNestedBonusState,
  getNestedTotalPoints,
  setPendingNestedResolution,
  showNestedResultConfirm,
  startNestedBonus,
  takePendingNestedResolution,
} from "@/lib/battle-pixi/state/nestedBonusStore";
import {
  hideBonusOverlay,
  hideBonusResult,
  queueBonusResultAfterReveal,
  setBonusGameText,
  setPendingBonusRevealVideo,
  showBonusResult,
  armBonusBackground,
} from "@/lib/battle-pixi/state/bonusPresentationStore";
import { recordDrawOutcome } from "@/lib/battle-pixi/state/drawCostStore";
import { startCollectionPhase } from "@/lib/battle-pixi/state/collectionStore";
import { patchConfig } from "@/lib/game-config/patchConfig";
import { logEvent } from "@/lib/events/gameEventStore";
import {
  isNestedTriggerOutcome,
  rollNestedChancePoints,
} from "@/lib/battle-pixi/core/nestedBonusLottery";

type HandleNestedBonusDrawArgs = {
  setCardsAreOut: (value: boolean) => void;
  drawButton: Sprite;
  drawCards: BattleCardView[];
  stage: Container;
  startNewDraw: () => void;
  resetCardsToGroup: () => void;
  drawCardsFromHolder: () => void;
  setCurrentBattleResult: (result: ReturnType<typeof drawBattleResult>) => void;
  onBonusFinished: (collectionStarted: boolean) => void;
};

function nestedRewardVideo(points: number) {
  const available = [20, 30, 50, 100, 200, 300];
  const match = available.includes(points)
    ? points
    : available.reduce((best, value) =>
        Math.abs(value - points) < Math.abs(best - points) ? value : best
      );
  return `/videos/bonus-reveals/${match}.mp4`;
}

const MAIN_TOTAL = patchConfig.nestedBonus.mainLoopGames;
const NESTED_TOTAL = patchConfig.nestedBonus.nestedLoopGames;

function readyButton(
  setCardsAreOut: (value: boolean) => void,
  drawButton: Sprite
) {
  setCardsAreOut(true);
  drawButton.eventMode = "static";
  drawButton.alpha = 1;
}

// Runs during reveal, so the button is left to the stage's normal post-hand
// cleanup — the result overlay's Continue drives the cash-out from here.
function finishToResult(
  // A nested game always plays a reward video (result shown after it ends);
  // a non-trigger main game has no video, so show the result immediately.
  afterReveal: boolean
) {
  if (afterReveal) {
    queueBonusResultAfterReveal(getNestedTotalPoints());
  } else {
    showBonusResult(getNestedTotalPoints());
  }
  showNestedResultConfirm();
  addBattleLog("Nested Bonus Result Queued.", "success");
}

export function handleNestedBonusDraw({
  setCardsAreOut,
  drawButton,
  resetCardsToGroup,
  drawCardsFromHolder,
  setCurrentBattleResult,
  onBonusFinished,
}: HandleNestedBonusDrawArgs) {
  const state = getNestedBonusState();

  // Cash out via the pick-me collection phase (feature 6).
  if (state.waitingForResultConfirm) {
    const totalPoints = getNestedTotalPoints();

    hideBonusResult();
    hideBonusOverlay();
    clearNestedResultConfirm();
    finishNestedBonus();

    const collectionStarted = totalPoints > 0;
    if (collectionStarted) {
      startCollectionPhase(totalPoints);
    }

    onBonusFinished(collectionStarted);
    addBattleLog("Nested Bonus Finished. Next round ready.", "success");

    setCardsAreOut(false);
    drawButton.eventMode = "static";
    drawButton.alpha = 1;
    return;
  }

  if (!state.active) return;

  incrementGameCount();

  const result = drawBattleResult();
  setCurrentBattleResult(result);

  // Nested-bonus draws count as games but stay free (no cost carry-over).
  recordDrawOutcome(
    result.result,
    { cards: result.cards, targetSlot: result.targetSlot, nestedBonus: true },
    { affectsCost: false }
  );

  // See handleBonusDraw: the draw-press handler returns into here before it
  // reaches the set-to-disk cue, so the nested bonus dealt silently too.
  playSfx("cardSetToDisk");

  resetCardsToGroup();
  drawCardsFromHolder();
  armBonusBackground();

  const hasChance = result.cards.includes("Chance");

  // The outcome is settled here, but nothing visible is applied yet: points,
  // the loop counter, the reward video and the end-of-bonus result all wait
  // for resolveNestedBonusGame() once the three cards have revealed. Otherwise
  // the counter and balance describe a game the player has not been shown.
  setPendingNestedResolution({
    outcome: result.result,
    hasChance,
    inNested: state.inNested,
    points: state.inNested
      ? hasChance
        ? rollNestedChancePoints()
        : patchConfig.nestedBonus.nestedMinPoints
      : 0,
    isTrigger: state.inNested ? false : isNestedTriggerOutcome(result.result),
  });

  readyButton(setCardsAreOut, drawButton);
}

// Dev-only console helpers. A nested bonus is hard to reach organically, so
// `__startNestedBonus()` drops straight into one and `__resolveNested()` applies
// the drawn game by hand when the card flips cannot run (e.g. hidden tab).
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  const dev = window as Window & {
    __startNestedBonus?: () => string;
    __resolveNested?: () => string;
  };

  dev.__startNestedBonus = () => {
    startNestedBonus();
    setBonusGameText(`MAIN ${MAIN_TOTAL}/${MAIN_TOTAL}`);
    return "Nested bonus started — press DRAW to play a bonus game.";
  };

  dev.__resolveNested = () => {
    resolveNestedBonusGame();
    const s = getNestedBonusState();
    return `resolved -> points ${s.totalPoints}, main ${s.mainGamesRemaining}, nested ${s.nestedGamesRemaining}`;
  };
}

/**
 * Applies the drawn nested game now that its cards are face up. Called from the
 * stage's reveal-complete step, immediately before the pending reward video is
 * played, so the payout and the counter land together with the presentation.
 */
export function resolveNestedBonusGame() {
  const pending = takePendingNestedResolution();
  if (!pending) return;

  // ---- Nested-loop game: always pays (min 20; Chance rolls the table) ----
  if (pending.inNested) {
    setPendingBonusRevealVideo(nestedRewardVideo(pending.points));
    addNestedPoints(pending.points);
    addBattleLog(`Nested +${pending.points} points`, "success");
    logEvent({
      kind: "nestedGame",
      detail: {
        points: pending.points,
        chance: pending.hasChance,
        outcome: pending.outcome,
      },
    });

    consumeNestedGame();
    const after = getNestedBonusState();

    if (after.inNested) {
      setBonusGameText(`NESTED ${after.nestedGamesRemaining}/${NESTED_TOTAL}`);
    } else if (after.mainGamesRemaining > 0) {
      setBonusGameText(`MAIN ${after.mainGamesRemaining}/${MAIN_TOTAL}`);
      addBattleLog("Back to main loop.", "chance");
    } else {
      finishToResult(true);
    }

    return;
  }

  // ---- Main-loop game: consumes a main game; a trigger drops into nested ----
  consumeMainGame();
  const after = getNestedBonusState();

  if (pending.isTrigger) {
    enterNestedLoop();
    setBonusGameText(`NESTED ${NESTED_TOTAL}/${NESTED_TOTAL}`);
    addBattleLog(`Trigger! Nested loop ${NESTED_TOTAL}G.`, "success");
    logEvent({ kind: "nestedEnter", detail: { outcome: pending.outcome } });
    return;
  }

  // Non-trigger (e.g. Empty): no points, just consumed a main game.
  addBattleLog("No trigger.", "draw");

  if (after.mainGamesRemaining > 0) {
    setBonusGameText(`MAIN ${after.mainGamesRemaining}/${MAIN_TOTAL}`);
    return;
  }

  finishToResult(true);
}
