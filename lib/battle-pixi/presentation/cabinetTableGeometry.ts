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
