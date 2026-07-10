"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getMagicCircleState,
  subscribeMagicCircle,
} from "@/lib/battle-pixi/state/magicCircleStore";

function subscribeUrlPreview(listener: () => void) {
  window.addEventListener("popstate", listener);

  return () => {
    window.removeEventListener("popstate", listener);
  };
}

function getPreviewSnapshot() {
  const params = new URLSearchParams(window.location.search);

  const value = params.get("magic-circle") ?? params.get("magicCircle");

  return value === "preview" || value === "chance";
}

function getPreviewChanceSnapshot() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("magic-circle") ?? params.get("magicCircle");

  return value === "chance";
}

export default function MagicCircleOverlay() {
  const previewActive = useSyncExternalStore(
    subscribeUrlPreview,
    getPreviewSnapshot,
    () => false
  );
  const previewChance = useSyncExternalStore(
    subscribeUrlPreview,
    getPreviewChanceSnapshot,
    () => false
  );
  const [state, setState] = useState(getMagicCircleState());
  const [previewState, setPreviewState] = useState({
    active: true,
    pulseKey: 1,
    pulseCount: 0,
    chanceTextArmed: false,
    chanceTextVisible: false,
  });

  useEffect(() => {
    return subscribeMagicCircle(() => {
      setState(getMagicCircleState());
    });
  }, []);

  useEffect(() => {
    if (!previewActive) return;

    const interval = window.setInterval(() => {
      setPreviewState((current) => ({
        active: true,
        pulseKey: current.pulseKey + 1,
        pulseCount: previewChance
          ? Math.min(current.pulseCount + 1, 3)
          : (current.pulseCount + 1) % 3,
        chanceTextArmed: previewChance,
        chanceTextVisible: previewChance && current.pulseCount + 1 >= 3,
      }));
    }, 980);

    return () => window.clearInterval(interval);
  }, [previewActive, previewChance]);

  const displayState = previewActive
    ? {
        ...previewState,
        chanceTextArmed: previewChance,
        chanceTextVisible: previewChance && previewState.pulseCount >= 3,
      }
    : state;

  if (!displayState.active) return null;

  const fadeOpacity = Math.max(0.22, 0.92 - displayState.pulseCount * 0.22);

  return (
    <div className="magic-circle-layer">
      <div
        key={displayState.pulseKey}
        className={`magic-circle-pulse${
          displayState.chanceTextVisible ? " magic-circle-pulse-chance" : ""
        }`}
        style={{ opacity: fadeOpacity }}
      >
        {!displayState.chanceTextVisible && (
          <>
            <div className="magic-circle-ring magic-circle-ring-outer" />
            <div className="magic-circle-ring magic-circle-ring-middle" />
            <div className="magic-circle-ring magic-circle-ring-inner" />

            <div className="magic-circle-cross magic-circle-cross-a" />
            <div className="magic-circle-cross magic-circle-cross-b" />
            <div className="magic-circle-core" />
          </>
        )}
        {displayState.chanceTextVisible && (
          <div className="magic-circle-chance-text">CHANCE</div>
        )}
      </div>
    </div>
  );
}
