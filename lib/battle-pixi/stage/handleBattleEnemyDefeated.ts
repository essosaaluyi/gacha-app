import { addBattleLog } from "@/lib/battle-pixi/state/battleLogStore";
import { clearAttackFakeout } from "@/lib/battle-pixi/state/attackFakeoutStore";
import { startBonusOpening } from "@/lib/battle-pixi/state/bonusModeStore";
import { triggerEnemyDefeatPresentation } from "@/lib/battle-pixi/state/enemyDefeatPresentationStore";
import { setBattlePresentationPhase } from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import { logEvent } from "@/lib/events/gameEventStore";
import type { BonusType } from "@/lib/battle-pixi/core/bonusTypeLottery";
import { getCurrentPlayerBattleCard } from "@/lib/battle-pixi/state/playerBattleCardStore";
import {
  addBonusStock,
  scheduleUr1BoostAfterCollection,
} from "@/lib/battle-pixi/state/barProgressionStore";

// How long the enemy-defeat presentation owns the screen before the player
// gets the controls back.
const DEFEAT_PRESENTATION_MS = 3000;

type HandleBattleEnemyDefeatedArgs = {
  setPendingNextRound: (value: boolean) => void;
  presentation?: "default" | "barChance";
  forcedBonusType?: BonusType | null;
};

/**
 * Enemy defeated on the third flip. The bonus is ARMED here, not played: the
 * opening video belongs to the next game and fires as that game's cards come
 * out of the deck, so the player starts the bonus turn themselves.
 *
 * This used to run behind a 3s timer that then played the opening on top of
 * the defeat beat, on a turn the player had not begun. Arming is immediate
 * instead -- the mode has to be set before the next draw press so that press
 * routes to the bonus handler, and a fast player could previously beat the
 * timer and get an ordinary battle draw.
 */
export function handleBattleEnemyDefeated({
  setPendingNextRound,
  presentation = "default",
  forcedBonusType = null,
}: HandleBattleEnemyDefeatedArgs) {
  clearAttackFakeout();
  addBattleLog("Enemy Defeated!", "success");
  if (presentation === "default") triggerEnemyDefeatPresentation();

  // The only place a defeat is actually confirmed, so it is the only honest
  // place to count one. The end-of-run summary reads these back per battleId
  // rather than inferring a count from the round number, which would over-count
  // any round that ends without a kill.
  logEvent({ kind: "enemyDefeated", detail: {} });

  // The grade (regular / super / super max) is NOT decided here. It needs the
  // opening hand, because drawing a Chance card in it is the bonus chance —
  // so the roll happens at the opening draw, in handleBonusDraw. All this does
  // is put the machine into the classic bonus opening; a super-max roll
  // converts it to the nested loop at that point.
  startBonusOpening(forcedBonusType);

  if (presentation === "barChance") addBonusStock();
  if (getCurrentPlayerBattleCard()?.name === "UR1") {
    scheduleUr1BoostAfterCollection();
  }

  logEvent({ kind: "bonusStart", detail: { mode: "classic" } });
  addBattleLog("Bonus Opening Started!", "chance");

  // The draw stays locked for the defeat beat, then unlocks so the player can
  // start the bonus turn themselves. Previously the bonus opening video set
  // this phase when it auto-played here; now that the video waits for the next
  // deal, the unlock has to happen on its own.
  if (presentation === "default") {
    window.setTimeout(() => {
      setBattlePresentationPhase("next_round_ready", "enemy-defeat-complete");
    }, DEFEAT_PRESENTATION_MS);
  }

  setPendingNextRound(false);
}
