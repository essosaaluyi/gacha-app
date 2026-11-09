import { resetBattleState } from "@/lib/battle-pixi/state/battleStateStore";
import { resetBattleLogs } from "@/lib/battle-pixi/state/battleLogStore";
import { resetGameCount } from "@/lib/battle-pixi/state/battleGameStore";
import { setEnemyAttackCounter } from "@/lib/battle-pixi/state/enemyAttackCounterStore";
import { resetCurrentEnemy, selectEnemyForRound } from "@/lib/battle-pixi/state/currentEnemyStore";
import { initializePlayerBattleCards } from "@/lib/battle-pixi/state/playerBattleCardStore";
import { resetRound } from "@/lib/battle-pixi/state/roundStore";
import { resetBattleMode } from "@/lib/battle-pixi/state/battleModeStore";
import { resetDrawSequenceGuard } from "@/lib/battle-pixi/state/drawSequenceGuard";
import { hideBattleCutIn } from "@/lib/battle-pixi/state/battleCutInStore";
import { hideBonusOverlay } from "@/lib/battle-pixi/state/bonusPresentationStore";
import { finishBonusMode } from "@/lib/battle-pixi/state/bonusModeStore";
import { finishNestedBonus } from "@/lib/battle-pixi/state/nestedBonusStore";
import { resetBattleSessionPoints } from "@/lib/battle-pixi/state/battlePointsStore";
import { hideMagicCircle } from "@/lib/battle-pixi/state/magicCircleStore";
import { clearAttackFakeoutInserts } from "@/lib/battle-pixi/state/attackFakeoutInsertStore";
import { hideAttackLandReveal } from "@/lib/battle-pixi/state/attackLandRevealStore";
import { hideFakeoutChanceReveal } from "@/lib/battle-pixi/state/fakeoutChanceRevealStore";
import { clearBattleSession } from "@/lib/battle-pixi/state/battleSessionStore";
import { clearChancePointsReveal } from "@/lib/battle-pixi/state/chancePointsRevealStore";
import { hideChanceIconOverlay } from "@/lib/battle-pixi/state/chanceIconOverlayStore";
import { resetDrawCost } from "@/lib/battle-pixi/state/drawCostStore";
import { clearResurrection } from "@/lib/battle-pixi/state/resurrectionStore";
import { startNewBattleSession } from "@/lib/events/gameEventStore";
import { resetBattlePresentationFlow } from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import { ensureMinimumPoints } from "@/lib/wallet/walletStore";
import { patchConfig } from "@/lib/game-config/patchConfig";
import { clearBarChance } from "@/lib/battle-pixi/state/barChanceStore";
import { clearCabinetSignals } from "@/lib/battle-pixi/state/cabinetSignalStore";
import { resetBarProgression } from "@/lib/battle-pixi/state/barProgressionStore";
import { clearDefenseShield } from "@/lib/battle-pixi/state/defenseShieldStore";
import { resetEnemyAttackMode } from "@/lib/battle-pixi/state/enemyAttackModeStore";
import { resetPlayerWinRate } from "@/lib/battle-pixi/state/playerWinRateStore";
import { clearFatalPresentation } from "./fatalPresentationStore";
import { restorePlayerFatal } from "./fatalModeStore";
import { clearPendingBattleHand } from "./pendingBattleHandStore";

export function resetBattleRun(options: { preview?: boolean } = {}) {
  clearPendingBattleHand();
  clearFatalPresentation();
  restorePlayerFatal();
  resetBattlePresentationFlow();
  resetBattleState();
  resetBattleLogs();

  // Must precede the round/game resets: it zeroes the event log's battle
  // context, and those resets are what publish the real starting values back
  // into it. The other order leaves every event stamped round 0.
  clearBattleSession();
  startNewBattleSession();

  resetGameCount();
  resetRound();
  resetPlayerWinRate();
  resetCurrentEnemy();
  initializePlayerBattleCards();
  const enemy = selectEnemyForRound(1);
  setEnemyAttackCounter(enemy.attackCounter);
  hideBattleCutIn();
  hideMagicCircle();
  hideChanceIconOverlay();
  clearAttackFakeoutInserts();
  hideAttackLandReveal();
  hideFakeoutChanceReveal();
  clearChancePointsReveal();
  hideBonusOverlay();
  finishBonusMode();
  finishNestedBonus();
  resetBattleSessionPoints();
  resetDrawCost();
  clearResurrection();
  clearBarChance();
  clearCabinetSignals();
  resetBarProgression();
  clearDefenseShield();
  resetEnemyAttackMode();
  resetBattleMode();
  resetDrawSequenceGuard();

  // Bankruptcy floor, not a per-battle payout: tops the player back up to the
  // starting stake only when they are below it, so nobody is ever stranded at
  // 0 points with no way to draw. Re-entering the battle screen on a healthy
  // balance grants nothing.
  if (!options.preview) void ensureMinimumPoints(patchConfig.battleStart.minimumPoints, "battle_start_floor");
}
