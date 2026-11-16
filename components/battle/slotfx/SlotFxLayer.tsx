"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { getEvents, subscribeGameEvents } from "@/lib/events/gameEventStore";
import {
  getEnemyDefeatPresentationKey,
  subscribeEnemyDefeatPresentation,
} from "@/lib/battle-pixi/state/enemyDefeatPresentationStore";
import SlotGlyphs, { slotGlyphSheets } from "./SlotGlyphs";
import styles from "./SlotFx.module.css";
import {
  SLOT_FX,
  clearSlotTelop,
  getSlotStop,
  getSlotTelop,
  showSlotAward,
  showSlotStop,
  showSlotTelop,
  subscribeSlotFx,
  type SlotStop,
  type SlotTelop,
  type SlotTone,
} from "./slotFxStore";

// PROVISIONAL — see slotFxStore.ts. This component draws the layer and, when
// `live` is set, listens to what the battle already announces.

const STOP_TONES: Record<string, SlotStop["tone"]> = {
  Attack: "fire",
  Chance: "rainbow",
  Coin: "gold",
  Bar: "gold",
  Defense: "ice",
  Reply: "violet",
};

type CardLanded = { symbol?: string; onTarget?: boolean };

/** Wires the layer to the running battle. Presentation only. */
function useBattleSignals(live: boolean) {
  useEffect(() => {
    if (!live || !SLOT_FX.enabled) return;

    // Card stops. The stage already announces each landing.
    let order = 0;
    let meaningful = false;
    let idle = 0;
    const onLanded = (event: Event) => {
      const { symbol = "Empty", onTarget = false } = (event as CustomEvent<CardLanded>).detail ?? {};
      order = order >= 3 ? 1 : order + 1;
      if (order === 1) meaningful = false;
      const tone = STOP_TONES[symbol] ?? "plain";
      const attackHit = symbol === "Attack" && onTarget;
      if (tone !== "plain") meaningful = true;
      showSlotStop({ order, tone, strong: attackHit || symbol === "Chance" || (order === 3 && meaningful) });
      if (SLOT_FX.telops && attackHit) showSlotTelop({ main: "ATTACK!", tone: "fire", size: "small", durationMs: 1200 });
      else if (SLOT_FX.telops && symbol === "Chance") showSlotTelop({ main: "CHANCE!", tone: "rainbow", size: "small", durationMs: 1100 });
      // A hand left unfinished must not make the next hand start at stop 2.
      window.clearTimeout(idle);
      idle = window.setTimeout(() => { order = 0; }, 8000);
    };
    window.addEventListener("battle:vfx-card-landed", onLanded);

    // Points paid. The wallet logs every payment as it is made.
    let seen = getEvents().length;
    const unsubscribeEvents = subscribeGameEvents(() => {
      const events = getEvents();
      // The log is a ring buffer: if it was trimmed, only look at the newest.
      const from = events.length >= seen ? seen : Math.max(0, events.length - 1);
      seen = events.length;
      let paid = 0;
      for (const event of events.slice(from)) {
        if (event.kind === "pointsDelta" && event.detail.reason === "battle_reward" && (event.pointsDelta ?? 0) > 0) {
          paid += event.pointsDelta ?? 0;
        }
      }
      if (paid > 0) showSlotAward(paid);
    });

    let defeatKey = getEnemyDefeatPresentationKey();
    const unsubscribeDefeat = subscribeEnemyDefeatPresentation(() => {
      const next = getEnemyDefeatPresentationKey();
      if (next === defeatKey) return;
      defeatKey = next;
      if (SLOT_FX.telops) showSlotTelop({ main: "ENEMY DOWN!", tone: "rainbow", durationMs: 1700 });
    });

    return () => {
      window.removeEventListener("battle:vfx-card-landed", onLanded);
      window.clearTimeout(idle);
      unsubscribeEvents();
      unsubscribeDefeat();
    };
  }, [live]);
}

/** Numbers run up to their value rather than appearing whole. */
function useCountUp(telop: SlotTelop | null) {
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => {
    if (!telop || telop.countTo === undefined) { setValue(null); return; }
    const target = telop.countTo;
    const startedAt = performance.now();
    const runMs = Math.min(700, 260 + target * 4);
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / runMs);
      setValue(Math.max(1, Math.round(target * (1 - (1 - t) ** 3))));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    setValue(1);
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [telop]);
  return value;
}

export default function SlotFxLayer({ live = true }: { live?: boolean }) {
  const telop = useSyncExternalStore(subscribeSlotFx, getSlotTelop, () => null);
  const stop = useSyncExternalStore(subscribeSlotFx, getSlotStop, () => null);
  const counted = useCountUp(telop);
  useBattleSignals(live);

  useEffect(() => {
    if (!telop) return;
    const timer = window.setTimeout(() => clearSlotTelop(telop.key), telop.durationMs);
    return () => window.clearTimeout(timer);
  }, [telop]);

  // Fetch the lettering sheets ahead of the first telop that needs them.
  useEffect(() => {
    if (!SLOT_FX.enabled) return;
    const timer = window.setTimeout(() => {
      for (const src of slotGlyphSheets()) new Image().src = src;
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  // Dev console: __slotFx.award(120), __slotFx.telop("ATTACK!", "fire"), __slotFx.stop("Attack", 3)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as Window & { __slotFx?: unknown }).__slotFx = {
      award: showSlotAward,
      telop: (main: string, tone: SlotTone = "fire", size: SlotTelop["size"] = "big") => showSlotTelop({ main, tone, size }),
      stop: (symbol = "Attack", order = 3) => showSlotStop({ order, tone: STOP_TONES[symbol] ?? "plain", strong: order === 3 }),
    };
  }, []);

  if (!SLOT_FX.enabled) return null;

  const main = telop && counted !== null ? `+${counted}` : telop?.main ?? "";

  return (
    <div className={styles.layer} aria-hidden="true">
      {stop && (
        <div key={`stop-${stop.key}`} className={styles.stop} data-tone={stop.tone} data-strong={stop.strong}>
          <div className={styles.stopFlash} />
          <div className={styles.stopLine} />
          {stop.strong && <div className={styles.stopRays} />}
        </div>
      )}
      {telop && (
        <div
          key={`telop-${telop.key}`}
          className={styles.telop}
          data-tone={telop.tone}
          data-size={telop.size}
          data-kind={telop.countTo === undefined ? "word" : "number"}
          data-long={telop.countTo === undefined ? telop.main.length > 7 : telop.main.length > 4}
          style={{ "--telop-ms": `${telop.durationMs}ms` } as CSSProperties}
        >
          {telop.size === "big" && <div className={styles.veil} />}
          {telop.size === "big" && <div className={styles.flash} />}
          <div className={styles.burst} />
          <div className={styles.ring} />
          <div className={styles.sway}>
            {telop.size === "small" && <div className={styles.band} />}
            <div className={`${styles.rule} ${styles.ruleTop}`} />
            <div className={`${styles.rule} ${styles.ruleBottom}`} />
            <div className={styles.words}>
              <div className={styles.column}>
                {telop.lead && <SlotGlyphs text={telop.lead} tone="gold" className={styles.lead} shine={false} />}
                <SlotGlyphs text={main} tone={telop.tone} className={styles.main} shine={counted === null || counted === telop.countTo} />
              </div>
              {telop.tail && <SlotGlyphs text={telop.tail} tone="gold" className={styles.tail} shine={false} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
