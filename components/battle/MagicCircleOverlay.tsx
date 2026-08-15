"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import {
  getMagicCircleState,
  subscribeMagicCircle,
} from "@/lib/battle-pixi/state/magicCircleStore";

// Burst geometry is fixed at module load so every reveal fires the same
// sleek light pattern (radiating streaks + sparks).
const STREAK_COUNT = 22;
const STREAKS = Array.from({ length: STREAK_COUNT }, (_, i) => ({
  angle: (360 / STREAK_COUNT) * i + (Math.random() * 8 - 4),
  len: 110 + Math.random() * 90,
  delay: 0.86 + Math.random() * 0.12,
}));
const SPARKS = Array.from({ length: 14 }, () => {
  const angle = Math.random() * Math.PI * 2;
  const dist = 90 + Math.random() * 130;
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist };
});

function readPreviewValue() {
  const params = new URLSearchParams(window.location.search);
  return params.get("magic-circle") ?? params.get("magicCircle");
}

function subscribeUrlPreview(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}

function getPreviewSnapshot() {
  const value = readPreviewValue();
  return value === "preview" || value === "chance";
}

function getPreviewChanceSnapshot() {
  return readPreviewValue() === "chance";
}

function rippleSizePx(stage: number) {
  if (stage <= 1) return 240;
  if (stage === 2) return 460;
  return 600;
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
    active: false,
    pulseKey: 0,
    pulseCount: 0,
    chanceTextVisible: false,
  });

  useEffect(() => {
    return subscribeMagicCircle(() => {
      setState(getMagicCircleState());
    });
  }, []);

  // Preview driver: loops ripple -> echo -> reveal so the effect can be
  // inspected at /battle?magic-circle=chance (or =preview for the miss build).
  useEffect(() => {
    if (!previewActive) return;

    let alive = true;
    let key = 0;
    const timers: number[] = [];

    const set = (pulseCount: number, chance: boolean, active = true) => {
      key += 1;
      setPreviewState({ active, pulseKey: key, pulseCount, chanceTextVisible: chance });
    };

    const runCycle = () => {
      if (!alive) return;
      set(0, false, false);
      timers.push(window.setTimeout(() => set(1, false), 250));
      timers.push(window.setTimeout(() => set(2, false), 1300));
      timers.push(window.setTimeout(() => set(3, previewChance), 2350));
      timers.push(window.setTimeout(runCycle, 4600));
    };

    runCycle();

    return () => {
      alive = false;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [previewActive, previewChance]);

  const displayState = previewActive ? previewState : state;

  if (!displayState.active) return null;

  const stage = Math.min(Math.max(displayState.pulseCount, 0), 3);
  const reveal = displayState.chanceTextVisible;

  return (
    <div className="magic-circle-layer">
      <div className={`mc-fx mc-s${stage}${reveal ? " mc-reveal" : ""}`}>
        <div className="mc-backdrop" />
        <div className="mc-flash" />

        <div className="mc-hub">
          {stage > 0 && (
            <div
              key={displayState.pulseKey}
              className="mc-ripple"
              style={{ "--mc-rs": `${rippleSizePx(stage)}px` } as CSSProperties}
            />
          )}
        </div>

        <div className="mc-hub">
          <svg className="mc-seal" viewBox="0 0 400 400">
            <g className="mc-spin-cw">
              <circle className="mc-ring-draw" cx="200" cy="200" r="188" />
              <circle
                cx="200"
                cy="200"
                r="168"
                stroke="rgba(201,162,75,.5)"
                strokeWidth="1.5"
                strokeDasharray="3 9"
              />
            </g>
            <g className="mc-spin-ccw">
              <circle
                cx="200"
                cy="200"
                r="140"
                stroke="rgba(77,232,210,.55)"
                strokeWidth="1.5"
                strokeDasharray="2 14"
              />
              <circle cx="200" cy="200" r="120" stroke="rgba(239,214,149,.6)" strokeWidth="2" />
              <polygon points="200,92 292,252 108,252" stroke="rgba(191,240,232,.5)" strokeWidth="1.5" />
              <polygon points="200,308 108,148 292,148" stroke="rgba(191,240,232,.5)" strokeWidth="1.5" />
            </g>
            <circle className="mc-core" cx="200" cy="200" r="54" />
          </svg>
        </div>

        {reveal && (
          <>
            <div className="mc-hub">
              <div className="mc-streaks">
                {STREAKS.map((streak, index) => (
                  <div
                    key={index}
                    className="mc-streak-wrap"
                    style={{ "--mc-a": `${streak.angle}deg` } as CSSProperties}
                  >
                    <div
                      className="mc-streak"
                      style={
                        {
                          "--mc-len": `${streak.len}px`,
                          "--mc-d": `${streak.delay}s`,
                        } as CSSProperties
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mc-hub">
              <div className="mc-word">
                <span className="mc-chance">CHANCE</span>
              </div>
            </div>

            <div className="mc-hub">
              {SPARKS.map((spark, index) => (
                <div
                  key={index}
                  className="mc-spark"
                  style={
                    { "--mc-dx": `${spark.dx}px`, "--mc-dy": `${spark.dy}px` } as CSSProperties
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
