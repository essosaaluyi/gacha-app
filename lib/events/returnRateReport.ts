// Return-to-player report over several window sizes.
//
// A game can be balanced over 1600 draws and still feel punishing over 100, so
// a single lifetime average hides the problem. Real slot machines are certified
// across short, medium and long windows for exactly this reason; this measures
// the same way against the existing event log.

import { getEvents } from "@/lib/events/gameEventStore";

/** Point spends that count as paying to play the battle. */
const SPEND_REASONS = new Set(["battle_draw"]);

/** Point gains that come out of the battle economy. */
const RETURN_REASONS = new Set([
  "battle_reward",
  "collection",
  "collection_autocredit",
  "chance_points",
]);

// Deliberately excluded: daily_claim, welcome_gift, gift_milestone, gift_ad,
// card_sell, shop_redeem. Those are giveaways, not battle winnings — counting
// them would flatter the rate and hide a harsh draw economy.

export const RETURN_RATE_WINDOWS = [100, 400, 1600] as const;

export type ReturnRateWindow = {
  /** Draws requested for this window. */
  window: number;
  /** Draws actually available (less than `window` early on). */
  draws: number;
  spent: number;
  returned: number;
  /** Percentage of spent points handed back, or null with no data. */
  returnPct: number | null;
  /** True once there are enough draws for the figure to mean anything. */
  complete: boolean;
};

function reasonOf(detail: Record<string, unknown>) {
  return typeof detail.reason === "string" ? detail.reason : "";
}

/**
 * Walks the log backwards until `window` draws have been seen, summing battle
 * spend and battle winnings over exactly that slice.
 */
function measure(window: number): ReturnRateWindow {
  const events = getEvents({ kinds: ["pointsDelta"] });

  let draws = 0;
  let spent = 0;
  let returned = 0;

  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    const delta = event.pointsDelta ?? 0;
    const reason = reasonOf(event.detail);

    if (SPEND_REASONS.has(reason)) {
      if (draws >= window) break;
      draws += 1;
      spent += Math.abs(delta);
      continue;
    }

    // Winnings only count once a draw has been seen, so credits that landed
    // after the window's newest draw are not attributed to it.
    if (draws > 0 && RETURN_REASONS.has(reason)) {
      returned += Math.abs(delta);
    }
  }

  return {
    window,
    draws,
    spent,
    returned,
    returnPct: spent > 0 ? (100 * returned) / spent : null,
    complete: draws >= window,
  };
}

export function getReturnRateReport(): ReturnRateWindow[] {
  return RETURN_RATE_WINDOWS.map((window) => measure(window));
}
