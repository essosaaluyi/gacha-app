import { useEffect, useState } from "react";
import {
  getBattlePointsState,
  initializeBattlePoints,
  subscribeBattlePoints,
} from "@/lib/battle-pixi/state/battlePointsStore";

export default function BattlePoints() {
  const [state, setState] = useState(getBattlePointsState());

  useEffect(() => {
    const unsubscribe = subscribeBattlePoints(() => {
      setState(getBattlePointsState());
    });

    void initializeBattlePoints();

    return unsubscribe;
  }, []);

  return (
    <div
      style={{
        color: "#fde047",
        fontFamily: 'Impact, "Arial Black", Arial, Helvetica, sans-serif',
        fontSize: "24px",
        fontWeight: 900,
        letterSpacing: "0.04em",
        lineHeight: 1,
        textTransform: "uppercase",
        textShadow:
          "0 2px 0 rgba(0,0,0,0.95), 0 0 10px rgba(250,204,21,0.85)",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          verticalAlign: "middle",
        }}
      >
        total
      </span>{" "}
      <span
        style={{
          fontSize: "28px",
          verticalAlign: "middle",
        }}
      >
        {state.loaded ? state.points : "..."}
      </span>{" "}
      <span
        style={{
          fontSize: "13px",
          verticalAlign: "middle",
        }}
      >
        p
      </span>
      <div
        style={{
          marginTop: "5px",
          color: "#fff7ad",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.02em",
          textShadow: "0 1px 0 rgba(0,0,0,0.9)",
        }}
      >
        battle +{state.sessionEarnedPoints}
      </div>
    </div>
  );
}
