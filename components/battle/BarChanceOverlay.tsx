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
import { battleSymbolFaceClipPath, battleSymbolImage } from "@/lib/battle-pixi/presentation/battleSymbolImages";
import { setBattlePresentationPhase } from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import { beginSuperMaxBlackout } from "@/lib/battle-pixi/state/cabinetSignalStore";
import { warmSlotBackdrops } from "@/components/battle/slotfx/SlotBackdrop";
import {
  SLOT_BAR_CHANCE_BACKDROPS,
  SlotBarChanceBackdrop,
  SlotBarChanceBlackout,
  SlotBarChanceCommand,
  slotBarChanceClass,
} from "@/components/battle/slotfx/SlotBarChance";
import { SLOT_FX } from "@/components/battle/slotfx/slotFxStore";

const DISTORTION_MS = 400;
/** The glow round the BAR mark, as `.bar-chance-success-mark img` had it. */
const BAR_MARK_GLOW = "drop-shadow(0 0 16px rgba(255,255,255,.95)) drop-shadow(0 0 34px rgba(255,190,54,.9))";
// PROVISIONAL: the slot-style dressing ("BARを狙え！") in place of the striped
// background and the caption. Off, the overlay draws as it always has.
const SLOT_DRESSING = SLOT_FX.enabled && SLOT_FX.barChance;

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
    if (SLOT_DRESSING) warmSlotBackdrops(SLOT_BAR_CHANCE_BACKDROPS);
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
      className={`bar-chance-layer bar-chance-tone-${state.tone} bar-chance-phase-${state.phase}${SLOT_DRESSING ? ` ${slotBarChanceClass.layer}` : ""}`}
      aria-hidden="true"
    >
      {SLOT_DRESSING ? (
        <SlotBarChanceBackdrop tone={state.tone} bars={state.revealedBars} />
      ) : (
        <div className="bar-chance-stream" />
      )}
      <div
        className={`bar-chance-character${SLOT_DRESSING ? ` ${slotBarChanceClass.character}` : ""}`}
        style={{
          backgroundImage: `url("${state.characterImage}")`,
          transform: `scale(${1.02 + state.revealedBars * 0.045})`,
        }}
      />

      {commandVisible && SLOT_DRESSING && (
        <SlotBarChanceCommand bars={state.revealedBars} />
      )}

      {commandVisible && !SLOT_DRESSING && (
        <div className="bar-chance-command">
          <span className="bar-chance-chevrons" aria-hidden="true">
            <span>◀</span><span>◀</span><span>◀</span>
          </span>
          <span className="bar-chance-command-text">BAR CHANCE</span>
        </div>
      )}

      {/* PROVISIONAL (owner, 2026-11-18: the BAR presentation is not yet
          directed). The face the table cards wear, not the old square art,
          whose black ground showed as a box round the card, and cut to its
          silver frame as they are, with no black rim. That face is upright,
          so it is sized by the screen's height (a definite row lets the
          percentage resolve) or its foot would run off the screen. The glow
          is thrown by the holder: on the picture itself the cut would clip
          it away. */}
      {successVisible && (
        <div className="bar-chance-success-mark" style={{ gridTemplateRows: "100%" }}>
          <span style={{ display: "block", height: "84%", filter: BAR_MARK_GLOW }}>
            <img
              src={battleSymbolImage("Bar")}
              alt=""
              style={{ width: "auto", height: "100%", maxHeight: "none", filter: "none", clipPath: battleSymbolFaceClipPath("Bar") }}
            />
          </span>
        </div>
      )}

      {state.phase === "failure" &&
        (SLOT_DRESSING ? <SlotBarChanceBlackout /> : <div className="bar-chance-failure-dim" />)}
      {state.phase === "distortion" && <div className="bar-chance-distortion" />}
    </div>
  );
}
