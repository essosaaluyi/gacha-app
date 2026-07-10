// Feature 2: picks how an attack attempt presents.
// "none"     – no buildup at all (a hidden win arms the resurrection reveal)
// "delayed3" – 3-game cycle: games 1-2 show nothing, game 3 fires the payoff
// "classic"  – the pre-patch enemy-counter fakeout (weight 0 by default)

import { patchConfig, type FakeoutVariant } from "@/lib/game-config/patchConfig";
import { logEvent } from "@/lib/events/gameEventStore";

export function rollFakeoutVariant(): FakeoutVariant {
  const forced = patchConfig.debug.forceFakeoutVariant;

  if (forced) {
    logEvent({ kind: "fakeoutVariant", detail: { variant: forced, forced: true } });
    return forced;
  }

  const variants = patchConfig.fakeout.variants;
  const total = variants.reduce((sum, v) => sum + v.weight, 0);

  let roll = Math.random() * total;
  let picked: FakeoutVariant = variants[0]?.variant ?? "classic";

  for (const entry of variants) {
    roll -= entry.weight;
    if (roll < 0) {
      picked = entry.variant;
      break;
    }
  }

  logEvent({ kind: "fakeoutVariant", detail: { variant: picked, forced: false } });
  return picked;
}
