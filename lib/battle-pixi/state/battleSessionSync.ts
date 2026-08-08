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
import { getCurrentEnemy, restoreEnemy } from "@/lib/battle-pixi/state/currentEnemyStore";
import { getBattleMode, setBattleMode } from "@/lib/battle-pixi/state/battleModeStore";
import {
  finishBonusMode,
  getBonusModeState,
  restoreBonusMode,
} from "@/lib/battle-pixi/state/bonusModeStore";
import {
  getPlayerBattleCardIndex,
  setPlayerBattleCardIndex,
} from "@/lib/battle-pixi/state/playerBattleCardStore";
import { resetDrawCost } from "@/lib/battle-pixi/state/drawCostStore";
import { resetDrawSequenceGuard } from "@/lib/battle-pixi/state/drawSequenceGuard";
import { hideBattleCutIn } from "@/lib/battle-pixi/state/battleCutInStore";
import { hideMagicCircle } from "@/lib/battle-pixi/state/magicCircleStore";
import { hideChanceIconOverlay } from "@/lib/battle-pixi/state/chanceIconOverlayStore";
import { clearAttackFakeoutInserts } from "@/lib/battle-pixi/state/attackFakeoutInsertStore";
import { hideAttackLandReveal } from "@/lib/battle-pixi/state/attackLandRevealStore";
import { hideFakeoutChanceReveal } from "@/lib/battle-pixi/state/fakeoutChanceRevealStore";
import { clearChancePointsReveal } from "@/lib/battle-pixi/state/chancePointsRevealStore";
import { hideBonusOverlay } from "@/lib/battle-pixi/state/bonusPresentationStore";
import { clearResurrection } from "@/lib/battle-pixi/state/resurrectionStore";
import { resetBattlePresentationFlow } from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import { resetBattleLogs } from "@/lib/battle-pixi/state/battleLogStore";

export function buildBattleSnapshot(): BattleSessionSnapshot {
  const enemy = getCurrentEnemy();
  const bonusState = getBonusModeState();

  return {
    savedAt: Date.now(),
    round: getCurrentRound(),
    gameCount: getGameCount(),
    battleState: getBattleState(),
    sessionPoints: getWalletState().sessionEarnedPoints,
    enemyAttackCounter: getEnemyAttackCounter(),
    enemyId: enemy?.id ?? null,
    battleMode: getBattleMode(),
    playerCardIndex: getPlayerBattleCardIndex(),
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
  setPlayerBattleCardIndex(snapshot.playerCardIndex ?? 0);

  if (snapshot.enemyId !== null) {
    restoreEnemy(snapshot.enemyId);
  }

  if (snapshot.bonus) {
    restoreBonusMode(snapshot.bonus);
  } else {
    finishBonusMode();
    setBattleMode(snapshot.battleMode, "session-restore");
  }

  // Always resume as "playing" -- if the player was defeated they'll get the
  // defeat flow again on their next draw result.
  setBattleState("playing");
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

  detachAutoSave = () => {
    window.removeEventListener("beforeunload", save);
    window.removeEventListener("visibilitychange", handleVisibility);
  };
}

export function stopAutoSave() {
  detachAutoSave?.();
  detachAutoSave = null;
}
