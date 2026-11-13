import { Container, Graphics, PerspectiveMesh, Texture } from "pixi.js";

import { getCabinetTable3D, tablePointToPixi } from "@/lib/table-3d/tableBridge";

export type FoldQuad = [
  number, number, number, number, number, number, number, number,
];

/**
 * Owner reference 2026-11-13 (uploads/e997eec5-2026-11-09_21-38-20.mp4): when a
 * card leaves the field it does not blink out. It hinges on one of its long
 * edges, swings up out of the table and goes edge-on, with a hard white glint
 * riding the lifting edge. In the reference the whole thing takes five or six
 * frames at 30fps, so it reads as a snap, not a flourish.
 *
 * The real battle cards are reset synchronously by resetBattleCardsToGroup, so
 * this draws a throwaway copy of the card ("ghost") on the same layer and lets
 * that play the exit while the real mesh is already being rebuilt underneath
 * for the next hand. Nothing here writes to a live card.
 */

/** Degrees of the swing. A quarter turn puts the card exactly edge-on. */
const SWEEP = Math.PI / 2;
/**
 * How far the free edge rises, as a fraction of the card's own on-screen width.
 * Deliberately tiny. A true hinge in the table plane would swing the card up to
 * standing at a quarter turn, and because the camera looks down on the table
 * that leaves a 90px-tall face still squarely visible — the card never thins
 * out. The reference instead collapses to a hairline, so the axis there is
 * effectively the screen-vertical one. This keeps that and spends the rest on a
 * slight lean back, which is enough to sell the card as a physical object.
 */
const LIFT = 0.1;
/** The card is already a sliver by the time it fades, so the fade is late. */
const FADE_FROM = 0.72;

const easeIn = (t: number) => t * t;

function centerOf(q: FoldQuad) {
  return { x: (q[0] + q[2] + q[4] + q[6]) / 4, y: (q[1] + q[3] + q[5] + q[7]) / 4 };
}

export type FoldAwayOptions = {
  /** Layer to draw on; the ghost is removed from it when the fold ends. */
  parent: Container;
  /** The face the card was showing. */
  texture: Texture;
  /** The card's four corners in `parent` space, clockwise from top-left. */
  quad: FoldQuad;
  /** Which long edge the card hinges on. The reference folds to the right. */
  hinge?: "left" | "right";
  durationMs?: number;
  /** Stops the fold early and cleans up; safe to call twice. */
  onDone?: () => void;
};

