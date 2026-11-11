"use client";

import { useEffect, useRef, useState } from "react";
import { mountDrawButton3D, type DrawButton3D, type LampState } from "@/lib/button-3d/runtime";

/**
 * three.js DRAW push button drawn inside the cabinet's DOM DRAW button (trial fit, 2026-11-11).
 * Purely visual: the parent <button> keeps every click/lock rule; this only mirrors them.
 * - lamp: gray (ready) / sky (cards set, waiting for the deal press) / off (locked or dealing)
 * - pressTick: increment to play the press travel
 */
export default function DrawButton3DMount({ lamp, pressTick }: { lamp: LampState; pressTick: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [button, setButton] = useState<DrawButton3D | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const b = mountDrawButton3D(host.current, { lighting: "window", distance: 6.1 });
    b.setSound(false); // the game plays its own button sound
    setButton(b);
    // QA hook: lets headless capture show each lamp state in place.
    (window as unknown as { __drawButton3d?: DrawButton3D }).__drawButton3d = b;
    return () => { b.dispose(); setButton(null); };
  }, []);

  useEffect(() => { button?.setLamp(lamp); }, [button, lamp]);
  useEffect(() => { if (pressTick > 0) button?.press(); }, [button, pressTick]);

  return <div ref={host} className="bcab-draw-3d" aria-hidden="true" />;
}
