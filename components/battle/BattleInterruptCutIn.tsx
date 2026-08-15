"use client";

import type { CSSProperties } from "react";

type BattleInterruptCutInProps = {
  /** Character art shown inside the split. Falls back to a placeholder band. */
  asset?: string;
  /** Screen-reader text only; nothing is drawn over the art. */
  label?: string;
  /** Edge line / glow colour. */
  accent?: string;
  /** Height of the revealed band, as a percent of the stage (default 46). */
  bandPercent?: number;
  /** Framing knobs: composed with the push animation. */
  artScale?: number;
  artOffsetX?: string;
  artOffsetY?: string;
  artFit?: "cover" | "contain";
  durationMs: number;
};

export default function BattleInterruptCutIn({
  asset,
  label,
  accent = "rgba(255,255,255,0.95)",
  bandPercent,
  artScale,
  artOffsetX,
  artOffsetY,
  artFit,
  durationMs,
}: BattleInterruptCutInProps) {
  return (
    <div
      className="battle-interrupt-cut-in"
      style={
        {
          "--bicut-dur": `${durationMs}ms`,
          "--bicut-accent": accent,
          ...(bandPercent != null ? { "--bicut-band-pct": bandPercent } : {}),
          ...(artScale != null ? { "--bicut-art-scale": artScale } : {}),
          ...(artOffsetX ? { "--bicut-art-x": artOffsetX } : {}),
          ...(artOffsetY ? { "--bicut-art-y": artOffsetY } : {}),
          ...(artFit ? { "--bicut-art-fit": artFit } : {}),
        } as CSSProperties
      }
    >
      <div className="bicut-flash" />

      <div className="bicut-band">
        <div className="bicut-window">
          {asset ? (
            <img className="bicut-art" src={asset} alt="" />
          ) : (
            <div className="bicut-art bicut-art-placeholder" />
          )}
        </div>
      </div>

      <div className="bicut-edge bicut-edge-top" />
      <div className="bicut-edge bicut-edge-bottom" />

      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}
