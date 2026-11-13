"use client";

import { useEffect, useRef } from "react";
import { mountCabinetTable3D, type CabinetTable3D as Table } from "@/lib/table-3d/cabinetTable3D";

/**
 * The card table drawn as three.js geometry instead of the baked
 * card-table-premium-three-bay image (trial, development only).
 *
 * It mounts inside .bcab-card-table, underneath the Pixi canvas, so the cards
 * keep being drawn by Pixi on top. The bays are solved to the same screen
 * positions the baked art had, so nothing the cards do has to move.
 *
 * QA hook: window.__cabinetTable.flipSlot(0..2) turns a bay over.
 */
export default function CabinetTable3D() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const table = mountCabinetTable3D(el);
    (window as unknown as { __cabinetTable?: Table }).__cabinetTable = table;
    return () => {
      delete (window as unknown as { __cabinetTable?: Table }).__cabinetTable;
      table.dispose();
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
      style={{ position: "absolute", inset: 0, zIndex: 0, borderRadius: 8, overflow: "hidden" }}
    />
  );
}
