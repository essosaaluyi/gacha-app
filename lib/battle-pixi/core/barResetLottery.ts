// Bonus BAR reset mechanic: rolls whether a bonus game is a real reset,
// a bar fakeout, or a normal reward. Pure and config-driven.

import { patchConfig } from "@/lib/game-config/patchConfig";

export type BarResetEvent = "real" | "fake" | "none";

export function rollBarResetEvent(): BarResetEvent {
  const { realResetChance, fakeChance } = patchConfig.barReset;

  const roll = Math.random();

  if (roll < realResetChance) return "real";
  if (roll < realResetChance + fakeChance) return "fake";
  return "none";
}
