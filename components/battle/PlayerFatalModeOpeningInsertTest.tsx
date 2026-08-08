"use client";

import { useEffect, useRef, useState } from "react";

import {
  getPlayerFatalModeOpeningState,
  hidePlayerFatalModeOpening,
  subscribePlayerFatalModeOpening,
} from "@/lib/battle-pixi/state/playerFatalModeOpeningStore";
import { playSfx } from "@/lib/audio/sfxStore";

import styles from "./PlayerFatalModeOpeningInsertTest.module.css";

// Authored frame sequence (0806), replacing the CSS-composited plate build.
//
// The export ran 180 frames but only the first 47 carry the animation — it
// fades in, holds full-screen, and fades back to fully transparent by 0046.
// Frames 47-179 were one blank image repeated 133 times, so they are not
// shipped: they would have been 133 pointless requests and 4.4s of dead air
// after the insert had already finished.
const FRAME_BASE = "/videos/fatalmode-insert";
const FRAME_COUNT = 47;
const FRAME_RATE = 30;
const FRAME_MS = 1000 / FRAME_RATE;
const DURATION_MS = (FRAME_COUNT / FRAME_RATE) * 1000;

// Frames are authored at exactly the cabinet screen's size, so the canvas is
// 1:1 with the artwork and CSS only has to stretch it to the screen box.
const FRAME_WIDTH = 1250;
const FRAME_HEIGHT = 618;

// Dev preview pacing (`?player-fatal-mode-opening-insert=once|loop`).
const INITIAL_DELAY_MS = 3500;
const LOOP_GAP_MS = 1100;

export type PlayerFatalModeOpeningInsertMode = "once" | "loop" | null;
export type PlayerFatalModeOpeningInsertTone =
  | "white"
  | "blue"
  | "green"
  | "red";

type PlayerFatalModeOpeningInsertTestProps = {
  /**
   * Retained so the dev preview URLs keep working. The sequence is a single
   * authored animation now, so neither of these selects artwork any more.
   */
  cardId?: "R4";
  mode: PlayerFatalModeOpeningInsertMode;
  tone?: PlayerFatalModeOpeningInsertTone;
};

const framePath = (index: number) =>
  `${FRAME_BASE}/${index.toString().padStart(4, "0")}.png`;

/**
 * Decoded frames, kept for the lifetime of the page.
 *
 * The sequence is ~61MB of full-screen RGBA, far too much to fetch at the
 * moment the insert fires — the beat would arrive late every time. So it is
 * warmed once in the background when the battle screen mounts and reused for
 * every later trigger. The promise is the lock: concurrent callers await the
 * same warm-up rather than starting a second one.
 */
let framesPromise: Promise<HTMLImageElement[]> | null = null;

function loadFrames() {
  if (framesPromise) return framesPromise;

  framesPromise = Promise.all(
    Array.from({ length: FRAME_COUNT }, (_, index) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve(image);
        image.onerror = () =>
          reject(new Error(`fatal-mode insert frame missing: ${index}`));
        image.src = framePath(index);
      });
    })
  ).catch((error) => {
    // A failed warm-up must not poison every later attempt.
    framesPromise = null;
    throw error;
  });

  return framesPromise;
}

export default function PlayerFatalModeOpeningInsertTest({
  mode,
}: PlayerFatalModeOpeningInsertTestProps) {
  const [runId, setRunId] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [productionState, setProductionState] = useState(
    getPlayerFatalModeOpeningState()
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return subscribePlayerFatalModeOpening(() => {
      setProductionState(getPlayerFatalModeOpeningState());
    });
  }, []);

  // Warm the sequence as soon as the battle screen is up, so the insert is
  // instant whenever it is eventually won.
  useEffect(() => {
    loadFrames().catch((error) => {
      console.warn("Fatal-mode insert preload failed:", error);
    });
  }, []);

  const active = mode === null ? productionState.active : previewVisible;
  const runKey = mode === null ? productionState.key : runId;

  // Dev preview loop. Production runs are driven by the store instead.
  useEffect(() => {
    if (mode === null) return;

    let clearTimer = 0;
    let nextTimer = 0;
    let cancelled = false;

    const play = () => {
      if (cancelled) return;

      setRunId((current) => current + 1);
      setPreviewVisible(true);

      clearTimer = window.setTimeout(() => {
        setPreviewVisible(false);
        if (mode === "loop") nextTimer = window.setTimeout(play, LOOP_GAP_MS);
      }, DURATION_MS);
    };

    const firstTimer = window.setTimeout(play, INITIAL_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(firstTimer);
      window.clearTimeout(clearTimer);
      window.clearTimeout(nextTimer);
    };
  }, [mode]);

  // Playback. The frame index is derived from elapsed time rather than
  // incremented per tick, so a dropped frame shortens the sequence instead of
  // stretching it — the insert always lands on its authored duration, which is
  // what keeps it locked to the sound effect.
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let raf = 0;
    let startedAt = 0;

    playSfx("fatalModeInsert");

    void loadFrames()
      .then((frames) => {
        if (cancelled) return;

        const context = canvasRef.current?.getContext("2d") ?? null;
        if (!context) return;

        const render = (now: number) => {
          if (cancelled) return;

          if (!startedAt) startedAt = now;

          const index = Math.floor((now - startedAt) / FRAME_MS);

          if (index >= FRAME_COUNT) {
            // The last authored frame is fully transparent, so the insert has
            // already faded out by the time this runs.
            context.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
            if (mode === null) hidePlayerFatalModeOpening();
            return;
          }

          context.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
          context.drawImage(frames[index], 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

          raf = window.requestAnimationFrame(render);
        };

        raf = window.requestAnimationFrame(render);
      })
      .catch((error) => {
        console.warn("Fatal-mode insert failed to play:", error);
        // Never leave the insert stuck on screen because artwork failed.
        if (mode === null) hidePlayerFatalModeOpening();
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [active, runKey, mode]);

  if (!active) return null;

  return (
    <div
      key={runKey}
      aria-label="Destiny Battle player Fatal Mode opening"
      className={styles.overlay}
      data-player-fatal-mode-opening-frame-count={FRAME_COUNT}
      data-player-fatal-mode-opening-frame-rate={FRAME_RATE}
      data-player-fatal-mode-opening-insert={mode ?? "production"}
      data-player-fatal-mode-opening-version="authored-sequence-0806"
      role="img"
    >
      <canvas
        className={styles.sequenceCanvas}
        height={FRAME_HEIGHT}
        ref={canvasRef}
        width={FRAME_WIDTH}
      />
    </div>
  );
}
