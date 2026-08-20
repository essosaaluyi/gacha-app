"use client";

import { useEffect, useRef, useState } from "react";

import { getEvents, subscribeGameEvents } from "@/lib/events/gameEventStore";
import { useBonusOpeningHidden } from "@/lib/battle-pixi/state/useBonusOpeningHidden";

/** How long the full stake sits on the meter before it starts draining, in ms. */
const BET_HOLD_MS = 620;
/** How long the drain to zero takes once it starts, in ms. */
const BET_DRAIN_MS = 520;

/**
 * Wallet reasons this meter answers to.
 *
 * The wallet is shared by the whole app, so a balance change is not by itself a
 * bet or a win: the battle screen tops the player up to a floor on entry, and a
 * daily claim or a gift can land while the cabinet is open. Those move the
 * balance without the hand having paid anything. Reading the reason instead of
 * the delta keeps the meter about this game.
 *
 * A reward path added later needs its reason listed here or it will not show.
 */
const BET_REASONS = new Set(["battle_draw"]);
const PAYOUT_REASONS = new Set(["battle_reward", "chance_points", "collection"]);

/**
 * BET and PAYOUT, bottom right.
 *
 * Both are read from the game event log rather than from the draw and reward
 * call sites. Points are spent in the Pixi stage and awarded from three
 * different stores — the chance reveal, the collection phase, the bonus — some
 * of them asynchronously and long after the hand appears to have finished.
 * Every one of those already writes a `pointsDelta` event with its reason, so
 * watching the log picks them all up without this component knowing any of them
 * exist.
 *
 * BET shows the stake being taken: it lands on the cost, holds long enough to
 * read, then counts down to zero the way a credit meter does. A free draw costs
 * nothing and simply stays at zero — itself worth seeing, since free draws are a
 * real reward in this game.
 *
 * PAYOUT holds the game's winnings until the next draw begins, then clears. It
 * accumulates rather than replaces, because one hand can pay more than once.
 */
export default function BattleBetPayout() {
  const [bet, setBet] = useState(0);
  const [payout, setPayout] = useState<number | null>(null);
  // Stands down for the opening film alongside the rest of the readouts: the
  // cutscene is meant to own the cabinet.
  const hiddenForOpening = useBonusOpeningHidden();

  /** Id of the last event acted on, so a re-notify does not double-count. */
  const cursorRef = useRef<string | null>(null);
  const payoutRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };

    /** Land on the stake, hold it, then count it down to zero. */
    const runBet = (amount: number) => {
      clearTimers();
      setBet(amount);
      if (amount <= 0) return;

      // One tick per point, so the countdown reads as the stake being consumed
      // rather than as an arbitrary animation. A large stake is capped at a
      // sensible number of ticks so the meter never crawls.
      const steps = Math.min(amount, 8);
      for (let step = 1; step <= steps; step++) {
        const at = BET_HOLD_MS + (BET_DRAIN_MS * step) / steps;
        const remaining = Math.max(0, Math.round(amount * (1 - step / steps)));
        timersRef.current.push(
          window.setTimeout(() => setBet(remaining), at)
        );
      }
    };

    const drain = () => {
      const log = getEvents({ kinds: ["pointsDelta"] });

      let start: number;
      if (cursorRef.current === null) {
        // First pass: the log is persisted history, not this game.
        start = log.length;
      } else {
        const index = log.findIndex((event) => event.id === cursorRef.current);
        // Cursor missing means the ring buffer trimmed past it, and everything
        // still in the log is therefore newer than the last event handled.
        start = index >= 0 ? index + 1 : 0;
      }

      for (let i = start; i < log.length; i++) {
        const event = log[i];
        const reason = String(event.detail?.reason ?? "");
        const delta = event.pointsDelta ?? 0;

        if (delta < 0 && BET_REASONS.has(reason)) {
          runBet(-delta);
        } else if (delta > 0 && PAYOUT_REASONS.has(reason)) {
          payoutRef.current += delta;
          setPayout(payoutRef.current);
        }
      }

      if (log.length) cursorRef.current = log[log.length - 1].id;
    };

    // A new draw clears the last game's winnings. The bet is left alone: the
    // spend that follows sets it, and a free draw should read as a zero stake
    // rather than as the previous game's number still sitting there.
    const onDrawRequested = () => {
      payoutRef.current = 0;
      setPayout(null);
      setBet(0);
    };

    drain();
    const unsubscribe = subscribeGameEvents(drain);
    window.addEventListener("battle:request-draw", onDrawRequested);

    return () => {
      clearTimers();
      unsubscribe();
      window.removeEventListener("battle:request-draw", onDrawRequested);
    };
  }, []);

  if (hiddenForOpening) return null;

  return (
    <div className="bcab-stake" aria-hidden="true">
      <div className="bcab-stake-row">
        <span className="bcab-stake-label">BET</span>
        <span className="bcab-stake-value">{bet}</span>
      </div>
      <span className="bcab-stake-divider" />
      <div className={`bcab-stake-row ${payout !== null ? "bcab-stake-win" : ""}`}>
        <span className="bcab-stake-label">PAYOUT</span>
        <span className="bcab-stake-value">{payout ?? 0}</span>
      </div>
    </div>
  );
}
