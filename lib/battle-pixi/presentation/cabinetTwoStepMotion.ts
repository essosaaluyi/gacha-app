import {
  CABINET_PLAYER_DOCK_BACK_QUADS,
  CABINET_PLAYER_DOCK_MOUTH,
} from "@/components/battle/cabinet/CabinetPlayerDock.geometry";
import { cardQuadCenter, interpolateCardQuad, type CardQuad } from "@/lib/battle-pixi/presentation/cardQuadProjection";

/** Out of the mouth, then a curve out to where the card waits. */
const SLIDE_MS = 480;
const CURVE_MS = 700;
const STAGGER_MS = 100;
export const TWO_STEP_DEAL_MS = STAGGER_MS * 2 + SLIDE_MS + CURVE_MS;

/**
 * How much further out of the mouth each card comes than the one above it.
 *
 * All three used to slide the same distance, which left them exactly as they
 * started relative to each other — the top card furthest out, the other two
 * behind it — so a deal of three looked like a deal of one.
 */
const SLIDE_STEP = 56;
const LIP = CABINET_PLAYER_DOCK_MOUTH.y1;

/**
 * How far the flight bows away from a straight line, in stage pixels.
 *
 * Without it the card drops out of the mouth and then turns right, and the
 * corner where one ends and the other begins reads as a right angle. One
 * quadratic through both instead, bowed to the outside of the turn.
 */
const CURVE_BOW = -190;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => value * value * (3 - 2 * value);

/**
 * A quadratic bend between two quads.
 *
 * The corners interpolate as they always did — that is what keeps a card the
 * same shape while it travels — and the whole quad is then displaced along a
 * curve whose control point sits off the midpoint of the straight path, normal
 * to it. Bowing the path rather than the shape means the card never skews.
 */
function curveQuad(from: CardQuad, to: CardQuad, bow: number, t: number): CardQuad {
  const a = cardQuadCenter(from);
  const b = cardQuadCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const cx = (a.x + b.x) / 2 + (-dy / length) * bow;
  const cy = (a.y + b.y) / 2 + (dx / length) * bow;
  const u = 1 - t;
  const straight = interpolateCardQuad(from, to, t);
  const offX = u * u * a.x + 2 * u * t * cx + t * t * b.x - (a.x + dx * t);
  const offY = u * u * a.y + 2 * u * t * cy + t * t * b.y - (a.y + dy * t);
  return straight.map((value, i) => (i % 2 ? value + offY : value + offX)) as unknown as CardQuad;
}

/**
 * One dealt card, at `elapsed` ms.
 *
 * Two steps. Coming out of the mouth the card cannot change shape, because
 * that step is a straight translation and the four corners move together. The
 * flight out to where it waits bends rather than turning a corner, and only
 * reshapes the card because the pose it is heading for is a real quad seen in
 * perspective. `masked` is true while any part of it is still inside the
 * machine, and the caller clips it to the mouth for exactly that long.
 */
export function sampleTwoStepCard(index: number, elapsed: number, target: CardQuad) {
  const t = elapsed - index * STAGGER_MS;
  const rest = CABINET_PLAYER_DOCK_BACK_QUADS[index];
  // Far enough for this card's top edge to clear the lip, plus its share of
  // the stagger, so the one behind always ends up further out.
  const drop = LIP + index * SLIDE_STEP - rest[1];

  const slide = clamp01(t / SLIDE_MS);
  const flight = clamp01((t - SLIDE_MS) / CURVE_MS);

  const out = rest.map((value, i) => (i % 2 ? value + drop : value)) as unknown as CardQuad;
  const quad = flight <= 0
    ? (rest.map((value, i) => (i % 2 ? value + drop * smooth(slide) : value)) as unknown as CardQuad)
    : curveQuad(out, target, CURVE_BOW, smooth(flight));

  return {
    quad,
    progress: smooth(flight),
    masked: flight <= 0,
    shadow: `drop-shadow(0 ${3 + smooth(flight) * 9}px ${3 + smooth(flight) * 10}px rgba(0,0,0,${0.73 - smooth(flight) * 0.3}))`,
  };
}
