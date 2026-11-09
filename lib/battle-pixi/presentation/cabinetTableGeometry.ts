export const CABINET_TABLE_BASE_ANGLE_DEGREES = 29;
export const CABINET_TABLE_ANGLE_DEGREES = 60;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const CABINET_TABLE_DEPTH_SCALE =
  Math.sin(toRadians(CABINET_TABLE_ANGLE_DEGREES)) /
  Math.sin(toRadians(CABINET_TABLE_BASE_ANGLE_DEGREES));

// Keep the DOM disk-pile handoff and the Pixi card entry on one screen row
// while the rest of the table pitches toward the player.
const CABINET_TABLE_HANDOFF_Y = 105;
export const CABINET_TABLE_PITCH_OFFSET_Y =
  -(CABINET_TABLE_DEPTH_SCALE - 1) * CABINET_TABLE_HANDOFF_Y;

export const CABINET_AIR_OUTLET = { x: 168, y: 670 } as const;
export const CABINET_AIR_MOUTH = { x: 168, y: 670, width: 204, height: 100 } as const;
export const CABINET_AIR_HANDOFF_MS = 240;

type Rect = { left: number; top: number; width: number; height: number };
export type CabinetCardQuad = [number, number, number, number, number, number, number, number];

export function projectPixiQuadToCabinet(quad: readonly number[], surface: Rect, cabinet: Rect,
  stage: { width: number; height: number }): CabinetCardQuad | null {
  const values: number[] = [];
  for (let index = 0; index < 8; index += 2) {
    const point = projectPixiPointToCabinet({ x: quad[index], y: quad[index + 1] }, surface, cabinet, stage);
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    values.push(point.x, point.y);
  }
  return values as CabinetCardQuad;
}

/** Inverse of the actual DOM canvas projection, for rigid3D landing corners. */
export function projectCabinetQuadToPixi(quad: readonly number[], surface: Rect, cabinet: Rect,
  stage: { width: number; height: number }): CabinetCardQuad | null {
  if (![surface.width, surface.height, cabinet.width, cabinet.height, stage.width, stage.height]
    .every(value => Number.isFinite(value) && value > 0)) return null;
  const values: number[] = [];
  for (let index = 0; index < 8; index += 2) {
    values.push((cabinet.left + quad[index] / 1920 * cabinet.width - surface.left) / surface.width * stage.width,
      (cabinet.top + quad[index + 1] / 1080 * cabinet.height - surface.top) / surface.height * stage.height);
  }
  return values.every(Number.isFinite) ? values as CabinetCardQuad : null;
}

/** Project through the real pitched/scaled canvas, then back into 1920x1080 cabinet space. */
export function projectPixiPointToCabinet(point: { x: number; y: number },
  surface: Rect, cabinet: Rect, stage: { width: number; height: number }) {
  if (![surface.width, surface.height, cabinet.width, cabinet.height, stage.width, stage.height]
    .every(value => Number.isFinite(value) && value > 0)) return null;
  return {
    x: (surface.left + point.x / stage.width * surface.width - cabinet.left) * 1920 / cabinet.width,
    y: (surface.top + point.y / stage.height * surface.height - cabinet.top) * 1080 / cabinet.height,
  };
}
