"use client";

import {
  getFatalModeGamesLeft,
  subscribeFatalMode,
} from "@/lib/battle-pixi/state/fatalModeStore";

import { useEffect, useState } from "react";



import {
  getEnemyAttackCounter,
  subscribeEnemyAttackCounter,
} from "@/lib/battle-pixi/state/enemyAttackCounterStore";

export default function EnemyAttackCounter() {
  const [counter, setCounter] = useState(getEnemyAttackCounter());
  const [fatalLeft, setFatalLeft] = useState(getFatalModeGamesLeft());

  useEffect(() => {
  return subscribeFatalMode(() => {
    setFatalLeft(getFatalModeGamesLeft());
  });
}, []);

  useEffect(() => {
    return subscribeEnemyAttackCounter(() => {
      setCounter(getEnemyAttackCounter());
    });
  }, []);

  

 const isHeld = fatalLeft > 0;

return (
  <div
    style={{
      position: "relative",
      display: "inline-block",
      fontSize: "75px",
      fontWeight: 400,
      color: isHeld
        ? "rgba(167, 0, 189, 0.35)"
        : counter <= 2
        ? "#ff3333"
        : "#a700bd",
      fontFamily: "Impact, Arial Black, sans-serif",
      textShadow: isHeld
        ? "none"
        : counter <= 2
        ? "0 0 8px rgba(255, 255, 255, 0.9), 0 0 18px rgb(255, 0, 0)"
        : "0 0 10px rgb(255, 0, 0)",
      userSelect: "none",
    }}
  >
    {counter}

    {isHeld && (
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "20px",
          transform: "translateX(-50%) rotate(-10deg)",
          color: "#dcdcdc",
          fontSize: "60px",
          fontWeight: 900,
          textShadow:
            "0 0 6px rgba(0, 0, 0, 0.9)",
          pointerEvents: "none",
        }}
      >
        HOLD
      </div>
    )}
  </div>
);
}