import { Container, Sprite } from "pixi.js";

import { addBattleLog } from "@/lib/battle-pixi/state/battleLogStore";
import { playSfx } from "@/lib/audio/sfxStore";
import type { BattleCardView } from "@/lib/battle-pixi/presentation/battleCardView";
import { incrementGameCount } from "@/lib/battle-pixi/state/battleGameStore";
import {
  createBarChanceResult,
  drawBattleResult,
  type BattleCardSymbol,
} from "@/lib/battle-pixi/core/resultLottery";
import {
  finishBonusMode,
  getBonusModeState,
  consumeForcedBonusOpeningType,

  startBonusGames,
  consumeBonusGame,
  resetBonusGamesToEntryCount,
} from "@/lib/battle-pixi/state/bonusModeStore";
import {
  bonusGamesForType,
  rollBonusType,
} from "@/lib/battle-pixi/core/bonusTypeLottery";
import { startNestedBonus } from "@/lib/battle-pixi/state/nestedBonusStore";
import { armBonusOpening } from "@/lib/battle-pixi/state/bonusPresentationStore";
import { logEvent } from "@/lib/events/gameEventStore";

import {
  armBonusBackground,
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
import { patchConfig } from "@/lib/game-config/patchConfig";
import {
  beginCabinetDrawSignals,
  notifyBonusOpeningStarted,
} from "@/lib/battle-pixi/state/cabinetSignalStore";
import { terminateActiveBarBoost } from "@/lib/battle-pixi/state/barProgressionStore";


type HandleBonusDrawArgs = {
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
  const collectionStarted = totalPoints > 0;
  if (collectionStarted) {
    startCollectionPhase(totalPoints);
  }

  onBonusFinished(collectionStarted);
  addBattleLog("Bonus Finished. Collect your points!", "success");

  setCardsAreOut(false);
  drawButton.eventMode = "static";
  drawButton.alpha = 1;

  return;
}

  if (!bonusState.active) return;

  incrementGameCount();

  const result = drawBattleResult({ barChance: "none" });
  setCurrentBattleResult(result);

  // Data counter: bonus draws count as games but stay free (no cost carry-over).
  recordDrawOutcome(
    result.result,
    { cards: result.cards, targetSlot: result.targetSlot, bonus: true },
    { affectsCost: false }
  );

  // Cards set out to the disk exit. handleDrawButtonPress fires this cue for a
  // normal battle draw, but it returns into this handler BEFORE reaching it, so
  // the bonus was dealing in silence. The cue belongs to the deal, so it lives
  // with the deal -- and it is after the result-confirm branch above, which
  // sets no cards out and must stay silent.
  playSfx("cardSetToDisk");

  resetCardsToGroup();
  drawCardsFromHolder();

  const hasChance = result.cards.includes("Chance");

  addBattleLog("Bonus Draw", "chance");
  addBattleLog(`Bonus Cards: ${result.cards.join(" | ")}`, "chance");
  

  if (bonusState.phase === "opening") {
    terminateActiveBarBoost();
    beginCabinetDrawSignals({
      cards: result.cards,
      result: result.result,
      barChance: false,
    });
    notifyBonusOpeningStarted();
    setBonusGameText("BONUS OPENING");
    addBattleLog("Bonus Opening", "chance");

    // The bonus grade is rolled HERE, not at the defeat, because the opening
    // hand is part of the input: a Chance card in it is the bonus chance and
    // takes the regular bonus off the table. The roll is settled before the
    // opening video plays (that happens on the release click), so the video
    // and the bonus always agree.
    const bonusType = consumeForcedBonusOpeningType() ?? rollBonusType(hasChance);

    if (hasChance) {
      addBattleLog("Bonus Opening: CHANCE! Guaranteed super.", "success");
    }

    if (bonusType === "superMax") {
      // Super max is the nested loop. The classic bonus that was armed at the
      // defeat is stood down and the nested one takes over.
      finishBonusMode();
      startNestedBonus();
      setBonusGameText(
        `MAIN ${patchConfig.nestedBonus.mainLoopGames}/${patchConfig.nestedBonus.mainLoopGames}`
      );
      logEvent({ kind: "bonusStart", detail: { mode: "nested" } });
      addBattleLog("SUPER BONUS MAX! Nested loop.", "chance");
    } else {
      const games = bonusGamesForType(bonusType);
      startBonusGames(games);
      addBattleLog(`Bonus Games Started! ${games}G`, "chance");
    }

    // Arms the matching opening video for the deal. A super-max grade still
    // opens on a regular/super clip -- the freeze cuts into it and promotes it.
    armBonusOpening(bonusType);

    setCardsAreOut(true);
    drawButton.eventMode = "static";
    drawButton.alpha = 1;

    return;
  }

  if (bonusState.phase === "bonus") {
  armBonusBackground();

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
    const barResult = createBarChanceResult("success", "bonus", result.targetSlot);
    setCurrentBattleResult(barResult);
    beginCabinetDrawSignals({
      cards: barResult.cards,
      result: barResult.result,
      barChance: true,
    });

    setPendingBonusRevealVideo("/videos/bonus-reveals/reset.mp4");
    addBattleLog("BAR! BAR! BAR! Reset Success!", "success");

    // Restores the bonus to its entry length -- 7G resets to 7/7, 5G to 5/5.
    resetBonusGamesToEntryCount();
    // The counter was written above for a normal game; a reset overrides it
    // with the restored full count so the meter agrees with the state.
    setBonusGameText(`${bonusState.bonusGamesMax}/${bonusState.bonusGamesMax}`);
    addBattleLog(`Bonus games reset to ${bonusState.bonusGamesMax}G!`, "success");
  } else if (barEvent === "fake") {
    // BAR / BAR / EMPTY: the tension builds on the first two flips, then the
    // third breaks the reset and pays the fake amount instead.
    const barResult = createBarChanceResult("fake", "bonus", result.targetSlot);
    setCurrentBattleResult(barResult);
    beginCabinetDrawSignals({
      cards: barResult.cards,
      result: barResult.result,
      barChance: true,
    });

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
    beginCabinetDrawSignals({
      cards: safeCards,
      result: safeResult,
      barChance: false,
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
