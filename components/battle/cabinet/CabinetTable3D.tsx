"use client";

import { useEffect, useRef } from "react";
import { mountCabinetTable3D, type CabinetTable3D as Table } from "@/lib/table-3d/cabinetTable3D";
import { setCabinetTable3D } from "@/lib/table-3d/tableBridge";

/**
 * The card table drawn as three.js geometry instead of the baked
 * card-table-premium-three-bay image (trial, development only).
 *
 * It mounts inside .bcab-card-table, underneath the Pixi canvas, so the cards
 * keep being drawn by Pixi on top. The bays are solved to the same screen
 * positions the baked art had, so nothing the cards do has to move.
 *
 * The baked image is only taken away once a frame has actually been drawn, and
 * is left alone if the mount throws — a table that fails to start has to leave
 * the painted one showing rather than a hole.
 *
 * QA hooks: window.__cabinetTable.flipSlot(0..2) turns a bay over;
 * setSlotHighlight(i, 0x9fd8ff, 1) lights one frame.
 */
export default function CabinetTable3D() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const painted = el.parentElement;
    let table: Table | null = null;
    try {
      table = mountCabinetTable3D(el, {
        onFirstFrame: () => {
          if (painted) painted.style.backgroundImage = "none";
        },
      });
    } catch (error) {
      console.error("[cabinet-table-3d] mount failed; keeping the baked table", error);
      return;
    }
    setCabinetTable3D(table);
    (window as unknown as { __cabinetTable?: Table }).__cabinetTable = table;
    return () => {
      setCabinetTable3D(null);
      delete (window as unknown as { __cabinetTable?: Table }).__cabinetTable;
      if (painted) painted.style.removeProperty("background-image");
      table?.dispose();
    };
  }, []);

  // Styled here rather than in globals.css. The mount is self-contained —
  // a positioned box for the canvas to fill — and keeping it out of the
  // stylesheet also keeps it clear of Turbopack's intermittently stale CSS.
  return (
    <div
      ref={host}
      className="bcab-table-3d"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        borderRadius: 8,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    />
  );
}
