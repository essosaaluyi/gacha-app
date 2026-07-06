import { Container, Sprite } from "pixi.js";

import { playPresentation } from "@/lib/battle-pixi/presentation/presentationSystem";
import { fadeAndSlideOut } from "@/lib/battle-pixi/presentation/animations";
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

import { isBonusModeActive } from "@/lib/battle-pixi/state/bonusModeStore";

import { handleBonusDraw } from "@/lib/battle-pixi/stage/handleBonusDraw";
import { drawBattleResult } from "@/lib/battle-pixi/core/resultLottery";
import { getNextDrawCost } from "@/lib/battle-pixi/state/drawCostStore";
import { getWalletState, spendPoints } from "@/lib/wallet/walletStore";
import {
  getBattleState,
  setBattleState,
} from "@/lib/battle-pixi/state/battleStateStore";
import { consumeContinue } from "@/lib/battle-pixi/state/continueStore";

type HandleDrawButtonPressArgs = {
  cardsAreOut: boolean;
  setCardsAreOut: (value: boolean) => void;

  drawButton: Sprite;
  drawCards: Sprite[];
  stage: Container;

  startNewDraw: () => void;
  preparePendingNextRound: () => void;

  resetCardsToGroup: () => void;
  drawCardsFromHolder: () => void;
  setCurrentBattleResult: (result: ReturnType<typeof drawBattleResult>) => void;

  onBonusFinished: () => void;
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
}: HandleDrawButtonPressArgs) {
  if (cardsAreOut) return;

if (getBattleState() === "playerDefeated") {
  addBattleLog("Continue required.", "fail");
  return;
}

if (getBattleState() === "gameOver") {
  addBattleLog("Game Over.", "fail");
  return;
}

hideRoundInsert();


if (isBonusModeActive()) {
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

  setCardsAreOut(true);

  drawButton.eventMode = "none";
  drawButton.alpha = 0.5;

  playPresentation("draw_start");

  const hasOldRevealedCards = drawCards.some(
    (card) => card.visible && card.parent === stage
  );

  if (hasOldRevealedCards) {
    drawCards.forEach((card, index) => {
      setTimeout(() => {
        fadeAndSlideOut(card, 1700, card.y, 350);
      }, index * 120);
    });

    setTimeout(() => {
      startNewDraw();
    }, 750);
  } else {
    startNewDraw();
  }
}