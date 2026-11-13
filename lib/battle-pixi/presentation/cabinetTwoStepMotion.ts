import {
  CABINET_PLAYER_DOCK_BACK_QUADS,
  CABINET_PLAYER_DOCK_CARD,
} from "@/components/battle/cabinet/CabinetPlayerDock.geometry";
import { cardQuadCenter, interpolateCardQuad, type CardQuad } from "@/lib/battle-pixi/presentation/cardQuadProjection";

export const TWO_STEP_DEAL_MS = 1080;
/** Out of the mouth first, then across to the table — the two steps. */
const SLIDE_MS = 300;
const FLIGHT_MS = 690;
const STAGGER_MS = 90;
/**
 * How far a card travels to clear the lip: its own height.
 *
 * A waiting card's bottom edge is at the lip, so sliding down by one card puts
 * its top edge there too and the whole card is out in the open. The mask can
 * be dropped at exactly that point without anything appearing or vanishing.
 */
const SLIDE = CABINET_PLAYER_DOCK_CARD.height;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => value * value * (3 - 2 * value);

/**
 * One dealt card, at `elapsed` ms.
 *
 * The card never changes shape while it is coming out: step one is a straight
 * translation, so the four corners move together. Only the flight to the table
 * reshapes it, because the table is seen in perspective and the bay it lands in
 * is a real quad. `masked` is true while any part of the card is still inside
 * the machine; the caller clips it to the mouth for exactly that long.
 */
export function sampleTwoStepCard(index: number, elapsed: number, target: CardQuad) {
  const t = elapsed - index * STAGGER_MS;
  const slide = clamp01(t / SLIDE_MS);
  const flight = clamp01((t - SLIDE_MS) / FLIGHT_MS);
  const rest = CABINET_PLAYER_DOCK_BACK_QUADS[index];
  const out = rest.map((value, i) => (i % 2 ? value + SLIDE : value)) as unknown as CardQuad;

  const progress = smooth(flight);
  const lift = Math.sin(Math.PI * flight) ** 2;
  const q = flight <= 0
    ? (rest.map((value, i) => (i % 2 ? value + SLIDE * smooth(slide) : value)) as unknown as CardQuad)
    : interpolateCardQuad(out, target, progress);
  const centre = cardQuadCenter(q);
  const quad = q.map((value, i) => i % 2
    ? centre.y + (value - centre.y) * (1 + lift * .2) - lift * 74
    : centre.x + (value - centre.x) * (1 + lift * .2)) as unknown as CardQuad;

  return {
    quad,
    progress,
    lift,
    masked: flight <= 0,
    shadow: `drop-shadow(0 ${3 + lift * 8}px ${3 + lift * 9}px rgba(0,0,0,${(11 / 15) * (1 - progress) + lift * .24}))`,
  };
}
