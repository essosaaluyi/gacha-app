"use client";

import { useEffect, useState } from "react";
import {
  getChanceIconOverlayState,
  subscribeChanceIconOverlay,
} from "@/lib/battle-pixi/state/chanceIconOverlayStore";

const iconIndexes = [0, 1, 2];

export default function ChanceIconOverlay() {
  const [state, setState] = useState(getChanceIconOverlayState());

  useEffect(() => {
    return subscribeChanceIconOverlay(() => {
      setState(getChanceIconOverlayState());
    });
  }, []);

  if (!state.visible) return null;

  return (
    <div key={state.overlayKey} className="chance-icon-overlay">
      {iconIndexes.map((index) => (
        <div
          key={index}
          className="chance-icon-slot"
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <img
            src="/images/chanceicon.webp"
            alt=""
            className="chance-icon-image"
            style={{ animationDelay: `${index * 90}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
