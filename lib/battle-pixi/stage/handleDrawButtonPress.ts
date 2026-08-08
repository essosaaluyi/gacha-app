import { Container, Sprite } from "pixi.js";

import { playPresentation } from "@/lib/battle-pixi/presentation/presentationSystem";
import { fadeAndSlideOut } from "@/lib/battle-pixi/presentation/animations";
import type { BattleCardView } from "@/lib/battle-pixi/presentation/battleCardView";
import { playSfx } from "@/lib/audio/sfxStore";
import { addBattleLog } from "@/lib/battle-pixi/state/battleLogStore";
import { incrementGameCount } from "@/lib/battle-pixi/state/battleGameStore";
import {
  decrementEnemyAttackCounter,
  getEnemyAttackCounter,
} from "@/lib/battle-pixi/state/enemyAttackCounterStore";
import { getAttackFakeoutState } from "@/lib/battle-pixi/state/attackFakeoutStore";
import { isFatalModeActive } from "@/lib/battle-pixi/state/fatalModeStore";
import {
  isEnemyAttackModeActive,
  startEnemyAttackMode,
} from "@/lib/battle-pixi/state/enemyAttackModeStore";
import { hideRoundInsert } from "@/lib/battle-pixi/state/roundInsertStore";
import { startPendingChancePointsReveal } from "@/lib/battle-pixi/state/chancePointsRevealStore";

import {
  getBonusModeState,
  isBonusModeActive,
} from "@/lib/battle-pixi/state/bonusModeStore";
import {
  getNestedBonusState,
  isNestedBonusActive,
} from "@/lib/battle-pixi/state/nestedBonusStore";

import { handleBonusDraw } from "@/lib/battle-pixi/stage/handleBonusDraw";
import { handleNestedBonusDraw } from "@/lib/battle-pixi/stage/handleNestedBonusDraw";
import { drawBattleResult } from "@/lib/battle-pixi/core/resultLottery";
import { getNextDrawCost } from "@/lib/battle-pixi/state/drawCostStore";
import { getWalletState, spendPoints } from "@/lib/wallet/walletStore";
import { getBattleState } from "@/lib/battle-pixi/state/battleStateStore";
import {
  canRequestBattleDraw,
  setBattlePresentationPhase,
} from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import {
  beginDrawSequence,
  endDrawSequence,
  isDrawSequenceActive,
  isDrawSequenceCurrent,
} from "@/lib/battle-pixi/state/drawSequenceGuard";

type HandleDrawButtonPressArgs = {
  cardsAreOut: boolean;
  setCardsAreOut: (value: boolean) => void;

  drawButton: Sprite;
  drawCards: BattleCardView[];
  stage: Container;

  startNewDraw: () => void;
  preparePendingNextRound: () => void;

  resetCardsToGroup: () => void;
  drawCardsFromHolder: () => void;
  setCurrentBattleResult: (result: ReturnType<typeof drawBattleResult>) => void;

  onBonusFinished: (collectionStarted: boolean) => void;
  confirmBonusResult?: boolean;
};



export function handleDrawButtonPress({
  cardsAreOut,
  setCardsAreOut,
  drawButton,
  drawCards,
  stage,
  startNewDraw,
  preparePendingNextRound,

  resetCardsToGroup,
  drawCardsFromHolder,
  setCurrentBattleResult,

  onBonusFinished,
  confirmBonusResult = false,
}: HandleDrawButtonPressArgs) {
  if (cardsAreOut) return;
  // A committed draw is still handing off to its new hand — reject the press
  // rather than let it race the in-flight fade-out.
  if (isDrawSequenceActive()) return;

  const confirmingBonus =
    getBonusModeState().waitingForResultConfirm ||
    getNestedBonusState().waitingForResultConfirm;

  if (confirmingBonus && !confirmBonusResult) return;
  if (!confirmingBonus && !canRequestBattleDraw()) return;

// The run is over. BattleScreen is already handing off to the run report, so a
// draw press here has nothing left to do. "playerDefeated" no longer gets set
// -- it only survives as a state a session saved before the continue mechanic
// was dropped could restore -- but it is treated the same way.
const finishedState = getBattleState();

if (finishedState === "playerDefeated" || finishedState === "gameOver") {
  addBattleLog("Game Over.", "fail");
  return;
}

hideRoundInsert();

if (isBonusModeActive()) {
  setBattlePresentationPhase("draw_reveal", confirmingBonus ? "bonus-confirm" : "bonus-draw");
  handleBonusDraw({
  setCardsAreOut,
  drawButton,
  drawCards,
  stage,
  startNewDraw,
  resetCardsToGroup,
  drawCardsFromHolder,
  setCurrentBattleResult,
  onBonusFinished,
});

  return;
}

if (isNestedBonusActive()) {
  setBattlePresentationPhase("draw_reveal", confirmingBonus ? "bonus-confirm" : "nested-bonus-draw");
  handleNestedBonusDraw({
    setCardsAreOut,
    drawButton,
    drawCards,
    stage,
    startNewDraw,
    resetCardsToGroup,
    drawCardsFromHolder,
    setCurrentBattleResult,
    onBonusFinished,
  });

  return;
}

// v-Next patch: draws cost points (3 normal / 0 after replay / 1 after chance / 0 after bars)
const drawCost = getNextDrawCost();

if (drawCost > 0) {
  if (getWalletState().points < drawCost) {
    addBattleLog(`Not enough points (need ${drawCost}).`, "fail");
    return;
  }

  void spendPoints(drawCost, "battle_draw");
  addBattleLog(`Draw cost: -${drawCost}P`, "normal");
}

setBattlePresentationPhase("draw_reveal", "draw-start");

// A single-Chance points win from an earlier game cashes in here — only on a
// committed normal-battle draw, never during a bonus. The reveal plays over
// the field while this draw continues underneath, so it does not consume the
// press or lock the button; the player keeps drawing and flipping while it runs.
startPendingChancePointsReveal();

// The draw is committed: cards set out to the disk exit. Fire the set/slide
// cues here (earliest committed point) so they lead the sequence, and so both
// manual and auto draws get them.
playSfx("cardSetToDisk");

preparePendingNextRound();

incrementGameCount();

 const fakeoutWasActive = getAttackFakeoutState().active;

if (
  !isFatalModeActive() &&
  !isEnemyAttackModeActive()
) {
  decrementEnemyAttackCounter();

  if (!fakeoutWasActive && getEnemyAttackCounter() <= 0) {
  startEnemyAttackMode();
}
}

  drawButton.eventMode = "none";
  drawButton.alpha = 0.5;

playPresentation("draw_start");

// From here the draw is committed and owns the cards until the new hand is out.
const sequenceToken = beginDrawSequence();
const sequenceIsCurrent = () => isDrawSequenceCurrent(sequenceToken);

const beginPreparedDraw = () => {
  startNewDraw();
  setCardsAreOut(true);
  endDrawSequence();
};

const hasOldRevealedCards = drawCards.some(
  (card) => card.visible && card.parent === stage
);

  if (hasOldRevealedCards) {
    drawCards.forEach((card, index) => {
      setTimeout(() => {
        // A superseded press must not fade sprites the next hand is using.
        if (!sequenceIsCurrent()) return;
        // One quick discard cue per card as it clears off the table.
        playSfx("discard");
        fadeAndSlideOut(card, 1700, card.y, 350);
      }, index * 120);
    });

    setTimeout(() => {
      if (!sequenceIsCurrent()) return;
      beginPreparedDraw();
    }, 750);
  } else {
    beginPreparedDraw();
  }
}
