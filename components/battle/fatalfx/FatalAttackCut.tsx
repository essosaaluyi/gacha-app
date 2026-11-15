"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSfxMuted } from "@/lib/audio/sfxStore";
import {
  getFatalAttackCutSources,
  getFatalAttackCutState,
  hideFatalAttackCut,
  playFatalAttackCut,
  subscribeFatalAttackCut,
} from "@/lib/battle-pixi/state/fatalAttackCutStore";
import { isFatalModeActive, subscribeFatalMode } from "@/lib/battle-pixi/state/fatalModeStore";
import styles from "./FatalAttackCut.module.css";

const PREVIEW_SOURCES: Record<string, string> = {
  "1": "/videos/battle-assets/fatal-attack/r1a1.v1.mp4",
  "2": "/videos/battle-assets/fatal-attack/r1a2.v1.mp4",
};

const previewParam = () =>
  process.env.NODE_ENV === "production" ? null : new URLSearchParams(window.location.search).get("fatalAttackCut");

/**
 * Full-screen attack movie for the player's Fatal Mode draws.
 *
 * The cabinet stays playable underneath: the next draw cuts to the next scene.
 * If the movie runs out first it holds on its last frame, with soft-focus
 * edges, concentration lines and a small breathing zoom, until that draw.
 */
export default function FatalAttackCut() {
  const cut = useSyncExternalStore(subscribeFatalAttackCut, getFatalAttackCutState, getFatalAttackCutState);
  const fatalActive = useSyncExternalStore(subscribeFatalMode, isFatalModeActive, () => false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visibleKey, setVisibleKey] = useState(0);
  const [frozenKey, setFrozenKey] = useState(0);

  // Buffer the movies as soon as Fatal Mode begins, so the first frame is
  // ready by the time a draw asks for it.
  useEffect(() => {
    if (!fatalActive) return;
    const warmers = getFatalAttackCutSources().map((src) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.src = src;
      video.load();
      return video;
    });
    return () => warmers.forEach((video) => { video.removeAttribute("src"); video.load(); });
  }, [fatalActive]);

  // Dev-only preview: /battle?fatalAttackCut=1 (or 2) plays the movie once.
  useEffect(() => {
    const src = PREVIEW_SOURCES[previewParam() ?? ""];
    if (!src) return;
    const timer = window.setTimeout(() => playFatalAttackCut(src), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  // Fatal Mode over: nothing of it stays on screen.
  useEffect(() => {
    if (!fatalActive && !previewParam()) hideFatalAttackCut();
  }, [fatalActive]);

  // The shutter lead: the movie appears only once its delay has run out.
  useEffect(() => {
    if (!cut.active) return;
    const timer = window.setTimeout(() => setVisibleKey(cut.key), cut.delayMs);
    return () => window.clearTimeout(timer);
  }, [cut.active, cut.key, cut.delayMs]);

  const showing = cut.active && visibleKey === cut.key && cut.src !== null;

  useEffect(() => {
    const video = videoRef.current;
    if (!showing || !video) return;
    video.muted = getSfxMuted();
    video.currentTime = 0;
    // Autoplay can still be refused with sound; fall back to a silent run
    // rather than leaving a frozen first frame over the battle.
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(hideFatalAttackCut);
    });
  }, [showing]);

  if (!showing || !cut.src) return null;

  return (
    <div key={cut.key} className={styles.root} data-frozen={frozenKey === cut.key}>
      <video
        ref={videoRef}
        className={styles.video}
        src={cut.src}
        playsInline
        preload="auto"
        aria-label="Fatal Mode attack movie"
        onEnded={() => setFrozenKey(cut.key)}
        onError={hideFatalAttackCut}
      />
      <div className={styles.blur} aria-hidden="true" />
      <div className={styles.lines} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
    </div>
  );
}
