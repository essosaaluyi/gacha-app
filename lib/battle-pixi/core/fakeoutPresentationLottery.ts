// Feature 2: picks how ONE buildup game of the attack fakeout presents.
//
// "dialogue"     – character inserts: player on the first flip, enemy on the third
// "chanceReveal" – the chance reveal visual for the whole game
//
// Rolled fresh for every buildup game, so a 3-game cycle is a random mix. The
// previous game's presentation is cleared on the next draw.

import {
  patchConfig,
  type FakeoutPresentation,
} from "@/lib/game-config/patchConfig";
import { logEvent } from "@/lib/events/gameEventStore";

export function rollFakeoutPresentation(): FakeoutPresentation {
  const forced = patchConfig.debug.forceFakeoutPresentation;

  if (forced) {
    logEvent({
      kind: "fakeoutVariant",
      detail: { variant: forced, forced: true },
    });
    return forced;
  }

  const entries = patchConfig.fakeout.presentations;
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);

  let roll = Math.random() * total;
  let picked: FakeoutPresentation = entries[0]?.presentation ?? "dialogue";

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll < 0) {
      picked = entry.presentation;
      break;
    }
  }

  logEvent({ kind: "fakeoutVariant", detail: { variant: picked, forced: false } });
  return picked;
}
