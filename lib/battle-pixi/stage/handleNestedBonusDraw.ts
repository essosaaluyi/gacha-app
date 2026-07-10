import { Container, Sprite } from "pixi.js";

import { addBattleLog } from "@/lib/battle-pixi/state/battleLogStore";
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
  showNestedResultConfirm,
} from "@/lib/battle-pixi/state/nestedBonusStore";
import {
  hideBonusOverlay,
  hideBonusResult,
  queueBonusResultAfterReveal,
  setBonusGameText,
  setPendingBonusRevealVideo,
  showBonusResult,
  showBonusStaticBackground,
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
  drawCards: Sprite[];
  stage: Container;
  startNewDraw: () => void;
  resetCardsToGroup: () => void;
  drawCardsFromHolder: () => void;
  setCurrentBattleResult: (result: ReturnType<typeof drawBattleResult>) => void;
  onBonusFinished: () => void;
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

function finishToResult(
  setCardsAreOut: (value: boolean) => void,
  drawButton: Sprite,
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
  readyButton(setCardsAreOut, drawButton);
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

    if (totalPoints > 0) {
      startCollectionPhase(totalPoints);
    }

    onBonusFinished();
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

  resetCardsToGroup();
  drawCardsFromHolder();
  showBonusStaticBackground();

  const hasChance = result.cards.includes("Chance");

  // ---- Nested-loop game: always pays (min 20; Chance rolls the table) ----
  if (state.inNested) {
    const points = hasChance
      ? rollNestedChancePoints()
      : patchConfig.nestedBonus.nestedMinPoints;

    setPendingBonusRevealVideo(nestedRewardVideo(points));
    addNestedPoints(points);
    addBattleLog(`Nested +${points} points`, "success");
    logEvent({
      kind: "nestedGame",
      detail: { points, chance: hasChance, outcome: result.result },
    });

    consumeNestedGame();
    const after = getNestedBonusState();

    if (after.inNested) {
      setBonusGameText(`NESTED ${after.nestedGamesRemaining}/${NESTED_TOTAL}`);
    } else if (after.mainGamesRemaining > 0) {
      setBonusGameText(`MAIN ${after.mainGamesRemaining}/${MAIN_TOTAL}`);
      addBattleLog("Back to main loop.", "chance");
    } else {
      finishToResult(setCardsAreOut, drawButton, true);
      return;
    }

    readyButton(setCardsAreOut, drawButton);
    return;
  }

  // ---- Main-loop game: consumes a main game; a trigger drops into nested ----
  const isTrigger = isNestedTriggerOutcome(result.result);
  consumeMainGame();
  const after = getNestedBonusState();

  if (isTrigger) {
    enterNestedLoop();
    setBonusGameText(`NESTED ${NESTED_TOTAL}/${NESTED_TOTAL}`);
    addBattleLog(`Trigger! Nested loop ${NESTED_TOTAL}G.`, "success");
    logEvent({ kind: "nestedEnter", detail: { outcome: result.result } });
    readyButton(setCardsAreOut, drawButton);
    return;
  }

  // Non-trigger (e.g. Empty): no points, just consumed a main game.
  addBattleLog("No trigger.", "draw");

  if (after.mainGamesRemaining > 0) {
    setBonusGameText(`MAIN ${after.mainGamesRemaining}/${MAIN_TOTAL}`);
    readyButton(setCardsAreOut, drawButton);
    return;
  }

  finishToResult(setCardsAreOut, drawButton, false);
}
