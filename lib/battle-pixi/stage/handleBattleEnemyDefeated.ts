import { addBattleLog } from "@/lib/battle-pixi/state/battleLogStore";
import { clearAttackFakeout } from "@/lib/battle-pixi/state/attackFakeoutStore";
import { startBonusOpening } from "@/lib/battle-pixi/state/bonusModeStore";
import { startNestedBonus } from "@/lib/battle-pixi/state/nestedBonusStore";
import { rollNestedBonusSelected } from "@/lib/battle-pixi/core/nestedBonusLottery";
import { showBonusOpening, setBonusGameText } from "@/lib/battle-pixi/state/bonusPresentationStore";
import { triggerEnemyDefeatPresentation } from "@/lib/battle-pixi/state/enemyDefeatPresentationStore";
import { logEvent } from "@/lib/events/gameEventStore";
import { patchConfig } from "@/lib/game-config/patchConfig";


type HandleBattleEnemyDefeatedArgs = {
  setPendingNextRound: (value: boolean) => void;
  setShowRoundInsertOnNextDraw: (value: boolean) => void;
};

export function handleBattleEnemyDefeated({
  setPendingNextRound,
  setShowRoundInsertOnNextDraw,
}: HandleBattleEnemyDefeatedArgs) {
  clearAttackFakeout();
  addBattleLog("Enemy Defeated!", "success");
  triggerEnemyDefeatPresentation();

  // Feature 4: roll for the nested loop bonus vs the classic one.
  if (rollNestedBonusSelected()) {
    startNestedBonus();
    showBonusOpening();
    setBonusGameText(`MAIN ${patchConfig.nestedBonus.mainLoopGames}/${patchConfig.nestedBonus.mainLoopGames}`);

    // Data counter: a bonus start is a "BB" on the slump dashboard.
    logEvent({ kind: "bonusStart", detail: { mode: "nested" } });

    addBattleLog("NESTED BONUS Started!", "chance");
  } else {
    startBonusOpening();

    // Data counter: a bonus start is a "BB" on the slump dashboard.
    logEvent({ kind: "bonusStart", detail: { mode: "classic" } });

    addBattleLog("Bonus Opening Started!", "chance");
  }

  setPendingNextRound(false);
  setShowRoundInsertOnNextDraw(false);
}
