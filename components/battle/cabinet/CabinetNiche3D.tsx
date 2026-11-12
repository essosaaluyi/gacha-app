"use client";

import { useEffect, useRef, useState } from "react";
import type { LampState } from "@/lib/button-3d/runtime";
import { mountCabinetNiche, type CabinetNiche3D as Niche, type NicheLayout, type NicheRect } from "@/lib/button-3d/cabinetNiche";

/**
 * The upper-right control panel drawn as one recessed three.js niche (trial, development only).
 * Visual only: the panel's DOM buttons stay the hit areas and are moved onto the 3D controls.
 * - drawLamp / drawPressTick mirror the DRAW button; autoOn throws the AUTO lever.
 * - DATA COUNTER presses are picked up from its own DOM button.
 */
export default function CabinetNiche3D({ drawLamp, drawPressTick, autoOn }: { drawLamp: LampState; drawPressTick: number; autoOn: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [niche, setNiche] = useState<Niche | null>(null);

  useEffect(() => {
    const el = host.current, panel = el?.parentElement;
    if (!el || !panel) return;
    const place = (selector: string, r: NicheRect) => {
      const b = panel.querySelector<HTMLElement>(selector);
      if (!b) return;
      Object.assign(b.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, minHeight: "0", bottom: "auto", right: "auto" });
    };
    let layout: NicheLayout | null = null;
    const apply = () => { if (!layout) return; place(".bcab-draw-btn", layout.draw); place(".bcab-auto", layout.auto); place(".bcab-data-btn", layout.data); };
    // Owner pick (2026-11-11): variant D — lit sign, chrome tray. The back-wall DESTINY WARS was
    // dropped on 2026-11-12 (it collided with the AUTO plate), and on the same day the dark pocket
    // became a bright cream shelf (variant E) so the controls stop looking like they float.
    const n = mountCabinetNiche(el, { variant: { sign: true, logo: "none", tray: true, shelf: true }, onLayout: (l) => { layout = l; apply(); } });
    // Panel controls mount after this (DATA COUNTER renders once its store is ready): re-place on change.
    const mo = new MutationObserver(apply); mo.observe(panel, { childList: true, subtree: true });
    const onDown = (e: PointerEvent) => { if ((e.target as Element | null)?.closest(".bcab-data-btn")) n.pressData(); };
    panel.addEventListener("pointerdown", onDown);
    (window as unknown as { __cabinetNiche?: Niche }).__cabinetNiche = n; // QA hook (dev only)
    setNiche(n);
    return () => { mo.disconnect(); panel.removeEventListener("pointerdown", onDown); n.dispose(); setNiche(null); };
  }, []);

  useEffect(() => { niche?.setDrawLamp(drawLamp); }, [niche, drawLamp]);
  useEffect(() => { if (drawPressTick > 0) niche?.pressDraw(); }, [niche, drawPressTick]);
  useEffect(() => { niche?.setAuto(autoOn); }, [niche, autoOn]);

  return <div ref={host} className="bcab-niche-canvas" aria-hidden="true" />;
}
