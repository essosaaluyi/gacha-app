import {getBonusPresentationSnapshot,restoreBonusPresentationSnapshot} from "./bonusPresentationStore";
import {getNestedBonusSnapshot,restoreNestedBonusSnapshot} from "./nestedBonusStore";
import {getClassicBonusSnapshot,restoreClassicBonusSnapshot} from "./bonusModeStore";
import {getAttackFakeoutState,restoreAttackFakeout} from "./attackFakeoutStore";
import {getLastDrawOutcome,restoreDrawOutcome} from "./drawCostStore";
// Battle session snapshot building/restoring, and the auto-save wiring.
//
// Split out from battleSessionStore.ts so that pages which only need to know
// *whether* a save exists don't pull the entire battle engine into their
// bundle. Only the battle screen imports this module.

import {
  type BattleSessionSnapshot,
  saveBattleSession,
} from "@/lib/battle-pixi/state/battleSessionStore";

import { getBattleState, setBattleState } from "@/lib/battle-pixi/state/battleStateStore";
import { getCurrentRound, setRound } from "@/lib/battle-pixi/state/roundStore";
import { getGameCount, setGameCount } from "@/lib/battle-pixi/state/battleGameStore";
import { getWalletState } from "@/lib/wallet/walletStore";
import { setBattleSessionPoints } from "@/lib/battle-pixi/state/battlePointsStore";
import {
  getEnemyAttackCounter,
  setEnemyAttackCounter,
} from "@/lib/battle-pixi/state/enemyAttackCounterStore";
import {
  getCurrentEnemy,
  restoreEnemy,
  resetCurrentEnemy,
  getBattleEnemyProgressionSnapshot,
  restoreBattleEnemyProgression,
} from "@/lib/battle-pixi/state/currentEnemyStore";
import { getBattleMode, setBattleMode } from "@/lib/battle-pixi/state/battleModeStore";
import {
  finishBonusMode,
  getBonusModeState,
  restoreBonusMode,
} from "@/lib/battle-pixi/state/bonusModeStore";
import {
  getPlayerBattleCardIndex,
  initializePlayerBattleCards,
  getPlayerBattleHandSnapshot,
  restorePlayerBattleHand,
  getCurrentPlayerBattleCard,
  getRemainingPlayerBattleCards,
  subscribePlayerBattleCard,
} from "@/lib/battle-pixi/state/playerBattleCardStore";
import { resetDrawCost } from "@/lib/battle-pixi/state/drawCostStore";
import { resetDrawSequenceGuard } from "@/lib/battle-pixi/state/drawSequenceGuard";
import { hideBattleCutIn } from "@/lib/battle-pixi/state/battleCutInStore";
import { hideMagicCircle } from "@/lib/battle-pixi/state/magicCircleStore";
import { hideChanceIconOverlay } from "@/lib/battle-pixi/state/chanceIconOverlayStore";
import { clearAttackFakeoutInserts } from "@/lib/battle-pixi/state/attackFakeoutInsertStore";
import { hideAttackLandReveal } from "@/lib/battle-pixi/state/attackLandRevealStore";
import { hideFakeoutChanceReveal } from "@/lib/battle-pixi/state/fakeoutChanceRevealStore";
import { clearChancePointsReveal, getChancePointsRevealState, restoreChancePointsReveal,
  subscribeChancePointsReveal } from "@/lib/battle-pixi/state/chancePointsRevealStore";
import { hideBonusOverlay } from "@/lib/battle-pixi/state/bonusPresentationStore";
import { clearResurrection } from "@/lib/battle-pixi/state/resurrectionStore";
import { resetBattlePresentationFlow, restoreBattleSummons } from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import { resetBattleLogs } from "@/lib/battle-pixi/state/battleLogStore";
import {
  getBarProgressionState,
  restoreBarProgression,
} from "@/lib/battle-pixi/state/barProgressionStore";
import { clearCabinetSignals } from "@/lib/battle-pixi/state/cabinetSignalStore";
import { getEnemyFatalSnapshot, restoreEnemyFatal, startEnemyAttackMode,
  consumeEnemyAttackModeTurn, holdEnemyFatalShieldResolution } from "./enemyAttackModeStore";
