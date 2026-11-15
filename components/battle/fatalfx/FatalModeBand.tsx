"use client";

import { useSyncExternalStore } from "react";
import { isFatalModeActive, subscribeFatalMode } from "@/lib/battle-pixi/state/fatalModeStore";
import FatalBand from "./FatalBand";
import { DEFAULT_FATAL_FX } from "./fatalFxSettings";

const noopSubscribe = () => () => {};

// Dev-only preview: /battle?fatalBand=1 shows the band without entering Fatal Mode.
const getPreview = () =>
  process.env.NODE_ENV !== "production" &&
  new URLSearchParams(window.location.search).get("fatalBand") === "1";

/** The announcement band, shown for as long as the player's Fatal Mode lasts. */
export default function FatalModeBand() {
  const active = useSyncExternalStore(subscribeFatalMode, isFatalModeActive, () => false);
  const preview = useSyncExternalStore(noopSubscribe, getPreview, () => false);
  if (!active && !preview) return null;
  return <FatalBand settings={DEFAULT_FATAL_FX.band} />;
}
