"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { getBarChanceState } from "@/lib/battle-pixi/state/barChanceStore";
import { keepClearOfTableCards } from "@/components/battle/tableCards";
import { tableShakeOffset } from "@/components/battle/tableShake";
import { addBolt, drawSpread, noStrokes, planSpread, type Box, type Knot, type Point, type Spread, type Strokes } from "./lightningSpread";
import { useCabinetPlace } from "./SlotCabinetLights";
import { SLOT_FX, landingTier } from "./slotFxStore";
import css from "./SlotCardImpact.module.css";

// PROVISIONAL — see slotFxStore.ts.
//
// What a card does to its slot as it is set down, taken from what a slot
// machine does when a telling symbol stops: the frame of the slot blinks fast,
// and thin electricity crawls round the card in small quick jumps.
//
// The rare ones go further. A Chance on the target, or the second or third
// Chance of a hand, turns the card's colours inside out for an instant and
// sends its electricity out over the table round it. An
// Attack on the target whose roll was won does the same, most of the time,
// in red and black.
//
// It is drawn on the card's own outline as the table shows it (the stage sends
// the four corners of the landed card), so it lies on the table with the card
// rather than standing in front of it. The light and the bolts stop at the edge
// of every card on the table (tableCards.ts): a card is always in front. Only
// the instant of inverted colour is drawn on the card, being the card itself.
// Decoration only: it reads the landing the stage already announces and
// changes nothing.

/** The Pixi stage the table cards are drawn on. */
const STAGE_W = 1200;
const STAGE_H = 500;
/** The table's felt on that stage; a spread runs past it. */
const TABLE: Box = { left: 60, top: 110, right: 1140, bottom: 350 };
/** The electricity is redrawn this often: it must jump, not flow smoothly. */
const JUMP_MS = 46;

type Spec = { colour: string; arcs: number; ms: number; slow?: boolean };

/** How the slot's frame answers each card, loudest first. A card not here (Empty) shows nothing. */
const IMPACT: Record<string, Spec> = {
  AttackHit: { colour: "#ff4a2a", arcs: 7, ms: 950 },
  Chance: { colour: "#ff6fd0", arcs: 8, ms: 1000 },
  Bar: { colour: "#ffd24a", arcs: 5, ms: 820 },
  Attack: { colour: "#ff4a2a", arcs: 3, ms: 620 },
  Defense: { colour: "#4fb8ff", arcs: 0, ms: 420 },
  Coin: { colour: "#ffc23a", arcs: 0, ms: 1000, slow: true },
  Reply: { colour: "#b77bff", arcs: 0, ms: 1000, slow: true },
};

/** A colour of a spread. A dark one is drawn over the table rather than added to its light. */
type Ink = { glow: string; core: string; dark?: boolean };
type SpreadName = "chance" | "blood";
const SPREADS: Record<SpreadName, { inks: Ink[]; bolts: number; flip: boolean }> = {
  chance: { inks: [{ glow: "#ff2fbf", core: "#ffffff" }, { glow: "#8a3cff", core: "#ffffff" }], bolts: 6, flip: true },
  blood: { inks: [{ glow: "#ff1a0a", core: "#fff2ec" }, { glow: "#e0100a", core: "#070002", dark: true }], bolts: 5, flip: false },
};
/** How often an Attack on its target whose roll was won shows the red and black. */
const BLOOD_ODDS = 0.7;

type Struck = {
  name: SpreadName; plan: Spread; born: number;
  /** This frame's bolts, one drawing per colour. */
  strokes: Strokes[];
};
type Impact = { key: number; symbol: string; corners: Point[]; arcs: Strokes; spread: Struck | null };
type Landed = { symbol?: string; onTarget?: boolean; quad?: number[]; chanceCount?: number; attackWon?: boolean };

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

