/** Unscaled 1920x1080 stage pixels; shared by the dock and Kai's deal motion. */
export const CABINET_PLAYER_DOCK_OUTLET = { x: 40, y: 604, width: 256, height: 100, border: 6 } as const;
export const CABINET_PLAYER_DOCK_BACK_RECTS = [
  { x: 84, y: 650, width: 168, height: 120 },
  { x: 84, y: 670, width: 168, height: 120 },
  { x: 84, y: 690, width: 168, height: 120 },
] as const;
/** Natural card art pitched out of the mouth, centred below the player dock.
 * The same projected corners are used by DRAW1 and the first DRAW2 frame. */
export const CABINET_PLAYER_DOCK_BACK_QUADS = CABINET_PLAYER_DOCK_BACK_RECTS.map(rect =>
  [rect.x+4,rect.y,rect.x+rect.width-4,rect.y,rect.x+rect.width,rect.y+rect.height,rect.x,rect.y+rect.height] as const);
