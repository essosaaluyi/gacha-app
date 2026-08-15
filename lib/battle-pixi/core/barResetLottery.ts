// Bonus BAR reset mechanic: rolls whether a bonus game is a real reset,
// a bar fakeout, or a normal reward. Pure and config-driven.

import { patchConfig } from "@/lib/game-config/patchConfig";

export type BarResetEvent = "real" | "fake" | "none";

export function rollBarResetEvent(): BarResetEvent {
  const { realResetChance, fakeChance } = patchConfig.barReset;

  // The flags are independent. A simultaneous hit resolves as the successful
  // triple BAR, matching the main-game BAR CHANCE priority rule.
  const real = Math.random() < realResetChance;
  const fake = Math.random() < fakeChance;

  if (real) return "real";
  if (fake) return "fake";
  return "none";
}
