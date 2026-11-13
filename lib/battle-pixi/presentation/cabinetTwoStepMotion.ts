import {
  CABINET_PLAYER_DOCK_BACK_QUADS,
  CABINET_PLAYER_DOCK_MOUTH,
} from "@/components/battle/cabinet/CabinetPlayerDock.geometry";
import { cardQuadCenter, interpolateCardQuad, type CardQuad } from "@/lib/battle-pixi/presentation/cardQuadProjection";

/** Out of the mouth, out in front of the screen, then down to the table. */
const SLIDE_MS = 480;
const PRESENT_MS = 360;
const FLIGHT_MS = 620;
const STAGGER_MS = 100;
export const TWO_STEP_DEAL_MS = STAGGER_MS * 2 + SLIDE_MS + PRESENT_MS + FLIGHT_MS;

/**
 * How much further out of the mouth each card comes than the one above it.
 *
 * All three used to slide the same distance, which left them exactly as they
 * started relative to each other — the top card furthest out, the other two
 * behind it — so a deal of three looked like a deal of one. Stepping the
 * distance puts the bottom of the stack furthest out and shows three edges.
 */
const SLIDE_STEP = 56;
const LIP = CABINET_PLAYER_DOCK_MOUTH.y1;

/**
 * Where the three are held once they are out: side by side in front of the
 * screen, big enough to count, rather than slid down onto the table.
 */
const PRESENT = { centreX: 960, centreY: 470, width: 240, height: 360, spread: 270 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => value * value * (3 - 2 * value);

function presentQuad(index: number): CardQuad {
  const cx = PRESENT.centreX + (index - 1) * PRESENT.spread;
  const x0 = cx - PRESENT.width / 2;
  const x1 = cx + PRESENT.width / 2;
  const y0 = PRESENT.centreY - PRESENT.height / 2;
  const y1 = PRESENT.centreY + PRESENT.height / 2;
  return [x0, y0, x1, y0, x1, y1, x0, y1];
}

/**
 * One dealt card, at `elapsed` ms.
 *
 * Three steps. Coming out of the mouth the card cannot change shape, because
 * that step is a straight translation and the four corners move together; on
 * the way out to the front it only grows. Only the last step reshapes it,
 * because the bay it lands in is a real quad seen in perspective. `masked` is
 * true while any part of it is still inside the machine, and the caller clips
 * it to the mouth for exactly that long.
 */
export function sampleTwoStepCard(index: number, elapsed: number, target: CardQuad) {
  const t = elapsed - index * STAGGER_MS;
  const rest = CABINET_PLAYER_DOCK_BACK_QUADS[index];
  // Far enough for this card's top edge to clear the lip, plus its share of
  // the stagger, so the one underneath always ends up further out.
  const drop = LIP + index * SLIDE_STEP - rest[1];

  const slide = clamp01(t / SLIDE_MS);
  const present = clamp01((t - SLIDE_MS) / PRESENT_MS);
  const flight = clamp01((t - SLIDE_MS - PRESENT_MS) / FLIGHT_MS);

  const out = rest.map((value, i) => (i % 2 ? value + drop : value)) as unknown as CardQuad;
  const shown = presentQuad(index);
  const progress = smooth(flight);
  const lift = Math.sin(Math.PI * flight) ** 2;

  const q = present <= 0
    ? (rest.map((value, i) => (i % 2 ? value + drop * smooth(slide) : value)) as unknown as CardQuad)
    : flight <= 0
      ? interpolateCardQuad(out, shown, smooth(present))
      : interpolateCardQuad(shown, target, progress);

  const centre = cardQuadCenter(q);
  const quad = q.map((value, i) => i % 2
    ? centre.y + (value - centre.y) * (1 + lift * .2) - lift * 74
    : centre.x + (value - centre.x) * (1 + lift * .2)) as unknown as CardQuad;

  return {
    quad,
    progress,
    lift,
    masked: present <= 0,
    shadow: `drop-shadow(0 ${3 + lift * 8}px ${3 + lift * 9}px rgba(0,0,0,${(11 / 15) * (1 - progress) + lift * .24}))`,
  };
}
