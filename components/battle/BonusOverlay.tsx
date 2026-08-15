"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  enterBonusFreeze,
  enterBonusOpeningMax,
  finishActiveBonusRevealVideo,
  finishBonusOpeningPresentation,
  getBonusOpeningVideo,
  getBonusPresentationState,
  subscribeBonusPresentation,
} from "@/lib/battle-pixi/state/bonusPresentationStore";
import { playSfx } from "@/lib/audio/sfxStore";
import { patchConfig } from "@/lib/game-config/patchConfig";
import BattleDigitStrip from "./BattleDigitStrip";
import {
  beginSuperBonusBlackout,
  beginSuperMaxBlackout,
  finishSuperBonusBlackout,
} from "@/lib/battle-pixi/state/cabinetSignalStore";
import { cabinetSignalConfig } from "@/lib/game-config/cabinetSignalConfig";

type SafeCompletionVideoProps = {
  src: string;
  completionKey: string;
  onComplete: () => void;
};

function SafeCompletionVideo({
  src,
  completionKey,
  onComplete,
}: SafeCompletionVideoProps) {
  const completedRef = useRef(false);
  const fallbackRef = useRef<number | null>(null);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (fallbackRef.current) window.clearTimeout(fallbackRef.current);
    fallbackRef.current = null;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    completedRef.current = false;
    fallbackRef.current = window.setTimeout(complete, 15_000);
    return () => {
      if (fallbackRef.current) window.clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    };
  }, [completionKey, complete]);

  return (
    <video
      key={completionKey}
      src={src}
      autoPlay
      muted
      playsInline
      preload="auto"
      onEnded={complete}
      onError={complete}
      onLoadedMetadata={(event) => {
        const durationMs = event.currentTarget.duration * 1000;
        if (!Number.isFinite(durationMs) || durationMs <= 0) return;
        if (fallbackRef.current) window.clearTimeout(fallbackRef.current);
        fallbackRef.current = window.setTimeout(
          complete,
          Math.min(30_000, Math.max(2_000, durationMs + 1_200))
        );
      }}
      style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.035)" }}
    >
      Your browser does not support battle videos.
    </video>
  );
}

