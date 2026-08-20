"use client";

import { useEffect, useState } from "react";

import {
  getBonusModeState,
  subscribeBonusMode,
} from "@/lib/battle-pixi/state/bonusModeStore";
import {
  getBonusPresentationState,
  isBonusOpeningArmed,
  subscribeBonusPresentation,
} from "@/lib/battle-pixi/state/bonusPresentationStore";

function hidden() {
  const { bonusOpeningVisible } = getBonusPresentationState();
  const { active, phase } = getBonusModeState();
  return bonusOpeningVisible || isBonusOpeningArmed() || (active && phase === "opening");
}

/**
 * Whether the run's readouts should stand down for the bonus opening.
 *
 * The opening is a cutscene: a video takes the whole cabinet while the first
 * bonus game resolves behind it. A game counter and a points total floating
 * over that read as leftover chrome — the player is watching a film, not
 * checking a meter. They come back when the bonus proper starts, which is the
 * second game.
 *
 * Three sources are checked because the cutscene is assembled from three
 * separate beats and no single flag spans all of them:
 *
 *   phase "opening"  the defeat has handed the machine to the bonus, but the
 *                    player has not pressed DRAW yet
 *   opening armed    they pressed it; the grade is rolled and the clip is
 *                    queued, but the deal has not reached it yet
 *   opening visible  the clip is on screen
 *
 * Checking only the first and last leaves the middle beat uncovered, and the
 * readouts blink back on for a couple of seconds in the middle of the cutscene.
 * The last flag clearing is the film ending, which is where the second game —
 * and the HUD — begin.
 */
export function useBonusOpeningHidden() {
  const [isHidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setHidden(hidden());
    sync();

    const unsubscribePresentation = subscribeBonusPresentation(sync);
    const unsubscribeMode = subscribeBonusMode(sync);

    return () => {
      unsubscribePresentation();
      unsubscribeMode();
    };
  }, []);

  return isHidden;
}
