// Circuit traces for the combination flash.
//
// The table is presented as a board that has just electrically detected the
// cards, so the flash is current running through it: thin lines escape the
// bottom edge of each card and snake outward in right-angle steps, the way a
// track runs across a printed board.
//
// Everything here is pure and works in the table's NORMALISED space:
//   u = 0 at the table's left edge, 1 at its right edge
//   v = 0 at the far edge, 1 at the near edge (toward the player)
// The caller maps those through the table's perspective quad, which is what
// keeps the traces lying flat on the tilted surface instead of on the screen.

import { patchConfig } from "@/lib/game-config/patchConfig";

export type ReelTracePoint = { u: number; v: number };

/** Which side of the card a trace leaves from, and therefore heads toward. */
export type ReelTraceEdge = "top" | "bottom" | "left" | "right";

export type ReelTraceSeed = ReelTracePoint & { edge: ReelTraceEdge };

/** A card's footprint on the table, in normalised table space. */
export type ReelCardFootprint = {
  leftU: number;
  rightU: number;
  topV: number;
  bottomV: number;
};

export type ReelTrace = {
  /** Right-angle polyline, starting at the card's bottom edge. */
  points: ReelTracePoint[];
  color: number;
  widthPx: number;
  /** 0..1 of the burst to wait before this trace starts drawing. */
  delay: number;
  /** 0..1 of the burst this trace takes to draw itself fully. */
  duration: number;
};

/**
 * Trace palette. Cool circuit colours with a couple of warm sparks, so the
 * burst reads as data rather than as fire.
 */
const TRACE_COLORS = [
  0x7ff0ff, // cyan
  0xa8ffe8, // pale aqua
  0xffffff, // white core
  0x9fd0ff, // ice blue
  0xff9fe8, // magenta spark
  0xffd48a, // amber spark
  0xb9ff9f, // lime spark
];

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min);

const randomIntBetween = (min: number, max: number) =>
  Math.floor(randomBetween(min, max + 1));

/**
 * Builds one right-angle path walking away from `origin`.
 *
 * The walk alternates between running across the table and running toward the
 * player, which is what produces the stepped, board-like look. Movement toward
 * the player is one-way — a trace never doubles back up the table, so the
 * whole burst reads as current draining off the front edge.
 */
// The table's own edges. A trace that crosses one would be drawn off the
// surface and float in the cabinet, so runs REFLECT off these instead — which
// also reads correctly, as a track turning back along the edge of a board.
const TRACE_U_MIN = 0.015;
const TRACE_U_MAX = 0.985;
// Traces may run just past the near edge, where the glass clips them — that is
// the "escaping off the front of the table" read. There is no such escape at
// the far edge: past the top of the felt a trace is drawn on the cabinet
// itself, so that limit is config-driven and reflects instead.
const TRACE_V_MAX = 1.04;

const traceMinV = () => patchConfig.reelMechanics.flash.trace.minV;

/**
 * Builds one right-angle path walking away from `origin`.
 *
 * The first move always heads OUT of the card, in the direction of the edge
 * the trace left from, so the burst genuinely escapes on all four sides rather
 * than draining one way. After that the walk alternates between running across
 * the table and running up or down it, which produces the stepped, board-like
 * look. Both axes reflect off the table edges so nothing leaves the surface.
 */