/** One showing of the electricity on the card: short jagged runs along the outline, some with a spur. */
function crackle(corners: Point[], count: number): Strokes {
  const strokes = noStrokes();
  const lengths = corners.map((p, index) => {
    const next = corners[(index + 1) % corners.length];
    return Math.hypot(next.x - p.x, next.y - p.y);
  });
  const total = lengths.reduce((sum, value) => sum + value, 0);
  if (total === 0) return strokes;
  // The outline may run either way round; find which side of it is outside.
  const cx = corners.reduce((sum, p) => sum + p.x, 0) / corners.length;
  const cy = corners.reduce((sum, p) => sum + p.y, 0) / corners.length;
  const probe = onOutline(corners, lengths, total, 0.01);
  const out = (probe.x - cx) * probe.nx + (probe.y - cy) * probe.ny >= 0 ? 1 : -1;
  // Sized to the card, so it stays in proportion wherever the table is drawn.
  const unit = total / 100;
  const width = unit * 0.42;

  for (let arc = 0; arc < count; arc += 1) {
    const start = Math.random();
    const run = between(0.07, 0.2);
    const steps = Math.max(4, Math.round((run * total) / (unit * 2.2)));
    const line: Knot[] = [];
    for (let step = 0; step <= steps; step += 1) {
      const p = onOutline(corners, lengths, total, start + (run * step) / steps);
      const off = out * between(-unit * 0.6, unit * 2.4);
      line.push({ x: p.x + p.nx * off, y: p.y + p.ny * off, w: between(0.45, 1.4) });
    }
    addBolt(strokes, line, width, { hairs: Math.random() < 0.5 ? 1 : 0 });
    // Now and then a spur snaps outward from the run, thinning as it goes.
    if (Math.random() < 0.45) {
      const p = onOutline(corners, lengths, total, start + run * Math.random());
      const spur: Knot[] = [{ x: p.x, y: p.y, w: 1 }];
      for (let step = 1; step <= 3; step += 1) {
        const last = spur[step - 1];
        spur.push({
          x: last.x + out * p.nx * between(unit * 1.2, unit * 3) + between(-unit * 1.6, unit * 1.6),
          y: last.y + out * p.ny * between(unit * 1.2, unit * 3) + between(-unit * 1.6, unit * 1.6),
          w: 1 - step * 0.22,
        });
      }
      addBolt(strokes, spur, width * 0.75, { rooted: true });
    }
  }
  return strokes;
}

/** Arcs on the card itself: more while a spread is leaving it. */
const arcCount = (spec: Spec, spread: Struck | null) => (spec.arcs > 0 ? spec.arcs + (spread ? 4 : 0) : 0);

/** One frame of an impact: fresh crackle on the card, and the spread as it stands now. */
function frameOf(impact: Impact, now: number): Impact {
  const spec = IMPACT[impact.symbol];
  const arcs = spec && spec.arcs > 0 ? crackle(grown(impact.corners, 1.05), arcCount(spec, impact.spread)) : impact.arcs;
  if (!impact.spread) return { ...impact, arcs };
  const { strokes } = drawSpread(impact.spread.plan, now - impact.spread.born, SPREADS[impact.spread.name].inks.length);
  return { ...impact, arcs, spread: { ...impact.spread, strokes } };
}

/** A drawing of electricity, over the table: its band of colour, the paler band, the white core, the filaments. */
function Bolts({ strokes, ink, core }: { strokes?: Strokes; ink: string; core: string }) {
  if (!strokes?.core) return null;
  return (
    <g style={{ "--ink": ink, "--core": core } as CSSProperties}>
      <path d={strokes.edge} className={css.edge} />
      {strokes.hair && <path d={strokes.hair} className={css.hairEdge} />}
      <path d={strokes.inner} className={css.inner} />
      <path d={strokes.core} className={css.core} />
      {strokes.hair && <path d={strokes.hair} className={css.hairCore} />}
    </g>
  );
}

