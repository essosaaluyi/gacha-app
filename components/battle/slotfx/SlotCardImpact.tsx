"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { getBarChanceState } from "@/lib/battle-pixi/state/barChanceStore";
import { drawSpread, planSpread, type Box, type Point, type Spread } from "./lightningSpread";
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
// sends its electricity out over the whole table and past its frame. An
// Attack on the target whose roll was won does the same, most of the time,
// in red and black.
//
// It is drawn on the card's own outline as the table shows it (the stage sends
// the four corners of the landed card), so it lies on the table with the card
// rather than standing in front of it. Decoration only: it reads the landing
// the stage already announces and changes nothing.

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
  chance: { inks: [{ glow: "#ff4fcf", core: "#ffffff" }, { glow: "#a35cff", core: "#ffffff" }], bolts: 9, flip: true },
  blood: { inks: [{ glow: "#ff2414", core: "#ffe0d6" }, { glow: "#e0100a", core: "#070002", dark: true }], bolts: 8, flip: false },
};
/** How often an Attack on its target whose roll was won shows the red and black. */
const BLOOD_ODDS = 0.7;

type Struck = {
  name: SpreadName; plan: Spread; born: number; centre: Point; reach: Point;
  /** This frame's bolts, one path per colour. */
  paths: string[];
  /** This frame's light on the felt, flickering with the bolts. */
  glow: number;
};
type Impact = { key: number; symbol: string; corners: Point[]; arcs: string[]; spread: Struck | null };
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

/** Arcs on the card itself: more while a spread is leaving it. */
const arcCount = (spec: Spec, spread: Struck | null) => (spec.arcs > 0 ? spec.arcs + (spread ? 4 : 0) : 0);

/** One frame of an impact: fresh crackle on the card, and the spread as it stands now. */
function frameOf(impact: Impact, now: number): Impact {
  const spec = IMPACT[impact.symbol];
  const arcs = spec && spec.arcs > 0 ? crackle(grown(impact.corners, 1.05), arcCount(spec, impact.spread)) : impact.arcs;
  if (!impact.spread) return { ...impact, arcs };
  const { paths, level } = drawSpread(impact.spread.plan, now - impact.spread.born, SPREADS[impact.spread.name].inks.length);
  return { ...impact, arcs, spread: { ...impact.spread, paths, glow: level * between(0.55, 1) } };
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
      // From the table's own pixels to the cabinet's, by way of the page.
      const table = mount.getBoundingClientRect();
      const cabinet = place.stage.getBoundingClientRect();
      if (cabinet.width === 0) return;
      const scale = place.stage.offsetWidth / cabinet.width;
      const toCabinet = (x: number, y: number) => ({
        x: (table.left + (x / STAGE_W) * table.width - cabinet.left) * scale,
        y: (table.top + (y / STAGE_H) * table.height - cabinet.top) * scale,
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
        const centre = { x: corners.reduce((s, p) => s + p.x, 0) / 4, y: corners.reduce((s, p) => s + p.y, 0) / 4 };
        const look = SPREADS[name];
        spread = {
          name,
          plan: planSpread(corners, box, look.inks.length, look.bolts),
          born: performance.now(),
          centre,
          // The light it throws on the felt: most of the table, centred on the card.
          reach: { x: (box.right - box.left) * 0.6, y: (box.bottom - box.top) * 0.75 },
          paths: [],
          glow: 0,
        };
      }

      key += 1;
      const impact = frameOf({ key, symbol, corners, arcs: [], spread }, performance.now());
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
          <svg className={css.invert} viewBox={viewBox} aria-hidden="true">
            {impacts.map((impact) => impact.spread && SPREADS[impact.spread.name].flip && (
              <polygon key={impact.key} points={points(impact.corners)} className={css.flip} />
            ))}
          </svg>
          {/* The light: added to the table. */}
          <svg className={css.layer} viewBox={viewBox} aria-hidden="true">
            {impacts.map((impact) => {
              const spec = IMPACT[impact.symbol];
              if (!spec) return null;
              const arcs = impact.arcs.join("");
              const spread = impact.spread;
              const inks = spread ? SPREADS[spread.name].inks : [];
              return (
                <g key={impact.key} className={css.impact} style={{ "--fx": spec.colour } as CSSProperties} data-slow={spec.slow === true}>
                  {spread && (
                    <g className={css.spread}>
                      <defs>
                        <radialGradient id={`slot-spread-${impact.key}`}>
                          <stop offset="0" stopColor={inks[0].glow} stopOpacity="0.55" />
                          <stop offset="0.45" stopColor={inks[0].glow} stopOpacity="0.18" />
                          <stop offset="1" stopColor={inks[0].glow} stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <ellipse
                        cx={spread.centre.x}
                        cy={spread.centre.y}
                        rx={spread.reach.x}
                        ry={spread.reach.y}
                        fill={`url(#slot-spread-${impact.key})`}
                        style={{ opacity: spread.glow }}
                      />
                      {inks.map((ink, index) => spread.paths[index] && (
                        <g key={index} style={{ "--ink": ink.glow, "--core": ink.core } as CSSProperties}>
                          <path d={spread.paths[index]} className={css.boltGlow} />
                          {!ink.dark && <path d={spread.paths[index]} className={css.boltMid} />}
                          {!ink.dark && <path d={spread.paths[index]} className={css.boltCore} />}
                        </g>
                      ))}
                    </g>
                  )}
                  <g className={css.blink}>
                    <polygon points={points(grown(impact.corners, 1.07))} className={css.frameGlow} />
                    <polygon points={points(grown(impact.corners, 1.07))} className={css.frameCore} />
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
          </svg>
          {/* Over the light: the dark bolts, which cannot be added, only laid on. */}
          <svg className={css.ink} viewBox={viewBox} aria-hidden="true">
            {impacts.map((impact) => {
              const spread = impact.spread;
              if (!spread) return null;
              return SPREADS[spread.name].inks.map((ink, index) => ink.dark && spread.paths[index] && (
                <g key={`${impact.key}-${index}`} style={{ "--ink": ink.glow, "--core": ink.core } as CSSProperties}>
                  <path d={spread.paths[index]} className={css.inkRim} />
                  <path d={spread.paths[index]} className={css.inkCore} />
                </g>
              ));
            })}
          </svg>
        </>,
        place.stage,
      )}
    </>
  );
}
