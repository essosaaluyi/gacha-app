import { resetBattleState } from "@/lib/battle-pixi/state/battleStateStore";
import { resetBattleLogs } from "@/lib/battle-pixi/state/battleLogStore";
import { resetGameCount } from "@/lib/battle-pixi/state/battleGameStore";
import { setEnemyAttackCounter } from "@/lib/battle-pixi/state/enemyAttackCounterStore";
import { resetCurrentEnemy } from "@/lib/battle-pixi/state/currentEnemyStore";
import { resetRound } from "@/lib/battle-pixi/state/roundStore";
import { hideBattleCutIn } from "@/lib/battle-pixi/state/battleCutInStore";
import { hideBonusOverlay } from "@/lib/battle-pixi/state/bonusPresentationStore";
import { finishBonusMode } from "@/lib/battle-pixi/state/bonusModeStore";
import { finishNestedBonus } from "@/lib/battle-pixi/state/nestedBonusStore";
import { resetBattleSessionPoints } from "@/lib/battle-pixi/state/battlePointsStore";
import { hideMagicCircle } from "@/lib/battle-pixi/state/magicCircleStore";
import { clearAttackFakeoutInserts } from "@/lib/battle-pixi/state/attackFakeoutInsertStore";
import { hideChanceIconOverlay } from "@/lib/battle-pixi/state/chanceIconOverlayStore";
import { resetDrawCost } from "@/lib/battle-pixi/state/drawCostStore";
import { clearResurrection } from "@/lib/battle-pixi/state/resurrectionStore";
import { startNewBattleSession } from "@/lib/events/gameEventStore";

export function resetBattleRun() {
  resetBattleState();
  resetBattleLogs();
  resetGameCount();
  resetRound();
  resetCurrentEnemy();
  setEnemyAttackCounter(8);
  hideBattleCutIn();
  hideMagicCircle();
  hideChanceIconOverlay();
  clearAttackFakeoutInserts();
  hideBonusOverlay();
  finishBonusMode();
  finishNestedBonus();
  resetBattleSessionPoints();
  resetDrawCost();
  clearResurrection();
  startNewBattleSession();
}
