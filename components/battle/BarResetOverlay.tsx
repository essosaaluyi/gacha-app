"use client";

// "Reset chance" indicator for the bonus BAR mechanic. Shows a BAR symbol
// with animated left arrows so the player reads the reset tension while the
// cards flip. Pure DOM/CSS overlay — no Pixi.

import { useEffect, useState } from "react";

import {
  getBarResetTensionState,
  hideBarResetTension,
  subscribeBarResetTension,
} from "@/lib/battle-pixi/state/barResetTensionStore";

const VISIBLE_MS = 3600;

export default function BarResetOverlay() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"real" | "fake">("real");
  const [token, setToken] = useState(0);

  useEffect(() => {
    const sync = () => {
      const state = getBarResetTensionState();
      if (state.active) {
        setMode(state.mode);
        setToken(state.token);
        setVisible(true);
      }
    };

    sync();
    return subscribeBarResetTension(sync);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const timer = window.setTimeout(() => {
      setVisible(false);
      hideBarResetTension();
    }, VISIBLE_MS);

    return () => window.clearTimeout(timer);
  }, [visible, token]);

  if (!visible) return null;

  return (
    <div
      key={token}
      className={`bar-reset-overlay bar-reset-overlay-${mode}`}
      aria-hidden="true"
    >
      <div className="bar-reset-banner">
        <span className="bar-reset-arrows">
          <span>◄</span>
          <span>◄</span>
          <span>◄</span>
        </span>
        <img
          className="bar-reset-symbol"
          src="/images/battle-symbols/bar.webp"
          alt=""
        />
        <span className="bar-reset-text">RESET CHANCE</span>
      </div>
    </div>
  );
}
