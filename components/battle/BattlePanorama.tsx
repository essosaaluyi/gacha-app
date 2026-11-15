"use client";

import { useEffect } from "react";

// A slow left-right sway of the battle field, read as a camera drifting on a
// small arc around it.
//
// The field is sheared about a pivot line on the ground: ground nearer than
// the pivot slides one way, the far ground and the horizon the other. Each
// fighter is slid by the amount the ground under its feet moves, so it stays
// planted while the two of them move against each other. The travel is kept
// to a few pixels; more than that reads as the picture wobbling.

/** Largest shear either side of rest. */
const MAX_ANGLE_DEG = 1.6;
/** One full left-right-left sweep. */
const CYCLE_MS = 30000;
/** Height of the pivot line, as a fraction of the screen from the top. */
const PIVOT_Y = 0.8;
/** Where each fighter's feet meet the ground, same units. */
const FEET_Y = { player: 1, enemy: 0.66 } as const;
/** Covers the slivers the shear would open at the left and right edges. */
const COVER_SCALE = 1.03;

const SCREEN = ".battle-cabinet-screen .bcab-screen";

export default function BattlePanorama() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let touched: HTMLElement[] = [];
    const startedAt = performance.now();

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      const screen = document.querySelector<HTMLElement>(SCREEN);
      if (!screen) return;
      const height = screen.clientHeight;
      const angle = Math.sin(((now - startedAt) / CYCLE_MS) * Math.PI * 2) * MAX_ANGLE_DEG;
      const slope = Math.tan((angle * Math.PI) / 180);
      touched = [];

      const field = screen.querySelector<HTMLElement>(".battle-background-layer");
      if (field) {
        field.style.transformOrigin = `50% ${PIVOT_Y * 100}%`;
        field.style.transform = `skewX(${(-angle).toFixed(3)}deg) scale(${COVER_SCALE})`;
        touched.push(field);
      }
      for (const side of ["player", "enemy"] as const) {
        const actor = screen.querySelector<HTMLElement>(`.battle-spawn-actor-${side}`);
        if (!actor) continue;
        // `translate` composes with whatever transform the actor already has.
        actor.style.translate = `${(slope * (FEET_Y[side] - PIVOT_Y) * height).toFixed(2)}px 0`;
        touched.push(actor);
      }
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      for (const element of touched) {
        element.style.removeProperty("translate");
        if (element.classList.contains("battle-background-layer")) {
          element.style.removeProperty("transform");
          element.style.removeProperty("transform-origin");
        }
      }
    };
  }, []);

  return null;
}
