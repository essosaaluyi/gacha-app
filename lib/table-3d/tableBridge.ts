import type { CabinetTable3D } from "@/lib/table-3d/cabinetTable3D";

/**
 * The one mounted 3D table, so the Pixi stage can ask it to turn a bay over
 * and then follow that bay while it turns.
 *
 * The two live on different canvases stacked in the same box — the table is
 * three.js underneath, the cards are Pixi on top — so they cannot share a
 * scene graph. This is the seam between them, kept to one object rather than
 * a window global so the dependency is visible in the imports.
 *
 * Null whenever the 3D table is off (production still draws the baked table
 * image), and every caller has to cope with that.
 */
let table: CabinetTable3D | null = null;

export function setCabinetTable3D(next: CabinetTable3D | null) {
  table = next;
}

export function getCabinetTable3D() {
  return table;
}

/**
 * Maps a point on the table's canvas onto the Pixi stage's own coordinates.
 *
 * Both canvases are laid out in the same parent and each stretches its own
 * fixed logical size to whatever the cabinet has scaled that box to, so going
 * out through client pixels and back is exact and survives any scaling the
 * cabinet applies — no shared constant to keep in step.
 */
export function tablePointToPixi(
  point: [number, number],
  tableCanvas: HTMLCanvasElement,
  pixiCanvas: HTMLCanvasElement,
  pixiLogical: { width: number; height: number }
): [number, number] {
  // clientWidth is the box before the cabinet's transform, which is the space
  // the table reports its corners in; the rect is that box as drawn.
  const tw = tableCanvas.clientWidth;
  const th = tableCanvas.clientHeight;
  const t = tableCanvas.getBoundingClientRect();
  const p = pixiCanvas.getBoundingClientRect();
  if (!tw || !th || !t.width || !t.height || !p.width || !p.height) return point;
  const clientX = t.left + (point[0] / tw) * t.width;
  const clientY = t.top + (point[1] / th) * t.height;
  return [
    ((clientX - p.left) / p.width) * pixiLogical.width,
    ((clientY - p.top) / p.height) * pixiLogical.height,
  ];
}
