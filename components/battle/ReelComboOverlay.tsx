"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  getReelComboState,
  subscribeReelCombo,
} from "@/lib/battle-pixi/state/reelComboStore";

// The DOM half of the reel layer is only the REACH text. The combination
// flash is drawn on the table surface in Pixi, so it stays inside the glass
// and follows the table's perspective — nothing here touches the page.

/** REACH tint per symbol, as [core, halo]. */
const TONES: Record<string, [string, string]> = {
  Coin: ["255, 214, 102", "255, 158, 30"],
  Bar: ["255, 168, 74", "232, 96, 24"],
  Defense: ["150, 208, 255", "48, 128, 232"],
  Reply: ["150, 245, 178", "34, 186, 106"],
};

function toneFor(symbol: string): [string, string] {
  return TONES[symbol] ?? TONES.Coin;
}

export default function ReelComboOverlay() {
  const [state, setState] = useState(getReelComboState());

  useEffect(() => subscribeReelCombo(() => setState(getReelComboState())), []);

  const { tenpai, token } = state;

  if (!tenpai) return null;

  const [core, halo] = toneFor(tenpai.symbol);

  return (
    <div className="reel-combo-layer" aria-hidden="true">
      <div
        key={`tenpai-${token}`}
        className="reel-tenpai-bar"
        style={{ "--reel-core": core, "--reel-halo": halo } as CSSProperties}
      >
        <span className="reel-tenpai-word">REACH</span>
      </div>
    </div>
  );
}
