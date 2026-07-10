"use client";

import { useEffect, useState } from "react";
import {
  getBattleCutIn,
  subscribeBattleCutIn,
} from "@/lib/battle-pixi/state/battleCutInStore";

const toneStyles = {
  info: {
    color: "#dbeafe",
    border: "rgba(147,197,253,0.95)",
    glow: "rgba(59,130,246,0.75)",
  },
  chance: {
    color: "#fef08a",
    border: "rgba(250,204,21,0.95)",
    glow: "rgba(250,204,21,0.8)",
  },
  attack: {
    color: "#fecaca",
    border: "rgba(248,113,113,0.95)",
    glow: "rgba(239,68,68,0.8)",
  },
  danger: {
    color: "#fda4af",
    border: "rgba(244,63,94,0.95)",
    glow: "rgba(190,18,60,0.85)",
  },
  bonus: {
    color: "#fde68a",
    border: "rgba(251,191,36,0.95)",
    glow: "rgba(245,158,11,0.85)",
  },
  rainbow: {
    color: "#ffffff",
    border: "rgba(255,255,255,0.95)",
    glow: "rgba(216,180,254,0.9)",
  },
};

export default function BattleCutInOverlay() {
  const [cutIn, setCutIn] = useState(getBattleCutIn());

  useEffect(() => {
    return subscribeBattleCutIn(() => {
      setCutIn(getBattleCutIn());
    });
  }, []);

  if (!cutIn) return null;

  const style = toneStyles[cutIn.tone];

  return (
    <div
      key={cutIn.id}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9997,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle, rgba(255,255,255,0.16), rgba(0,0,0,0.18) 45%, rgba(0,0,0,0) 72%)",
      }}
    >
      <div
        className="press-depth-effect"
        style={{
          minWidth: "46%",
          padding: "18px 34px",
          textAlign: "center",
          color: style.color,
          background: "rgba(0,0,0,0.68)",
          border: `3px solid ${style.border}`,
          boxShadow: `0 0 28px ${style.glow}, inset 0 0 24px rgba(255,255,255,0.12)`,
          textShadow: `0 0 10px #000, 0 0 24px ${style.glow}`,
        }}
      >
        <div
          style={{
            fontSize: "clamp(30px, 5vw, 68px)",
            fontWeight: 900,
            letterSpacing: "0.08em",
            lineHeight: 1,
          }}
        >
          {cutIn.title}
        </div>

        {cutIn.subtitle && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "clamp(14px, 1.8vw, 24px)",
              fontWeight: 800,
              color: "white",
            }}
          >
            {cutIn.subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