export default function SlotCardImpact() {
  const { place, anchor } = useCabinetPlace();
  const [impacts, setImpacts] = useState<Impact[]>([]);

  useEffect(() => {
    if (!place || !SLOT_FX.enabled || !SLOT_FX.cardImpact) return;
    let key = 0;
    const timers = new Set<number>();
    const onLanded = (event: Event) => {
      const { symbol: card = "Empty", onTarget = false, quad, chanceCount = 0, attackWon = false } = (event as CustomEvent<Landed>).detail ?? {};
      if (landingTier(card, onTarget, getBarChanceState().phase === "active") === "none") return;
      // An Attack that lands on its target is worth more than one that misses.
      const symbol = card === "Attack" && onTarget ? "AttackHit" : card;
      const spec = IMPACT[symbol];
      const mount = document.querySelector<HTMLElement>(".bcab-pixi-mount");
      if (!spec || !quad || quad.length < 8 || !mount) return;
      // From the table's own pixels to the cabinet's, by way of the page. A
      // table caught mid-jolt is measured where it stands at rest: these
      // layers ride the same jolt (data-table-fx), so it would count twice.
      const table = mount.getBoundingClientRect();
      const cabinet = place.stage.getBoundingClientRect();
      if (cabinet.width === 0) return;
      const scale = place.stage.offsetWidth / cabinet.width;
      const jolt = tableShakeOffset();
      const toCabinet = (x: number, y: number) => ({
        x: (table.left + (x / STAGE_W) * table.width - cabinet.left) * scale - jolt.x,
        y: (table.top + (y / STAGE_H) * table.height - cabinet.top) * scale - jolt.y,
      });
      const corners = [0, 2, 4, 6].map((index) => toCabinet(quad[index], quad[index + 1]));

      const name: SpreadName | null =
        card === "Chance" && (onTarget || chanceCount >= 2) ? "chance"
          : symbol === "AttackHit" && attackWon && Math.random() < BLOOD_ODDS ? "blood"
            : null;
      let spread: Struck | null = null;
      if (name) {
        const topLeft = toCabinet(TABLE.left, TABLE.top);
        const bottomRight = toCabinet(TABLE.right, TABLE.bottom);
        const box = { left: topLeft.x, top: topLeft.y, right: bottomRight.x, bottom: bottomRight.y };
        const look = SPREADS[name];
        // No wash of light over the felt (owner, 2026-11-17: it clouded the
        // table): the bolts and the narrow light round them only.
        spread = {
          name,
          plan: planSpread(corners, box, look.inks.length, look.bolts),
          born: performance.now(),
          strokes: [],
        };
      }

      key += 1;
      const impact = frameOf({ key, symbol, corners, arcs: noStrokes(), spread }, performance.now());
      setImpacts((list) => [...list, impact]);
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setImpacts((list) => list.filter((item) => item.key !== impact.key));
      }, Math.max(spec.ms, spread ? spread.plan.ms : 0));
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
      const now = performance.now();
      setImpacts((list) => list.map((impact) => frameOf(impact, now)));
    }, JUMP_MS);
    return () => window.clearInterval(timer);
  }, [live]);

  if (!SLOT_FX.enabled || !SLOT_FX.cardImpact) return null;

  const viewBox = place ? `0 0 ${place.stage.offsetWidth} ${place.stage.offsetHeight}` : "";
  const points = (list: Point[]) => list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <>
      <span ref={anchor} hidden />
      {place && createPortal(
        <>
          {/* Under the light: the card's colours turned inside out for an instant. */}
          <svg className={css.invert} viewBox={viewBox} aria-hidden="true" data-table-fx="">
            {impacts.map((impact) => impact.spread && SPREADS[impact.spread.name].flip && (
              <polygon key={impact.key} points={points(impact.corners)} className={css.flip} />
            ))}
          </svg>
          {/* The light: added to the table, round the cards but never over one. */}
          <svg ref={keepClearOfTableCards} className={css.layer} viewBox={viewBox} aria-hidden="true" data-table-fx="">
            {impacts.map((impact) => {
              const spec = IMPACT[impact.symbol];
              if (!spec) return null;
              const spread = impact.spread;
              const inks = spread ? SPREADS[spread.name].inks : [];
              return (
                <g key={impact.key} className={css.impact} style={{ "--fx": spec.colour } as CSSProperties} data-slow={spec.slow === true}>
                  {spread && (
                    <g className={css.spread}>
                      {inks.map((ink, index) => spread.strokes[index]?.halo && (
                        <path key={index} d={spread.strokes[index].halo} className={css.halo} style={{ "--ink": ink.glow } as CSSProperties} />
                      ))}
                    </g>
                  )}
                  <g className={css.blink}>
                    <polygon points={points(grown(impact.corners, 1.07))} className={css.frameGlow} />
                    <polygon points={points(grown(impact.corners, 1.07))} className={css.frameCore} />
                  </g>
                  {impact.arcs.halo && <path d={impact.arcs.halo} className={css.halo} style={{ "--ink": spec.colour } as CSSProperties} />}
                </g>
              );
            })}
          </svg>
          {/* Over the light, laid on rather than added, so the colour stays deep: the bolts themselves. */}
          <svg ref={keepClearOfTableCards} className={css.bolts} viewBox={viewBox} aria-hidden="true" data-table-fx="">
            {impacts.map((impact) => {
              const spec = IMPACT[impact.symbol];
              if (!spec) return null;
              const spread = impact.spread;
              return (
                <g key={impact.key}>
                  {spread && SPREADS[spread.name].inks.map((ink, index) => (
                    <Bolts key={index} strokes={spread.strokes[index]} ink={ink.glow} core={ink.core} />
                  ))}
                  <Bolts strokes={impact.arcs} ink={spec.colour} core="#ffffff" />
                </g>
              );
            })}
          </svg>
        </>,
        place.stage,
      )}
    </>
  );
}