function buildTracePath(seed: ReelTraceSeed): ReelTracePoint[] {
  const config = patchConfig.reelMechanics.flash.trace;
  const minV = traceMinV();
  const points: ReelTracePoint[] = [{ u: seed.u, v: seed.v }];

  let { u } = seed;
  // A card bay can sit above the trace field's far limit, so clamp the seed
  // itself: a top-edge trace must start on the felt, not above it.
  let v = Math.max(minV, seed.v);
  points[0].v = v;

  // Leaving via a side means the first run is across; leaving via the top or
  // bottom means the first run is up or down.
  const goingAcrossFirst = seed.edge === "left" || seed.edge === "right";
  let goingAcross = goingAcrossFirst;

  let acrossDirection =
    seed.edge === "left" ? -1
    : seed.edge === "right" ? 1
    // Top/bottom traces have no committed sideways bias, so they spread out
    // from the card's centre line instead of all leaning the same way.
    : u < 0.5 ? -1 : 1;

  let towardDirection =
    seed.edge === "top" ? -1
    : seed.edge === "bottom" ? 1
    : Math.random() < 0.5 ? -1 : 1;

  const segments = randomIntBetween(config.segments[0], config.segments[1]);

  for (let index = 0; index < segments; index += 1) {
    // The opening run has to clear the card in the direction it left from. A
    // card sitting near a table edge may not have room for a full step, so the
    // first move CLAMPS to the edge rather than reflecting off it — reflecting
    // would send the trace straight back across its own card.
    const isFirstMove = index === 0;

    if (goingAcross) {
      u += acrossDirection * randomBetween(
        config.stepAcross[0],
        config.stepAcross[1]
      );

      if (isFirstMove) {
        u = Math.min(TRACE_U_MAX, Math.max(TRACE_U_MIN, u));
      } else if (u < TRACE_U_MIN) {
        u = TRACE_U_MIN + (TRACE_U_MIN - u);
        acrossDirection = 1;
      } else if (u > TRACE_U_MAX) {
        u = TRACE_U_MAX - (u - TRACE_U_MAX);
        acrossDirection = -1;
      } else if (Math.random() < 0.25) {
        // An occasional reversal keeps the paths from looking combed.
        acrossDirection *= -1;
      }

      // A step wider than the table itself could reflect straight past the
      // opposite edge, so pin it inside as a backstop.
      u = Math.min(TRACE_U_MAX, Math.max(TRACE_U_MIN, u));
    } else {
      v += towardDirection * randomBetween(
        config.stepToward[0],
        config.stepToward[1]
      );

      if (isFirstMove) {
        v = Math.min(TRACE_V_MAX, Math.max(minV, v));
      } else if (v < minV) {
        // Reflect off the far edge: there is no off-screen up there to escape
        // into, so the track turns and runs back down the board.
        v = minV + (minV - v);
        towardDirection = 1;
      } else if (Math.random() < 0.2) {
        towardDirection *= -1;
      }

      v = Math.min(TRACE_V_MAX, Math.max(minV, v));
    }

    points.push({ u, v });
    goingAcross = !goingAcross;

    // Once a trace has run off the near edge there is nothing left to draw.
    if (v >= TRACE_V_MAX) break;
  }

  return points;
}

/** One trace per seed point. */
export function generateReelTraces(
  seeds: readonly ReelTraceSeed[]
): ReelTrace[] {
  const config = patchConfig.reelMechanics.flash.trace;

  return seeds.map((seed) => ({
    points: buildTracePath(seed),
    color: TRACE_COLORS[Math.floor(Math.random() * TRACE_COLORS.length)],
    widthPx: randomBetween(config.widthPx[0], config.widthPx[1]),
    // Staggered starts, all finishing well before the burst ends so the table
    // is never left with a half-drawn trace hanging on it.
    delay: Math.random() * 0.34,
    duration: randomBetween(0.4, 0.62),
  }));
}

/**
 * How the traces are shared out around a card. The bottom edge carries the
 * most because that is the side facing the player and reads best, but every
 * side gets its own so the card looks detected from all around rather than
 * draining downward.
 */
const EDGE_WEIGHTS: readonly { edge: ReelTraceEdge; weight: number }[] = [
  { edge: "bottom", weight: 3 },
  { edge: "top", weight: 2 },
  { edge: "left", weight: 2 },
  { edge: "right", weight: 2 },
];

const EDGE_WEIGHT_TOTAL = EDGE_WEIGHTS.reduce((sum, e) => sum + e.weight, 0);

/**
 * Emission points spread around a card's perimeter — where the traces escape
 * from under that card. One point per trace, allocated across all four edges.
 */
export function seedPointsAroundCard(
  footprint: ReelCardFootprint,
  count: number
): ReelTraceSeed[] {
  const { leftU, rightU, topV, bottomV } = footprint;
  const seeds: ReelTraceSeed[] = [];

  EDGE_WEIGHTS.forEach(({ edge, weight }, edgeIndex) => {
    // Give the last edge whatever is left, so the seed count is exact for any
    // `perCard` rather than drifting with rounding.
    const share =
      edgeIndex === EDGE_WEIGHTS.length - 1
        ? count - seeds.length
        : Math.round((count * weight) / EDGE_WEIGHT_TOTAL);

    for (let index = 0; index < share; index += 1) {
      // Offset by half a step so no trace starts exactly on a corner.
      const t = (index + 0.5) / Math.max(1, share);

      if (edge === "top" || edge === "bottom") {
        seeds.push({
          u: leftU + (rightU - leftU) * t,
          v: edge === "top" ? topV : bottomV,
          edge,
        });
      } else {
        seeds.push({
          u: edge === "left" ? leftU : rightU,
          v: topV + (bottomV - topV) * t,
          edge,
        });
      }
    }
  });

  return seeds;
}
