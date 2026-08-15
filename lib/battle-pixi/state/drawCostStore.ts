// Tracks the previous draw's outcome to price the next draw
// (feature 7: game start 3 pts, replay 0, chance 1, bars 0).
// Also the single place where every normal draw is recorded to the event log.

import { patchConfig } from "@/lib/game-config/patchConfig";
import { logEvent } from "@/lib/events/gameEventStore";
import type { BattleOutcome } from "@/lib/battle-pixi/core/resultLottery";

let lastOutcome: BattleOutcome | null = null;

const listeners: ((outcome: BattleOutcome) => void)[] = [];

export function getNextDrawCost(): number {
  const costs = patchConfig.economy.drawCosts;

  if (lastOutcome === "Reply") return costs.afterReply;
  if (lastOutcome === "Bar") return costs.afterBar;
  if (
    lastOutcome === "SingleChance" ||
    lastOutcome === "DoubleChance" ||
    lastOutcome === "TripleChance"
  ) {
    return costs.afterChance;
  }

  return costs.normal;
}

export function recordDrawOutcome(
  outcome: BattleOutcome,
  detail?: Record<string, unknown>,
  options?: { affectsCost?: boolean }
) {
  if (options?.affectsCost === false) {
    // Bonus-mode draws are free and must not discount the next normal draw.
    lastOutcome = null;
  } else {
    lastOutcome = outcome;
  }

  logEvent({
    kind: "draw",
    detail: { outcome, ...detail },
  });

  listeners.forEach((listener) => listener(outcome));
}

export function getLastDrawOutcome() {
  return lastOutcome;
}

export function resetDrawCost() {
  lastOutcome = null;
}

/** Fires after every recorded draw outcome (used by the collection phase's flip economy). */
export function subscribeDrawOutcome(listener: (outcome: BattleOutcome) => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
