"use client";

import type { CSSProperties } from "react";
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
          className={`chance-icon-slot ${
            state.dismissed[index] ? "chance-icon-slot-dismissed" : ""
          }`}
        >
          {Array.from({ length: 10 }).map((_, particleIndex) => (
            <span
              key={particleIndex}
              className="chance-icon-particle"
              style={{
                "--chance-particle-angle": `${particleIndex * 36}deg`,
                "--chance-particle-distance": `${32 + (particleIndex % 3) * 12}px`,
              } as CSSProperties}
            />
          ))}
          <img
            src="/images/chanceicon.webp"
            alt=""
            className="chance-icon-image"
          />
        </div>
      ))}
    </div>
  );
}