import { getPendingBattleHand, restorePendingBattleHand } from "./pendingBattleHandStore";
import { getPlayerFatalSnapshot, restorePlayerFatal } from "./fatalModeStore";
import { getFatalPresentation, restoreFatalPresentation } from "./fatalPresentationStore";
import {
  getDefenseShieldState,
  restoreDefenseShield,
} from "@/lib/battle-pixi/state/defenseShieldStore";
import {
  getPlayerWinRateSnapshot,
  restorePlayerWinRate,
} from "@/lib/battle-pixi/state/playerWinRateStore";

export function buildBattleSnapshot(): BattleSessionSnapshot {
  const enemy = getCurrentEnemy();
  const bonusState = getBonusModeState();
  const defenseShield = getDefenseShieldState();

  return {
    savedAt: Date.now(),
    round: getCurrentRound(),
    gameCount: getGameCount(),
    battleState: getBattleState(),
    sessionPoints: getWalletState().sessionEarnedPoints,
    enemyAttackCounter: getEnemyAttackCounter(),
    enemyFatal: getEnemyFatalSnapshot(),
    playerFatal: getPlayerFatalSnapshot(),
    fatalPlan: getFatalPresentation().plan,
    pendingHand: getPendingBattleHand(),
    chancePoints: structuredClone(getChancePointsRevealState()),
    bonusPresentation:getBonusPresentationSnapshot(),nestedBonus:getNestedBonusSnapshot(),classicBonus:getClassicBonusSnapshot(),
    attackFakeout:structuredClone(getAttackFakeoutState()),lastOutcome:getLastDrawOutcome(),
    enemyId: enemy?.id ?? null,
    enemyProgression: getBattleEnemyProgressionSnapshot(),
    battleMode: getBattleMode(),
    playerCardIndex: getPlayerBattleCardIndex(),
    playerHand: getPlayerBattleHandSnapshot(),
    playerWinRate: getPlayerWinRateSnapshot(),
    barProgression: { ...getBarProgressionState() },
    defenseShield:
      defenseShield.grade && defenseShield.round !== null
        ? { grade: defenseShield.grade, round: defenseShield.round }
        : null,
    bonus: bonusState.active
      ? {
          active: true,
          phase: bonusState.phase,
          bonusGamesRemaining: bonusState.bonusGamesRemaining,
          bonusGamesMax: bonusState.bonusGamesMax,
          bonusTotalPoints: bonusState.bonusTotalPoints,
        }
      : null,
  };
}

