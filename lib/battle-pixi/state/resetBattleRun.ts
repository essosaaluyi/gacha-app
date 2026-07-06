import { resetBattleState } from "@/lib/battle-pixi/state/battleStateStore";
import { resetBattleLogs } from "@/lib/battle-pixi/state/battleLogStore";
import { setEnemyAttackCounter } from "@/lib/battle-pixi/state/enemyAttackCounterStore";
import { resetCurrentEnemy } from "@/lib/battle-pixi/state/currentEnemyStore";
import { resetRound } from "@/lib/battle-pixi/state/roundStore";
import { hideBattleCutIn } from "@/lib/battle-pixi/state/battleCutInStore";
import { hideBonusOverlay } from "@/lib/battle-pixi/state/bonusPresentationStore";
import { finishBonusMode } from "@/lib/battle-pixi/state/bonusModeStore";
import { resetBattleSessionPoints } from "@/lib/battle-pixi/state/battlePointsStore";
import { hideMagicCircle } from "@/lib/battle-pixi/state/magicCircleStore";
import { clearAttackFakeoutInserts } from "@/lib/battle-pixi/state/attackFakeoutInsertStore";
import { hideChanceIconOverlay } from "@/lib/battle-pixi/state/chanceIconOverlayStore";
import { resetDrawCost } from "@/lib/battle-pixi/state/drawCostStore";
import { startNewBattleSession } from "@/lib/events/gameEventStore";

export function resetBattleRun() {
  resetBattleState();
  resetBattleLogs();
  resetRound();
  resetCurrentEnemy();
  setEnemyAttackCounter(8);
  hideBattleCutIn();
  hideMagicCircle();
  hideChanceIconOverlay();
  clearAttackFakeoutInserts();
  hideBonusOverlay();
  finishBonusMode();
  resetBattleSessionPoints();
  resetDrawCost();
  startNewBattleSession();
}
