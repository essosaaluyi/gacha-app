"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useCabinetPlace } from "./SlotCabinetLights";
import { SLOT_FX } from "./slotFxStore";
import css from "./SlotCardImpact.module.css";

// PROVISIONAL — see slotFxStore.ts.
//
// What a card does to its slot as it is set down, taken from what a slot
// machine does when a telling symbol stops: the frame of the slot blinks fast,
// and thin electricity crawls round the card in small quick jumps.
//
// It is drawn on the card's own outline as the table shows it (the stage sends
// the four corners of the landed card), so it lies on the table with the card
// rather than standing in front of it. Decoration only: it reads the landing
// the stage already announces and changes nothing.

/** The Pixi stage the table cards are drawn on. */
const STAGE_W = 1200;
const STAGE_H = 500;
/** The electricity is redrawn this often: it must jump, not flow. */
const JUMP_MS = 46;

type Point = { x: number; y: number };

/** Colour, how many arcs crawl at once, how long, and whether the frame blinks
 *  fast or swells once, slowly. Loudest first, after landingTier in
 *  slotFxStore.ts. A symbol not listed (Empty) shows nothing. */
const IMPACT: Record<string, { colour: string; arcs: number; ms: number; slow?: boolean }> = {
  AttackHit: { colour: "#ff4a2a", arcs: 7, ms: 950 },
  Chance: { colour: "#ff6fd0", arcs: 8, ms: 1000 },
  Bar: { colour: "#ffd24a", arcs: 5, ms: 820 },
  Attack: { colour: "#ff4a2a", arcs: 3, ms: 620 },
  Defense: { colour: "#4fb8ff", arcs: 0, ms: 420 },
  Coin: { colour: "#ffc23a", arcs: 0, ms: 1000, slow: true },
  Reply: { colour: "#b77bff", arcs: 0, ms: 1000, slow: true },
};

type Impact = { key: number; symbol: string; corners: Point[]; arcs: string[] };
type Landed = { symbol?: string; onTarget?: boolean; quad?: number[] };

const between = (low: number, high: number) => low + Math.random() * (high - low);

/** The outline pushed out from the card's middle, so the light stands on the slot's frame. */
function grown(corners: Point[], by: number): Point[] {
  const cx = corners.reduce((sum, p) => sum + p.x, 0) / corners.length;
  const cy = corners.reduce((sum, p) => sum + p.y, 0) / corners.length;
  return corners.map((p) => ({ x: cx + (p.x - cx) * by, y: cy + (p.y - cy) * by }));
}

/** A point a given way round the outline, with the direction that leads away from the card. */
function onOutline(corners: Point[], lengths: number[], total: number, at: number) {
  let left = (((at % 1) + 1) % 1) * total;
  let edge = 0;
  while (left > lengths[edge] && edge < corners.length - 1) { left -= lengths[edge]; edge += 1; }
  const a = corners[edge];
  const b = corners[(edge + 1) % corners.length];
  const t = lengths[edge] === 0 ? 0 : left / lengths[edge];
  const dx = (b.x - a.x) / (lengths[edge] || 1);
  const dy = (b.y - a.y) / (lengths[edge] || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, nx: dy, ny: -dx };
}

