import { Container, Sprite } from "pixi.js";

import { addBattleLog } from "@/lib/battle-pixi/state/battleLogStore";
import { incrementGameCount } from "@/lib/battle-pixi/state/battleGameStore";
import { drawBattleResult } from "@/lib/battle-pixi/core/resultLottery";
import {
  finishBonusMode,
  getBonusModeState,
  
  startBonusGames,
  startBonusOpening,
  consumeBonusGame,
  resetBonusGamesToFive,
} from "@/lib/battle-pixi/state/bonusModeStore";

import {
  showBonusOpening,
  showBonusStaticBackground,
  setPendingBonusRevealVideo,
} from "@/lib/battle-pixi/state/bonusPresentationStore";

import {
  addBonusPoints,
  showBonusResultConfirm,
  clearBonusResultConfirm,
  getBonusTotalPoints,
  
} from "@/lib/battle-pixi/state/bonusModeStore";

import {
  hideBonusResult,
hideBonusOverlay,
queueBonusResultAfterReveal,
setBonusGameText,
} from "@/lib/battle-pixi/state/bonusPresentationStore";
import { bonusRewards } from "@/lib/game-config/generated";
import { recordDrawOutcome } from "@/lib/battle-pixi/state/drawCostStore";
import { startCollectionPhase } from "@/lib/battle-pixi/state/collectionStore";
import { rollBarResetEvent } from "@/lib/battle-pixi/core/barResetLottery";
import { showBarResetTension } from "@/lib/battle-pixi/state/barResetTensionStore";
import { patchConfig } from "@/lib/game-config/patchConfig";
import type { BattleCardSymbol } from "@/lib/battle-pixi/core/resultLottery";


type HandleBonusDrawArgs = {
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

function getBonusReward(result: string, hasBar: boolean) {
  if (hasBar) {
    return {
      points: 0,
      video: "/videos/bonus-reveals/reset.mp4",
    };
  }

  return bonusRewards[result as keyof typeof bonusRewards] ?? bonusRewards.Attack;
}

export function handleBonusDraw({
  setCardsAreOut,
  drawButton,
  resetCardsToGroup,
  drawCardsFromHolder,
  setCurrentBattleResult,
  onBonusFinished,
}: HandleBonusDrawArgs) {
  const bonusState = getBonusModeState();

 if (bonusState.waitingForResultConfirm) {
  const totalPoints = getBonusTotalPoints();

  hideBonusResult();
  hideBonusOverlay();
  clearBonusResultConfirm();
  finishBonusMode();

  // Feature 6: points are collected via the pick-me phase, not credited here.
  if (totalPoints > 0) {
    startCollectionPhase(totalPoints);
  }

  onBonusFinished();
  addBattleLog("Bonus Finished. Collect your points!", "success");

  setCardsAreOut(false);
  drawButton.eventMode = "static";
  drawButton.alpha = 1;

  return;
}

  if (!bonusState.active) return;

  incrementGameCount();

  const result = drawBattleResult();
  setCurrentBattleResult(result);

  // Data counter: bonus draws count as games but stay free (no cost carry-over).
  recordDrawOutcome(
    result.result,
    { cards: result.cards, targetSlot: result.targetSlot, bonus: true },
    { affectsCost: false }
  );

resetCardsToGroup();
drawCardsFromHolder();
  const hasChance = result.cards.includes("Chance");

  addBattleLog("Bonus Draw", "chance");
  addBattleLog(`Bonus Cards: ${result.cards.join(" | ")}`, "chance");
  

  if (bonusState.phase === "opening") {
    setBonusGameText("BONUS OPENING");
    addBattleLog("Bonus Opening", "chance");
     showBonusOpening();
    if (hasChance) {
  addBattleLog("Bonus Opening: Chance! Bonus Games 7G.", "success");
  startBonusGames(7);
  addBattleLog("Bonus Games Started! 7G", "chance");
} else {
  addBattleLog("Bonus Opening: No Chance.", "draw");
  startBonusGames(5);
  addBattleLog("Bonus Games Started! 5G", "chance");
}

    setCardsAreOut(true);
    drawButton.eventMode = "static";
    drawButton.alpha = 1;

    return;
  }

  if (bonusState.phase === "bonus") {
  showBonusStaticBackground();

  const totalBonusGames = bonusState.bonusGamesMax;
const remainingAfterThisDraw = bonusState.bonusGamesRemaining - 1;

if (remainingAfterThisDraw > 0) {
  setBonusGameText(`${remainingAfterThisDraw}/${totalBonusGames}`);

  addBattleLog(
    `Bonus Game ${remainingAfterThisDraw}/${totalBonusGames}`,
    "chance"
  );
} else {
  setBonusGameText("LAST");
  addBattleLog("Bonus Game LAST", "chance");
}
  // Bonus BAR reset mechanic: roll real reset / fake / normal and force the
  // matching card combination so the flip reads correctly.
  const barEvent = rollBarResetEvent();

  if (barEvent === "real") {
    const barCards: BattleCardSymbol[] = ["Bar", "Bar", "Bar"];
    setCurrentBattleResult({
      result: "Bar",
      cards: barCards,
      targetSlot: result.targetSlot,
    });
    showBarResetTension("real");

    setPendingBonusRevealVideo("/videos/bonus-reveals/reset.mp4");
    addBattleLog("BAR! BAR! BAR! Reset Success!", "success");

    consumeBonusGame();
    resetBonusGamesToFive();
    addBattleLog(
      `Bonus games reset to ${patchConfig.barReset.resetGamesTo}G!`,
      "success"
    );
  } else if (barEvent === "fake") {
    // BAR / BAR / EMPTY: the tension builds on the first two flips, then the
    // third breaks the reset and pays the fake amount instead.
    const fakeCards: BattleCardSymbol[] = ["Bar", "Bar", "Empty"];
    setCurrentBattleResult({
      result: "Empty",
      cards: fakeCards,
      targetSlot: result.targetSlot,
    });
    showBarResetTension("fake");

    const fakePoints = patchConfig.barReset.fakePoints;
    setPendingBonusRevealVideo(`/videos/bonus-reveals/${fakePoints}.mp4`);
    addBonusPoints(fakePoints);
    addBattleLog(`BAR FAKE! Only +${fakePoints} points`, "success");

    consumeBonusGame();
  } else {
    // Normal reward: strip any naturally-drawn Bar so it can't masquerade as
    // a reset combination (bars are governed solely by the lottery above).
    const safeCards: BattleCardSymbol[] = result.cards.map((card) =>
      card === "Bar" ? "Coin" : card
    );
    const safeResult = result.result === "Bar" ? "Coin" : result.result;
    setCurrentBattleResult({
      result: safeResult,
      cards: safeCards,
      targetSlot: result.targetSlot,
    });

    const reward = getBonusReward(safeResult, false);
    setPendingBonusRevealVideo(reward.video);
    addBonusPoints(reward.points);
    addBattleLog(`Bonus +${reward.points} points`, "success");

    consumeBonusGame();
  }

  const updatedState = getBonusModeState();

  if (updatedState.bonusGamesRemaining > 0) {
    setCardsAreOut(true);
    drawButton.eventMode = "static";
    drawButton.alpha = 1;

    return;
  }

  queueBonusResultAfterReveal(getBonusTotalPoints());
  showBonusResultConfirm();

  addBattleLog("Bonus Result Queued.", "success");

  setCardsAreOut(true);
  drawButton.eventMode = "static";
  drawButton.alpha = 1;
}
}
