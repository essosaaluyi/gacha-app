"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCurrentRound,
  subscribeRound,
} from "@/lib/battle-pixi/state/roundStore";

const DISPLAY_ROUNDS = 10;

export default function RoundMeter() {
  const [round, setRound] = useState(getCurrentRound());
  const currentStation = Math.max(1, Math.min(round, DISPLAY_ROUNDS));

  useEffect(() => {
    return subscribeRound(() => {
      setRound(getCurrentRound());
    });
  }, []);

  const nodes = useMemo(
    () =>
      Array.from({ length: DISPLAY_ROUNDS }, (_, index) => {
        const value = index + 1;
        const isCleared = value < currentStation;
        const isCurrent = value === currentStation;
        const image = isCleared
          ? "station-cleared.svg"
          : isCurrent
          ? "station-current.svg"
          : "station-upcoming.svg";

        return {
          value,
          image,
          isCleared,
          isCurrent,
          left: `${8.7 + index * 8.75}%`,
        };
      }),
    [currentStation]
  );

  return (
    <div
      className="battle-progress-roadmap"
      aria-label={`Battle progress: station ${currentStation} of ${DISPLAY_ROUNDS}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "44px",
        maxHeight: "64px",
        overflow: "hidden",
        pointerEvents: "none",
        filter:
          "drop-shadow(0 4px 10px rgba(0,0,0,.72)) drop-shadow(0 0 8px rgba(56,189,248,.18))",
      }}
    >
      <img
        src="/images/battle-roadmap/battle-progress-track.svg"
        alt=""
        className="battle-progress-track"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
          display: "block",
        }}
      />

      {nodes.map((node) => (
        <div
          key={node.value}
          className={`battle-progress-station ${
            node.isCurrent ? "battle-progress-station-current" : ""
          } ${node.isCleared ? "battle-progress-station-cleared" : ""}`}
          style={{
            position: "absolute",
            left: node.left,
            top: "50%",
            width: "11.4%",
            maxWidth: "82px",
            minWidth: "48px",
            transform: "translate(-50%, -50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: node.isCurrent ? 3 : 2,
          }}
        >
          <img
            src={`/images/battle-roadmap/${node.image}`}
            alt=""
            className="battle-progress-station-image"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
          <span
            className="battle-progress-station-label"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: node.isCleared ? "#dcfce7" : "#ffffff",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: node.isCleared ? "18px" : "13px",
              fontWeight: 900,
              textShadow:
                "0 1px 0 #000, 0 0 5px rgba(0, 0, 0, 0.75)",
            }}
          >
            {node.isCleared ? "✓" : node.value}
          </span>
        </div>
      ))}

      {round > DISPLAY_ROUNDS && (
        <div
          className="battle-progress-extra"
          style={{
            position: "absolute",
            right: "-42px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#fde68a",
            fontFamily: 'Impact, "Arial Black", Arial, Helvetica, sans-serif',
            fontSize: "12px",
            whiteSpace: "nowrap",
            textShadow: "0 0 8px rgba(0, 0, 0, 0.9)",
          }}
        >
          EX {round - DISPLAY_ROUNDS}
        </div>
      )}
    </div>
  );
}
