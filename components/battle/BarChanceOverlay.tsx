"use client";

import { useEffect, useRef, useState } from "react";

import {
  beginBarChanceFreeze,
  finishBarChanceFreeze,
  getBarChanceState,
  subscribeBarChance,
} from "@/lib/battle-pixi/state/barChanceStore";
import {
  getBgmVolume,
  setBgmVolume,
} from "@/lib/audio/bgmStore";
import { playSfx } from "@/lib/audio/sfxStore";
import { setBattlePresentationPhase } from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import { beginSuperMaxBlackout } from "@/lib/battle-pixi/state/cabinetSignalStore";

const DISTORTION_MS = 400;

export default function BarChanceOverlay() {
  const [state, setState] = useState(getBarChanceState());
  const unduckedVolume = useRef<number | null>(null);

  useEffect(
    () => subscribeBarChance(() => setState(getBarChanceState())),
    []
  );

  const cutInOwnsScreen =
    state.phase === "active" ||
    state.phase === "failure" ||
    state.phase === "success" ||
    state.phase === "distortion" ||
    state.phase === "freeze";

  useEffect(() => {
    if (cutInOwnsScreen && unduckedVolume.current === null) {
      const current = getBgmVolume();
      unduckedVolume.current = current;
      setBgmVolume(current * 0.75);
      return;
    }

    if (!cutInOwnsScreen && unduckedVolume.current !== null) {
      setBgmVolume(unduckedVolume.current);
      unduckedVolume.current = null;
    }
  }, [cutInOwnsScreen]);

  useEffect(() => {
    if (state.phase !== "distortion") return;
    const timer = window.setTimeout(() => {
      if (state.bonusType === "superMax") beginSuperMaxBlackout();
      beginBarChanceFreeze();
      playSfx("freeze");
    }, DISTORTION_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.token, state.bonusType]);

  useEffect(() => {
    return () => {
      if (unduckedVolume.current !== null) {
        setBgmVolume(unduckedVolume.current);
      }
    };
  }, []);

  if (!cutInOwnsScreen) return null;

  if (state.phase === "freeze") {
    return (
      <div className="bar-chance-layer bar-chance-freeze" aria-hidden="true">
        <video
          src="/videos/openings/freeze.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => {
            finishBarChanceFreeze();
            setBattlePresentationPhase(
              "next_round_ready",
              "bar-chance-freeze-complete"
            );
          }}
          onError={() => {
            finishBarChanceFreeze();
            setBattlePresentationPhase(
              "next_round_ready",
              "bar-chance-freeze-error"
            );
          }}
        />
      </div>
    );
  }

  const commandVisible = state.phase === "active";
  const successVisible =
    state.phase === "success" || state.phase === "distortion";

  return (
    <div
      key={state.token}
      className={`bar-chance-layer bar-chance-tone-${state.tone} bar-chance-phase-${state.phase}`}
      aria-hidden="true"
    >
      <div className="bar-chance-stream" />
      <div
        className="bar-chance-character"
        style={{
          backgroundImage: `url("${state.characterImage}")`,
          transform: `scale(${1.02 + state.revealedBars * 0.045})`,
        }}
      />

      {commandVisible && (
        <div className="bar-chance-command">
          <span className="bar-chance-chevrons" aria-hidden="true">
            <span>◀</span><span>◀</span><span>◀</span>
          </span>
          <span className="bar-chance-command-text">BAR CHANCE</span>
        </div>
      )}

      {successVisible && (
        <div className="bar-chance-success-mark">
          <img src="/images/battle-symbols/bar.webp" alt="" />
        </div>
      )}

      {state.phase === "failure" && <div className="bar-chance-failure-dim" />}
      {state.phase === "distortion" && <div className="bar-chance-distortion" />}
    </div>
  );
}
