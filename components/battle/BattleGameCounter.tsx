"use client";

import { useEffect, useState } from "react";

import {
  getGameCount,
  subscribeGameCount,
} from "@/lib/battle-pixi/state/battleGameStore";
import { useBonusOpeningHidden } from "@/lib/battle-pixi/state/useBonusOpeningHidden";
import BattleDigitStrip from "./BattleDigitStrip";

export default function BattleGameCounter() {
  const [gameCount, setGameCount] = useState(getGameCount());
  const hiddenForOpening = useBonusOpeningHidden();

  useEffect(() => {
    return subscribeGameCount(() => {
      setGameCount(getGameCount());
    });
  }, []);

  // The bonus opening is a cutscene; a counter over it is leftover chrome.
  if (hiddenForOpening) return null;

  return (
    <div className="battle-game-counter" aria-label={`${gameCount} games played`}>
      <img className="battle-hud-frame" src="/images/battle-ui/production/v1/transparent/game-counter-plaque-frame-v1.png" alt="" />
      <div className="battle-game-counter-content">
        <BattleDigitStrip value={gameCount} style="rune-led" minDigits={3} />
        <small>G</small>
      </div>
    </div>
  );
}