export function foldAwayCard({
  parent,
  texture,
  quad,
  hinge = "right",
  durationMs = 190,
  onDone,
}: FoldAwayOptions): () => void {
  // The ghost sits at the layer origin with its corners given in parent space,
  // so no local/global conversion is needed while the corners are animated.
  const mesh = new PerspectiveMesh({ texture, verticesX: 12, verticesY: 18 });
  mesh.eventMode = "none";
  const glint = new Graphics();
  glint.eventMode = "none";
  parent.addChild(mesh, glint);

  // Corner order is clockwise from the top-left: TL TR BR BL. The hinge is one
  // vertical edge, and the two corners opposite it are the ones that travel.
  const hingeTop = hinge === "right" ? [quad[2], quad[3]] : [quad[0], quad[1]];
  const hingeBottom = hinge === "right" ? [quad[4], quad[5]] : [quad[6], quad[7]];
  const freeTop = hinge === "right" ? [quad[0], quad[1]] : [quad[2], quad[3]];
  const freeBottom = hinge === "right" ? [quad[6], quad[7]] : [quad[4], quad[5]];

  const width = Math.hypot(freeTop[0] - hingeTop[0], freeTop[1] - hingeTop[1]);
  const lift = width * LIFT;

  const center = centerOf(quad);
  const startTime = performance.now();
  let raf = 0;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    mesh.destroy();
    glint.destroy();
    onDone?.();
  };

  const frame = (now: number) => {
    if (finished) return;
    const t = Math.min((now - startTime) / durationMs, 1);
    // Ease in: the card is slow to break the table and then whips shut, which
    // is what makes the reference read as a snap rather than a wipe.
    const angle = easeIn(t) * SWEEP;
    const close = Math.cos(angle);
    const rise = Math.sin(angle) * lift;

    // Swinging the free edge up out of the table shortens it on screen (close)
    // and raises it (rise). Screen-up is -y, which on this table is also the
    // direction away from the player, so the card leans back as it closes.
    const move = (free: number[], hinge2: number[]) => [
      hinge2[0] + (free[0] - hinge2[0]) * close,
      hinge2[1] + (free[1] - hinge2[1]) * close - rise,
    ];
    const tl = move(freeTop, hingeTop);
    const bl = move(freeBottom, hingeBottom);

    if (hinge === "right") {
      mesh.setCorners(tl[0], tl[1], hingeTop[0], hingeTop[1],
        hingeBottom[0], hingeBottom[1], bl[0], bl[1]);
    } else {
      mesh.setCorners(hingeTop[0], hingeTop[1], tl[0], tl[1],
        bl[0], bl[1], hingeBottom[0], hingeBottom[1]);
    }

    const alpha = t < FADE_FROM ? 1 : 1 - (t - FADE_FROM) / (1 - FADE_FROM);
    mesh.alpha = alpha;

    // The lit edge. In the reference it is a hard white hairline on the edge
    // that is lifting, brightest at the halfway point where that edge is
    // squarest to the light.
    glint.clear();
    glint
      .moveTo(tl[0], tl[1])
      .lineTo(bl[0], bl[1])
      .stroke({ width: 2.5, color: 0xffffff, alpha: alpha * (0.35 + 0.65 * Math.sin(angle)) });

    // A short bloom under the card as it leaves, so the slot does not simply
    // become a hole.
    if (t > 0.4) {
      const g = (1 - (t - 0.4) / 0.6) * 0.5;
      glint
        .ellipse(center.x, center.y, width * 0.55, width * 0.3)
        .fill({ color: 0x9fd8ff, alpha: g * 0.22 });
    }

    if (t < 1) raf = requestAnimationFrame(frame);
    else finish();
  };

  raf = requestAnimationFrame(frame);
  return finish;
}

/**
 * The same exit, but driven by the 3D table instead of faked in 2D.
 *
 * The owner's call: the bay itself turns over and the card goes under the
 * table with it. The bay is three.js and the card is Pixi on a canvas above
 * it, so they cannot be one object — the bay turns, and the card copies the
 * bay's corners every frame until the bay passes edge-on and the card is
 * underneath, at which point there is nothing left to draw.
 */
export function rideSlotFlip({
  parent,
  texture,
  index,
  pixiCanvas,
  pixiLogical,
  durationMs = 420,
}: {
  parent: Container;
  texture: Texture;
  index: number;
  pixiCanvas: HTMLCanvasElement;
  pixiLogical: { width: number; height: number };
  durationMs?: number;
}): () => void {
  const table = getCabinetTable3D();
  if (!table) return () => {};

  const tableCanvas = table.canvasEl();
  const toPixi = (q: readonly number[]) => {
    const c: number[] = [];
    for (let i = 0; i < 8; i += 2) {
      const [x, y] = tablePointToPixi([q[i], q[i + 1]], tableCanvas, pixiCanvas, pixiLogical);
      c.push(x, y);
    }
    return c;
  };

  const mesh = new PerspectiveMesh({ texture, verticesX: 12, verticesY: 18 });
  mesh.eventMode = "none";

  // The slot at rest, as a mask. The panel is cut off at the table surface on
  // the 3D side so it cannot climb over the painted frame; the card has to be
  // held to the same opening or it would climb over the frame on its own.
  const s = toPixi(table.slotQuads()[index]);
  const clip = new Graphics()
    .poly([s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]])
    .fill(0xffffff);
  mesh.mask = clip;
  parent.addChild(clip, mesh);
  table.flipSlot(index, durationMs);
  let raf = 0;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    mesh.mask = null;
    mesh.destroy();
    clip.destroy();
  };

  const frame = () => {
    if (finished) return;
    // Past 1 the bay has gone through edge-on and the card is under the table.
    if (table.slotProgress(index) >= 1) {
      finish();
      return;
    }
    const c = toPixi(table.livePlateQuad(index));
    mesh.setCorners(c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7]);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return finish;
}