export default function BonusOverlay() {
  const [state, setState] = useState(getBonusPresentationState());
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPreview = pathname === "/battle-sim" && searchParams.get("preview") === "bonus";
  const bonusPoints = isPreview ? 12345 : state.bonusResultPoints;

  useEffect(() => subscribeBonusPresentation(() => setState(getBonusPresentationState())), []);

  const finishOpening = useCallback(() => {
    finishSuperBonusBlackout();
    finishBonusOpeningPresentation();
  }, []);
  const finishReveal = useCallback(() => finishActiveBonusRevealVideo(), []);

  // Same identity the reveal <video> remounts on, so the cue fires once per
  // reveal — including repeats of the same clip, which bump revealKey.
  const revealCue = state.activeRevealVideo
    ? `${state.activeRevealVideo}-${state.revealKey}`
    : null;

  useEffect(() => {
    if (!revealCue) return;
    playSfx("chestOpenPoint");
  }, [revealCue]);

  // Freeze scheduler.
  //
  // A super max opens on a regular/super clip and the freeze cuts into it at
  // any random point after `minMs`. The upper bound is not configured: it is
  // whatever the clip actually playing allows (its duration minus the tail
  // guard), so the freeze uses the full length of a long opening and still
  // always fires on a short one.
  useEffect(() => {
    if (!state.bonusOpeningVisible) return;
    if (state.bonusOpeningType !== "superMax") return;
    if (state.bonusOpeningStage !== "main") return;

    const { minMs, tailGuardMs } = patchConfig.bonusType.freeze;

    let timer = 0;
    let cancelled = false;

    // Duration is only known once the clip reports it, so the roll waits for
    // metadata rather than guessing a length.
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = getBonusOpeningVideo();

    const schedule = (durationMs: number | null) => {
      if (cancelled) return;

      // Unknown duration: fire at the floor rather than risk a cut that never
      // lands, since a missed freeze would strand a super max on its cover.
      const latest =
        durationMs === null ? minMs : Math.max(minMs, durationMs - tailGuardMs);

      timer = window.setTimeout(() => {
        beginSuperMaxBlackout();
        enterBonusFreeze();
      }, minMs + Math.random() * (latest - minMs));
    };

    probe.onloadedmetadata = () => {
      const ms = probe.duration * 1000;
      schedule(Number.isFinite(ms) && ms > 0 ? ms : null);
    };
    probe.onerror = () => schedule(null);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      probe.onloadedmetadata = null;
      probe.onerror = null;
    };
  }, [
    state.bonusOpeningVisible,
    state.bonusOpeningType,
    state.bonusOpeningStage,
  ]);

  // Super Bonus has one 50% blackout roll per opening. When selected, it may
  // begin at any point in the opening clip and remains dark until that clip
  // completes. Super MAX is handled by the freeze scheduler above.
  useEffect(() => {
    if (!state.bonusOpeningVisible) return;
    if (state.bonusOpeningType !== "super") return;
    if (state.bonusOpeningStage !== "main") return;
    if (Math.random() >= cabinetSignalConfig.superBonusBlackout.chance) return;

    let timer = 0;
    let cancelled = false;
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = getBonusOpeningVideo();

    const schedule = (durationMs: number) => {
      if (cancelled) return;
      timer = window.setTimeout(
        beginSuperBonusBlackout,
        Math.random() * Math.max(0, durationMs - 250)
      );
    };

    probe.onloadedmetadata = () => {
      const durationMs = probe.duration * 1000;
      schedule(Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 4000);
    };
    probe.onerror = () => schedule(4000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      probe.onloadedmetadata = null;
      probe.onerror = null;
    };
  }, [
    state.bonusOpeningVisible,
    state.bonusOpeningType,
    state.bonusOpeningStage,
  ]);

  useEffect(() => {
    const skipBonusVideo = () => {
      if (state.activeRevealVideo) {
        finishReveal();
      } else if (state.bonusOpeningVisible) {
        finishOpening();
      }
    };

    window.addEventListener("battle:skip-bonus-video", skipBonusVideo);
    return () => window.removeEventListener("battle:skip-bonus-video", skipBonusVideo);
  }, [finishOpening, finishReveal, state.activeRevealVideo, state.bonusOpeningVisible]);

  if (!state.bonusOverlayVisible && !isPreview) return null;

  return (
    <div
      className="bonus-presentation-layer"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9998,
        pointerEvents: state.bonusResultVisible && !isPreview ? "auto" : "none",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {state.bonusOpeningVisible && (
        <SafeCompletionVideo
          src={getBonusOpeningVideo()}
          // Remounts the <video> at each stage, which is what makes the freeze
          // cut in over the running opening rather than queue behind it.
          completionKey={`bonus-opening-${state.bonusOpeningStage}`}
          onComplete={
            state.bonusOpeningStage === "freeze"
              ? enterBonusOpeningMax
              : finishOpening
          }
        />
      )}

      {state.bonusGameText && (
        <div className="bonus-game-banner">{state.bonusGameText}</div>
      )}

      {state.activeRevealVideo && (
        <SafeCompletionVideo
          src={state.activeRevealVideo}
          completionKey={`${state.activeRevealVideo}-${state.revealKey}`}
          onComplete={finishReveal}
        />
      )}

      {(state.bonusResultVisible || isPreview) && (
        <div className="bonus-result-overlay" role="status" aria-live="polite">
          <div className="bonus-result-plaque">
            <img className="bonus-result-plaque-frame" src="/images/battle-ui/production/v1/transparent/bonus-total-plaque-frame-v1.png" alt="" />
            <div className="bonus-result-plaque-content">
              <p className="bonus-result-heading">Total Bonus Points</p>
              <div className="bonus-result-total" aria-label={`${bonusPoints} bonus points`}>
                <BattleDigitStrip value={bonusPoints} style="jackpot-relic" />
                <small>P</small>
              </div>
              {/* The total is already shown large above; repeating it here
                  just duplicated the same number on one screen. */}
              <div className="bonus-result-confirmation">
                <span>Collection ready</span>
                {!isPreview && (
                  <button
                    type="button"
                    className="bonus-result-continue"
                    onClick={() => window.dispatchEvent(new Event("battle:confirm-bonus-result"))}
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
