"use client";

import { useSyncExternalStore } from "react";
import { isFatalModeWindowOpen, subscribeFatalModeWindow } from "@/lib/battle-pixi/state/fatalModeWindowStore";
import FatalBand from "./FatalBand";
import { DEFAULT_FATAL_FX } from "./fatalFxSettings";

const noopSubscribe = () => () => {};

// Dev-only preview: /battle?fatalBand=1 shows the band without entering Fatal Mode.
const getPreview = () =>
  process.env.NODE_ENV !== "production" &&
  new URLSearchParams(window.location.search).get("fatalBand") === "1";

/**
 * The announcement band. It runs for the whole of the player's Fatal Mode and
 * stays through the final draw until that hand's result has been shown.
 */
export default function FatalModeBand() {
  const active = useSyncExternalStore(subscribeFatalModeWindow, isFatalModeWindowOpen, () => false);
  const preview = useSyncExternalStore(noopSubscribe, getPreview, () => false);
  if (!active && !preview) return null;
  // Over the attack movie (9995), behind the silver shutter insert (9997).
  return <FatalBand settings={DEFAULT_FATAL_FX.band} zIndex={9996} />;
}
