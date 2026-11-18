"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { keepBehindTable, keepClearOfTableCards } from "@/components/battle/tableCards";
import { getBarChanceState, subscribeBarChance } from "@/lib/battle-pixi/state/barChanceStore";
import { isFatalModeActive, subscribeFatalMode } from "@/lib/battle-pixi/state/fatalModeStore";
import { getSlotJudge, subscribeSlotJudge, type SlotJudge } from "./slotJudgeStore";
import { SLOT_FX, getSlotStop, getSlotTelop, subscribeSlotFx, type SlotTelop } from "./slotFxStore";
import css from "./SlotCabinetLights.module.css";

// PROVISIONAL — see slotFxStore.ts.
//
// The cabinet's lamps: a spotlight at each corner of the screen throws a beam
// in the colour of the scene, the colour spills onto the cabinet, and for a
// held breath the whole cabinet goes dim. On a real machine the side lamps and
// the reel lights do this.
//
// It decides nothing and sends nothing. It reads what the layer and the game
// already show (the telop, the card stop, the judge, BAR CHANCE, Fatal Mode)
// and picks one lighting for the moment.
//
// It is mounted from inside the screen (SlotFxLayer) but draws on the cabinet:
// it finds the cabinet stage it stands in and portals itself there, and takes
// the screen's place from the page rather than from numbers of its own. Where
// there is no cabinet (the bench), it draws nothing.

const LAMP = {
  fire: "#ff3a2a",
  red: "#ff3a2a",
  gold: "#ffc53a",
  ice: "#62d4ff",
  blue: "#3f9bff",
  green: "#3fe07c",
  violet: "#b266ff",
  /** Turned through the wheel by the stylesheet. */
  rainbow: "#ff4d6d",
  white: "#ffffff",
  plain: "#cfd8ee",
} as const;

type LampColour = keyof typeof LAMP;
type Place = { stage: HTMLElement; x: number; y: number; w: number; h: number };

/**
 * glow    lit, the beams held still
 * breathe lit, rising and falling, the beams drifting
 * chase   lit, the beams sweeping
 * burst   a few hard flashes, then sweeping fast
 * hush    lamps out, the cabinet dimmed: a held breath
 * dark    lamps out, the cabinet near black
 */
type Pattern = "glow" | "breathe" | "chase" | "burst" | "hush" | "dark";

type Scene = {
  id: string;
  colour: LampColour;
  pattern: Pattern;
  /** How quick the beams sweep: smaller is faster. */
  runMs?: number;
  /** A standing mood rather than a moment: lit at part strength. */
  low?: boolean;
};

/** The frame of the screen stands this far outside the picture. */
const FRAME = 9;
const CORNERS = ["tl", "tr", "bl", "br"] as const;

/** Finds the cabinet a component inside the screen stands in, and the screen's place on it. */
export function useCabinetPlace() {
  const [place, setPlace] = useState<Place | null>(null);
  const anchor = useCallback((node: HTMLSpanElement | null) => {
    const screen = node?.closest<HTMLElement>(".battle-cabinet-screen");
    const stage = screen?.closest<HTMLElement>(".battle-cabinet-stage");
    if (!screen || !stage) return;
    setPlace({ stage, x: screen.offsetLeft, y: screen.offsetTop, w: screen.offsetWidth, h: screen.offsetHeight });
  }, []);
  return { place, anchor };
}

type BarChance = ReturnType<typeof getBarChanceState>;

function sceneOf(judge: SlotJudge, bar: BarChance, telop: SlotTelop | null, fatal: boolean): Scene | null {
  // The judge. Silver and blue only: nothing here may promise a result.
  if (SLOT_FX.judge && judge.phase !== "idle") {
    const id = `judge-${judge.key}-${judge.phase}`;
    if (judge.phase === "intro") return { id, colour: "blue", pattern: "chase", runMs: 520 };
    if (judge.phase === "prompt") return { id, colour: "blue", pattern: "breathe" };
    if (judge.phase === "pulled") return { id, colour: "blue", pattern: "hush" };
    if (judge.phase === "fail") return { id, colour: "blue", pattern: "dark" };
    return { id, colour: "white", pattern: "burst", runMs: 240 };
  }

  // BAR CHANCE. Its tone is the game's own hint, so the lamps wear it.
  if (bar.phase !== "idle" && bar.phase !== "postFreeze") {
    const id = `bar-${bar.token}-${bar.phase}`;
    if (bar.phase === "active") return { id, colour: bar.tone, pattern: "chase", runMs: Math.max(180, 460 - bar.revealedBars * 130) };
    if (bar.phase === "failure" || bar.phase === "freeze") return { id, colour: bar.tone, pattern: "dark" };
    return { id, colour: bar.tone, pattern: "burst", runMs: 200 };
  }

  if (telop) {
    const id = `telop-${telop.key}`;
    return telop.size === "big"
      ? { id, colour: telop.tone, pattern: "burst", runMs: 260 }
      : { id, colour: telop.tone, pattern: "glow" };
  }

  if (fatal) return { id: "fatal", colour: "violet", pattern: "breathe", low: true };
  return null;
}