export function restoreBattleFromSnapshot(snapshot: BattleSessionSnapshot) {
  // Clear all presentation state (overlays, animations) so nothing is stale.
  resetBattlePresentationFlow();
  clearCabinetSignals();
  resetBattleLogs();
  hideBattleCutIn();
  hideMagicCircle();
  hideChanceIconOverlay();
  clearAttackFakeoutInserts();
  hideAttackLandReveal();
  hideFakeoutChanceReveal();
  clearChancePointsReveal();
  hideBonusOverlay();
  clearResurrection();
  resetDrawCost();
  resetDrawSequenceGuard();

  // Restore progression state.
  setRound(snapshot.round);
  setGameCount(snapshot.gameCount);
  setBattleSessionPoints(snapshot.sessionPoints);
  setEnemyAttackCounter(snapshot.enemyAttackCounter);

  // Older snapshots predate deck-index persistence; default to the deck start.
  initializePlayerBattleCards();
  restorePlayerBattleHand(snapshot.playerHand, snapshot.playerCardIndex ?? 0);
  restorePlayerWinRate(snapshot.playerWinRate);
  restoreBarProgression(snapshot.barProgression);
  restoreDefenseShield(snapshot.defenseShield);

  resetCurrentEnemy();
  restoreBattleEnemyProgression(snapshot.enemyProgression);
  if (snapshot.enemyId !== null) {
    restoreEnemy(snapshot.enemyId);
  }
  if (snapshot.playerHand?.pendingDefeat) {
    const enemy = getCurrentEnemy();
    if (enemy) setEnemyAttackCounter(enemy.attackCounter);
  }
  const restoredEnemy = getCurrentEnemy();
  const hand = snapshot.pendingHand;
  restorePendingBattleHand(!snapshot.playerHand?.pendingDefeat && hand &&
    hand.enemyKey === `${snapshot.round}:${restoredEnemy?.id}` && hand.playerIndex === getPlayerBattleCardIndex() ? hand : null);
  restoreEnemyFatal(snapshot.playerHand?.pendingDefeat ? undefined : snapshot.enemyFatal);
  restorePlayerFatal(snapshot.playerHand?.pendingDefeat ? undefined : snapshot.playerFatal);
  let pendingFatal = snapshot.fatalPlan;
  const sameFatalActors = !snapshot.playerHand?.pendingDefeat && pendingFatal &&
    pendingFatal.enemyKey === `${snapshot.round}:${restoredEnemy?.id}` &&
    pendingFatal.playerIndex === getPlayerBattleCardIndex();
  if (sameFatalActors && pendingFatal?.enemy?.attack && !pendingFatal.enemy.kind) {
    // A paid attack from the superseded immediate-death version becomes the
    // committed first window game, never another trigger/shield lottery.
    startEnemyAttackMode();
    const first = consumeEnemyAttackModeTurn();
    holdEnemyFatalShieldResolution(pendingFatal.enemy.shield);
    pendingFatal = { ...pendingFatal, enemy: { ...pendingFatal.enemy,
      kind: first?.finished ? "resolution" : "entry", entered: true, survived: pendingFatal.enemy.shield?.survived ?? false } };
  }
  restoreFatalPresentation(sameFatalActors ? pendingFatal : null);
  if (restoredEnemy) {
    restoreBattleSummons(`${snapshot.round}:${restoredEnemy.id}`, getPlayerBattleCardIndex());
  }

  if (snapshot.bonus) {
    restoreBonusMode(snapshot.bonus);
  } else {
    finishBonusMode();
    setBattleMode(snapshot.battleMode, "session-restore");
  }

  restoreBonusPresentationSnapshot(snapshot.bonusPresentation);
  restoreNestedBonusSnapshot(snapshot.nestedBonus);
  restoreClassicBonusSnapshot(snapshot.classicBonus);
  restoreAttackFakeout(snapshot.attackFakeout);
  restoreDrawOutcome(snapshot.lastOutcome??null);
  restoreChancePointsReveal(snapshot.chancePoints);

  // An exhausted hand cannot wait forever for a summon that is impossible.
  setBattleState(!getCurrentPlayerBattleCard() && getRemainingPlayerBattleCards() === 0 ? "gameOver" : "playing");
}

// -- Auto-save wiring -------------------------------------------------------

let detachAutoSave: (() => void) | null = null;

export function startAutoSave() {
  if (detachAutoSave || typeof window === "undefined") return;

  const save = () => {
    if (getBattleState() === "gameOver") return;
    saveBattleSession(buildBattleSnapshot());
  };

  const handleVisibility = () => {
    if (document.visibilityState === "hidden") save();
  };

  window.addEventListener("beforeunload", save);
  window.addEventListener("visibilitychange", handleVisibility);
  const detachHandSave = subscribePlayerBattleCard(save);
  const detachChanceSave = subscribeChancePointsReveal(save);
  save();

  detachAutoSave = () => {
    window.removeEventListener("beforeunload", save);
    window.removeEventListener("visibilitychange", handleVisibility);
    detachHandSave();
    detachChanceSave();
  };
}

export function stopAutoSave() {
  detachAutoSave?.();
  detachAutoSave = null;
}