/** One showing of the electricity: short jagged runs along the outline, some with a spur. */
function crackle(corners: Point[], count: number): string[] {
  const lengths = corners.map((p, index) => {
    const next = corners[(index + 1) % corners.length];
    return Math.hypot(next.x - p.x, next.y - p.y);
  });
  const total = lengths.reduce((sum, value) => sum + value, 0);
  if (total === 0) return [];
  // The outline may run either way round; find which side of it is outside.
  const cx = corners.reduce((sum, p) => sum + p.x, 0) / corners.length;
  const cy = corners.reduce((sum, p) => sum + p.y, 0) / corners.length;
  const probe = onOutline(corners, lengths, total, 0.01);
  const out = (probe.x - cx) * probe.nx + (probe.y - cy) * probe.ny >= 0 ? 1 : -1;
  // Sized to the card, so it stays in proportion wherever the table is drawn.
  const unit = total / 100;

  const paths: string[] = [];
  for (let arc = 0; arc < count; arc += 1) {
    const start = Math.random();
    const run = between(0.07, 0.2);
    const steps = Math.max(4, Math.round((run * total) / (unit * 2.2)));
    let d = "";
    for (let step = 0; step <= steps; step += 1) {
      const p = onOutline(corners, lengths, total, start + (run * step) / steps);
      const off = out * between(-unit * 0.6, unit * 2.4);
      d += `${step === 0 ? "M" : "L"}${(p.x + p.nx * off).toFixed(1)} ${(p.y + p.ny * off).toFixed(1)}`;
    }
    paths.push(d);
    // Now and then a spur snaps outward from the run.
    if (Math.random() < 0.45) {
      const p = onOutline(corners, lengths, total, start + run * Math.random());
      let x = p.x;
      let y = p.y;
      let spur = `M${x.toFixed(1)} ${y.toFixed(1)}`;
      for (let step = 0; step < 3; step += 1) {
        x += out * p.nx * between(unit * 1.2, unit * 3) + between(-unit * 1.6, unit * 1.6);
        y += out * p.ny * between(unit * 1.2, unit * 3) + between(-unit * 1.6, unit * 1.6);
        spur += `L${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      paths.push(spur);
    }
  }
  return paths;
}

export default function SlotCardImpact() {
  const { place, anchor } = useCabinetPlace();
  const [impacts, setImpacts] = useState<Impact[]>([]);

  useEffect(() => {
    if (!place || !SLOT_FX.enabled || !SLOT_FX.cardImpact) return;
    let key = 0;
    const timers = new Set<number>();
    const onLanded = (event: Event) => {
      const { symbol: card = "Empty", onTarget = false, quad } = (event as CustomEvent<Landed>).detail ?? {};
      // An Attack that lands on its target is worth more than one that misses.
      const symbol = card === "Attack" && onTarget ? "AttackHit" : card;
      const mount = document.querySelector<HTMLElement>(".bcab-pixi-mount");
      if (!quad || quad.length < 8 || !mount) return;
      // From the table's own pixels to the cabinet's, by way of the page.
      const table = mount.getBoundingClientRect();
      const cabinet = place.stage.getBoundingClientRect();
      if (cabinet.width === 0) return;
      const scale = place.stage.offsetWidth / cabinet.width;
      const corners = [0, 2, 4, 6].map((index) => ({
        x: (table.left + (quad[index] / STAGE_W) * table.width - cabinet.left) * scale,
        y: (table.top + (quad[index + 1] / STAGE_H) * table.height - cabinet.top) * scale,
      }));
      const spec = IMPACT[symbol];
      if (!spec) return;
      key += 1;
      const impact: Impact = { key, symbol, corners, arcs: crackle(grown(corners, 1.05), spec.arcs) };
      setImpacts((list) => [...list, impact]);
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setImpacts((list) => list.filter((item) => item.key !== impact.key));
      }, spec.ms);
      timers.add(timer);
    };
    window.addEventListener("battle:vfx-card-landed", onLanded);
    return () => {
      window.removeEventListener("battle:vfx-card-landed", onLanded);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [place]);

  // While anything is showing, the electricity is thrown afresh every few frames.
  const live = impacts.length > 0;
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => {
      setImpacts((list) => list.map((impact) => {
        const spec = IMPACT[impact.symbol];
        return spec && spec.arcs > 0 ? { ...impact, arcs: crackle(grown(impact.corners, 1.05), spec.arcs) } : impact;
      }));
    }, JUMP_MS);
    return () => window.clearInterval(timer);
  }, [live]);

  if (!SLOT_FX.enabled || !SLOT_FX.cardImpact) return null;

  return (
    <>
      <span ref={anchor} hidden />
      {place && createPortal(
        <svg
          className={css.layer}
          viewBox={`0 0 ${place.stage.offsetWidth} ${place.stage.offsetHeight}`}
          aria-hidden="true"
        >
          {impacts.map((impact) => {
            const spec = IMPACT[impact.symbol];
            if (!spec) return null;
            const frame = grown(impact.corners, 1.07).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            const arcs = impact.arcs.join("");
            return (
              <g key={impact.key} className={css.impact} style={{ "--fx": spec.colour } as CSSProperties} data-slow={spec.slow === true}>
                <g className={css.blink}>
                  <polygon points={frame} className={css.frameGlow} />
                  <polygon points={frame} className={css.frameCore} />
                </g>
                {arcs && (
                  <>
                    <path d={arcs} className={css.arcGlow} />
                    <path d={arcs} className={css.arcCore} />
                  </>
                )}
              </g>
            );
          })}
        </svg>,
        place.stage,
      )}
    </>
  );
}