/** Follows a store that announces its changes. */
function useWatch<T>(subscribe: (listener: () => void) => () => void, read: () => T) {
  const [value, setValue] = useState(read);
  useEffect(() => subscribe(() => setValue(read())), [subscribe, read]);
  return value;
}


export default function SlotCabinetLights() {
  const { place, anchor } = useCabinetPlace();
  const judge = useWatch(subscribeSlotJudge, getSlotJudge);
  const bar = useWatch(subscribeBarChance, getBarChanceState);
  const telop = useWatch(subscribeSlotFx, getSlotTelop);
  const stop = useWatch(subscribeSlotFx, getSlotStop);
  const fatal = useWatch(subscribeFatalMode, isFatalModeActive);

  if (!SLOT_FX.enabled || !SLOT_FX.cabinet) return null;

  const scene = sceneOf(judge, bar, telop, fatal);
  const lit = scene && scene.pattern !== "hush" && scene.pattern !== "dark" ? scene : null;
  const dimmed = scene && !lit ? scene : null;
  // A BAR landing is a stop too: one flash for each.
  const barHit = bar.phase === "active" && bar.revealedBars > 0;

  const frame = place && {
    left: place.x - FRAME,
    top: place.y - FRAME,
    width: place.w + FRAME * 2,
    height: place.h + FRAME * 2,
  };

  return (
    <>
      <span ref={anchor} hidden />
      {place && frame && createPortal(
        <>
          {/* The shade lies over the card table but never over its cards. */}
          <div ref={keepClearOfTableCards} className={css.dimLayer} aria-hidden="true">
            {dimmed && (
              <i
                key={dimmed.id}
                className={css.dim}
                data-pattern={dimmed.pattern}
                style={{
                  "--hole-l": `${frame.left}px`,
                  "--hole-t": `${frame.top}px`,
                  "--hole-r": `${frame.left + frame.width}px`,
                  "--hole-b": `${frame.top + frame.height}px`,
                } as CSSProperties}
              />
            )}
          </div>
          {/* The lamps belong to the screen's frame, and the table stands in
              front of the screen: their light goes behind the table and the
              deck, never over them (owner, 2026-11-18). */}
          <div ref={keepBehindTable} className={css.lampLayer} aria-hidden="true">
            {lit && (
              <div
                key={lit.id}
                className={css.scene}
                data-colour={lit.colour}
                data-pattern={lit.pattern}
                data-low={lit.low ? "true" : "false"}
                style={{ ...frame, "--lamp": LAMP[lit.colour], "--run-ms": `${lit.runMs ?? 420}ms` } as CSSProperties}
              >
                <div className={css.pulse}>
                  <i className={css.ring} />
                  {CORNERS.map((corner) => (
                    <span key={corner} className={css.spot} data-corner={corner}>
                      <i className={css.beam} />
                      <i className={css.lens} />
                    </span>
                  ))}
                </div>
              </div>
            )}
            {stop && !dimmed && (
              <i
                key={`stop-${stop.key}`}
                className={css.blip}
                data-strong={stop.strong}
                style={{ ...frame, "--lamp": LAMP[stop.tone] } as CSSProperties}
              />
            )}
            {barHit && (
              <i
                key={`bar-${bar.token}-${bar.revealedBars}`}
                className={css.blip}
                data-strong="true"
                style={{ ...frame, "--lamp": LAMP.white } as CSSProperties}
              />
            )}
          </div>
        </>,
        place.stage,
      )}
    </>
  );
}
