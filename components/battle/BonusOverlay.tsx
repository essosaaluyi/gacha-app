"use client";

import { useEffect, useState } from "react";

import {
  getBonusPresentationState,
  showQueuedBonusResult,
  subscribeBonusPresentation,
} from "@/lib/battle-pixi/state/bonusPresentationStore";

export default function BonusOverlay() {
  const [state, setState] = useState(getBonusPresentationState());

  useEffect(() => {
    return subscribeBonusPresentation(() => {
      setState(getBonusPresentationState());
    });
  }, []);

  if (!state.bonusOverlayVisible) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9998,
        pointerEvents: "none",

        backgroundImage: "url('/images/bonus/static-bg.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",

        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {state.bonusOpeningVisible && (
        <video
          src="/videos/bonus/bonus-opening.mp4"
          autoPlay
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      )}

{state.bonusGameText && (
  <div
    style={{
      position: "absolute",
      top: "32px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 5,

      padding: "10px 28px",
      borderRadius: "999px",

      fontSize: "34px",
      fontWeight: 900,
      letterSpacing: "0.12em",

      color: "#fff7c2",
      background:
        "linear-gradient(180deg, rgba(255,215,0,0.28), rgba(70,40,0,0.72))",
      border: "2px solid rgba(255, 220, 120, 0.9)",

      textShadow:
        "0 0 8px #000, 0 0 16px #ffd700, 0 0 28px #ff8c00",
      boxShadow:
        "0 0 18px rgba(255,215,0,0.65), inset 0 0 18px rgba(255,255,255,0.18)",

      whiteSpace: "nowrap",
    }}
  >
    {state.bonusGameText}
  </div>
)}

      {state.activeRevealVideo && (
        <video
  key={`${state.activeRevealVideo}-${state.revealKey}`}
  src={state.activeRevealVideo}
  autoPlay
  muted
  playsInline
  onTimeUpdate={(event) => {
    const video = event.currentTarget;

    if (!video.duration) return;

    if (video.currentTime >= video.duration - 0.08) {
      showQueuedBonusResult();
    }
  }}
  style={{
    width: "100%",
    height: "100%",
    objectFit: "contain",
  }}
/>
      )}

      {state.bonusResultVisible && (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: "url('/images/bonus/result-bg.webp')",
      backgroundSize: "cover",
      backgroundPosition: "center",

      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",

      color: "white",
      textShadow: "0 0 18px gold",
      fontWeight: 900,
    }}
  >
    <div
      style={{
        fontSize: "42px",
        letterSpacing: "0.15em",
        marginBottom: "24px",
      }}
    >
      TOTAL BONUS POINTS
    </div>

    <div
      style={{
        fontSize: "96px",
        color: "#ffe88a",
        textShadow:
          "0 0 12px #fff, 0 0 24px #ffd700, 0 0 48px #ff8c00",
      }}
    >
      {state.bonusResultPoints}
    </div>
  </div>
)}
    </div>
  );
}