"use client";

import { useEffect, useState } from "react";

import {
  getGameCount,
  subscribeGameCount,
} from "@/lib/battle-pixi/state/battleGameStore";

export default function BattleGameCounter() {
  const [gameCount, setGameCount] = useState(getGameCount());

  useEffect(() => {
    return subscribeGameCount(() => {
      setGameCount(getGameCount());
    });
  }, []);

  return (
  <div
    style={{
      fontSize: "24px",
      fontWeight: 400,
      color: "#d3d3d3",
      fontFamily: "Impact, Arial Black, sans-serif",
      textShadow: `
        0 0 4px rgba(255, 255, 255, 0.8),
    
      `,
      userSelect: "none",
    }}
  >
    {String(gameCount).padStart(3, "0")}G
  </div>
);
}