"use client";

// Feature 3: the screen-crack / glitch reveal that flips a presented
// failure into the winning title. Pure CSS/DOM overlay — no Pixi.

import { useEffect, useState } from "react";

import {
  finishResurrectionReveal,
  getResurrectionPhase,
  subscribeResurrection,
} from "@/lib/battle-pixi/state/resurrectionStore";
import { startFatalMode } from "@/lib/battle-pixi/state/fatalModeStore";
import { addBattleLog } from "@/lib/battle-pixi/state/battleLogStore";

const SHARD_COUNT = 8;
const REVEAL_TOTAL_MS = 3200;

export default function ResurrectionOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      const phase = getResurrectionPhase();

      if (phase === "revealing" && !visible) {
        setVisible(true);
      }
    };

    sync();
    return subscribeResurrection(sync);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const timer = window.setTimeout(() => {
      setVisible(false);
      finishResurrectionReveal();

      addBattleLog("REVERSAL! The attack had succeeded!", "success");
      startFatalMode();
      addBattleLog("Player Fatal Mode Started!", "success");
    }, REVEAL_TOTAL_MS);

    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="resurrection-overlay" aria-hidden="true">
      <div className="resurrection-glitch-pane" />

      {Array.from({ length: SHARD_COUNT }, (_, index) => (
        <div
          key={index}
          className="resurrection-shard"
          style={{ "--shard-i": index } as React.CSSProperties}
        />
      ))}

      <div className="resurrection-flash" />

      <div className="resurrection-title">
        <span className="resurrection-title-jp">逆転</span>
        <span className="resurrection-title-en">REVERSAL!</span>
      </div>
    </div>
  );
}
