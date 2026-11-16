"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useCabinetPlace } from "./SlotCabinetLights";
import { SLOT_FX } from "./slotFxStore";
import css from "./SlotCardImpact.module.css";

// PROVISIONAL — see slotFxStore.ts.
//
// What a card does to the table as it is set down: lightning, wind, smoke or a
// shockwave, by what the card is. Drawn on the cabinet over the table, where
// the stage says the card landed. Decoration only: it reads the landing the
// stage already announces and changes nothing.

/** The Pixi stage the table cards are drawn on. */
const STAGE_W = 1200;
const STAGE_H = 500;
const LIFE_MS = 950;

type Kind = "lightning" | "wind" | "smoke" | "shock";

/** What each card brings down with it, and in what colour. */
const IMPACT: Record<string, { kinds: Kind[]; colour: string }> = {
  Attack: { kinds: ["lightning", "shock"], colour: "#ff5a2e" },
  Defense: { kinds: ["shock", "wind"], colour: "#5fc8ff" },
  Coin: { kinds: ["shock", "smoke"], colour: "#ffc94a" },
  Reply: { kinds: ["wind", "smoke"], colour: "#b77bff" },
  Bar: { kinds: ["lightning", "shock"], colour: "#ffd86a" },
  Chance: { kinds: ["lightning", "wind", "shock"], colour: "#ff6fd0" },
  Empty: { kinds: ["smoke"], colour: "#aeb9c9" },
};

/** Two forks of a bolt, drawn in a 120 x 300 box that ends on the card. */
const BOLTS = [
  "M64 0 L48 62 L70 70 L40 138 L66 146 L52 214 L74 222 L60 300",
  "M40 138 L18 176 L30 182 L8 232",
  "M66 146 L96 188 L84 196 L108 250",
];

type Impact = { key: number; x: number; y: number; symbol: string };
type Landed = { symbol?: string; stage?: { x: number; y: number } };

export default function SlotCardImpact() {
  const { place, anchor } = useCabinetPlace();
  const [impacts, setImpacts] = useState<Impact[]>([]);

  useEffect(() => {
    if (!place || !SLOT_FX.enabled || !SLOT_FX.cardImpact) return;
    let key = 0;
    const timers = new Set<number>();
    const onLanded = (event: Event) => {
      const { symbol = "Empty", stage } = (event as CustomEvent<Landed>).detail ?? {};
      const mount = document.querySelector<HTMLElement>(".bcab-pixi-mount");
      if (!stage || !mount) return;
      // From the table's own pixels to the cabinet's, by way of the page.
      const table = mount.getBoundingClientRect();
      const cabinet = place.stage.getBoundingClientRect();
      if (cabinet.width === 0) return;
      const scale = place.stage.offsetWidth / cabinet.width;
      key += 1;
      const impact: Impact = {
        key,
        symbol,
        x: (table.left + (stage.x / STAGE_W) * table.width - cabinet.left) * scale,
        y: (table.top + (stage.y / STAGE_H) * table.height - cabinet.top) * scale,
      };
      setImpacts((list) => [...list, impact]);
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setImpacts((list) => list.filter((item) => item.key !== impact.key));
      }, LIFE_MS);
      timers.add(timer);
    };
    window.addEventListener("battle:vfx-card-landed", onLanded);
    return () => {
      window.removeEventListener("battle:vfx-card-landed", onLanded);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [place]);

  if (!SLOT_FX.enabled || !SLOT_FX.cardImpact) return null;

  return (
    <>
      <span ref={anchor} hidden />
      {place && createPortal(
        <div className={css.layer} aria-hidden="true">
          {impacts.map((impact) => {
            const { kinds, colour } = IMPACT[impact.symbol] ?? IMPACT.Empty;
            return (
              <div key={impact.key} className={css.impact} style={{ left: impact.x, top: impact.y, "--fx": colour } as CSSProperties}>
                <i className={css.flash} />
                {kinds.includes("smoke") && [0, 1, 2, 3, 4, 5].map((index) => <i key={index} className={css.smoke} data-at={index} />)}
                {kinds.includes("shock") && <><i className={css.shock} /><i className={`${css.shock} ${css.shockLate}`} /></>}
                {kinds.includes("wind") && [0, 1, 2].map((index) => <i key={index} className={css.wind} data-at={index} />)}
                {kinds.includes("lightning") && (
                  <svg className={css.bolt} viewBox="0 0 120 300" preserveAspectRatio="none">
                    {BOLTS.map((d) => <path key={d} d={d} className={css.boltGlow} />)}
                    {BOLTS.map((d) => <path key={d} d={d} className={css.boltCore} />)}
                  </svg>
                )}
              </div>
            );
          })}
        </div>,
        place.stage,
      )}
    </>
  );
}
