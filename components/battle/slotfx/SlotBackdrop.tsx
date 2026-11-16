"use client";

import { useEffect, useRef } from "react";
import type { SlotTone } from "./slotFxStore";

// PROVISIONAL — see slotFxStore.ts.
//
// Moving backgrounds for the layer: short seamless loops cut from the owner's
// stock footage (tools/slotfx/encode_backdrops.ps1). Plain H.264, no alpha:
// the ones laid over a scene are black-backed and blended with "screen".

const BASE = "/videos/battle-assets/slotfx/";

export const SLOT_BACKDROPS = {
  /** Flying down a tunnel of fire. */
  redTunnel: "slotfx-bg-red-tunnel.v1.mp4",
  /** Red and magenta light bursting from the centre. */
  redBurst: "slotfx-bg-red-burst.v1.mp4",
  /** The same two turned blue, for moments that must not look hot. */
  blueTunnel: "slotfx-bg-blue-tunnel.v1.mp4",
  blueBurst: "slotfx-bg-blue-burst.v1.mp4",
  rainbowRays: "slotfx-bg-rainbow-rays.v1.mp4",
  goldBurst: "slotfx-bg-gold-burst.v1.mp4",
  violetLines: "slotfx-bg-violet-lines.v1.mp4",
  /** White concentration lines on black; blend with "screen". */
  speedLines: "slotfx-speedlines.v1.mp4",
  /** Glass bursting outward on black; blend with "screen". Plays once. */
  glassShatter: "slotfx-glass-shatter.v1.mp4",
} as const;

export type SlotBackdropKind = keyof typeof SLOT_BACKDROPS;

/** The background each colour family of telop plays over. */
export const TONE_BACKDROP: Record<SlotTone, SlotBackdropKind> = {
  fire: "redBurst",
  gold: "goldBurst",
  ice: "violetLines",
  violet: "violetLines",
  rainbow: "rainbowRays",
};

export const slotBackdropSrc = (kind: SlotBackdropKind) => BASE + SLOT_BACKDROPS[kind];

const warmed = new Map<SlotBackdropKind, HTMLVideoElement>();

/** Start buffering these ahead of the moment that shows them. */
export function warmSlotBackdrops(kinds: readonly SlotBackdropKind[]) {
  for (const kind of kinds) {
    if (warmed.has(kind)) continue;
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.src = slotBackdropSrc(kind);
    video.load();
    warmed.set(kind, video);
  }
}

export default function SlotBackdrop({
  kind,
  className = "",
  loop = true,
  rate = 1,
  paused = false,
}: {
  kind: SlotBackdropKind;
  className?: string;
  loop?: boolean;
  rate?: number;
  /** Hold the frame it is on. */
  paused?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // Set by hand: React does not reliably write the muted attribute, and a
    // video that is not muted is refused autoplay.
    video.muted = true;
    video.playbackRate = rate;
    if (paused) video.pause();
    else video.play().catch(() => {});
  }, [kind, rate, paused]);

  return <video ref={ref} className={className} src={slotBackdropSrc(kind)} muted playsInline autoPlay loop={loop} preload="auto" disablePictureInPicture />;
}
