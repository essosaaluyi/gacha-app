"use client";

import { useEffect, useRef, useState } from "react";
import type { LampState } from "@/lib/button-3d/runtime";
import { mountCabinetPanelB3, type CabinetPanelB3 as Niche, type PanelB3Layout, type PanelRect } from "@/lib/button-3d/cabinetPanelB3";

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
    const place = (selector: string, r: PanelRect) => {
      const b = panel.querySelector<HTMLElement>(selector);
      if (!b) return;
      Object.assign(b.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, minHeight: "0", bottom: "auto", right: "auto" });
    };
    let layout: PanelB3Layout | null = null;
    const apply = () => {
      if (!layout) return;
      place(".bcab-draw-btn", layout.draw); place(".bcab-auto", layout.auto); place(".bcab-data-btn", layout.data);
      // B3 puts a speaker grille where the battle log ticker used to sit, so the ticker moves into
      // the grille opening and reads as the display behind the mesh (deviation noted in the spec).
      place(".bcab-ticker", layout.log);
    };
    // Owner handoff 2026-11-12 (outputs/cabinet-b3-modeling/B3-CGI-handoff.zip): the panel is rebuilt
    // to the B3 design — brass surround, lit DATA sign, AUTO slide knob, black V face with brass
    // inlays, DRAW in the middle, speaker grille at the foot. The older niche variants (dark pocket,
    // cream shelf) stay in lib/button-3d/cabinetNiche.ts and are still reachable from the lab page.
    const n = mountCabinetPanelB3(el, { onLayout: (l) => { layout = l; apply(); } });
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
