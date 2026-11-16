"use client";

import { Fragment } from "react";
import type { BarChanceTone } from "@/lib/battle-pixi/core/resultLottery";
import SlotBackdrop, { type SlotBackdropKind } from "./SlotBackdrop";
import SlotGlyphs from "./SlotGlyphs";
import css from "./SlotBarChance.module.css";

// PROVISIONAL — see slotFxStore.ts.
//
// The dressing of BAR CHANCE while it waits on the cards: the BAR card over
// "AIM!!" (the owner's 「BARを狙え」, set in English).
// components/battle/BarChanceOverlay.tsx still owns the sequence, the
// character, the success mark and the freeze; this only replaces the striped
// background and the caption, when SLOT_FX.barChance is on.
//
// The tone (blue, green, red) is the game's own hint at the outcome, so here
// the colour is meant to be read: it picks the tunnel the scene flies down,
// and tints the band, the rays and the glow of the lettering.

const BAR_SYMBOL = "/images/battle-symbols/bar.webp";
/** Read with the BAR card above it: "BAR — AIM!!". */
const CALL = "AIM!!";

const TONE_BACKDROP: Record<BarChanceTone, SlotBackdropKind> = {
  blue: "blueTunnel",
  green: "greenTunnel",
  red: "redTunnel",
};

export const SLOT_BAR_CHANCE_BACKDROPS: SlotBackdropKind[] = [...Object.values(TONE_BACKDROP), "speedLines"];

/** Classes the overlay adds to its own elements while this dressing is on. */
export const slotBarChanceClass = { layer: css.layer, character: css.character };

/** The line was not made: the screen goes dark from that card on. */
export function SlotBarChanceBlackout() {
  return <div className={css.blackout} />;
}

/** Behind the character: the tunnel, faster with every BAR that lands. */
export function SlotBarChanceBackdrop({ tone, bars }: { tone: BarChanceTone; bars: number }) {
  return (
    <div className={css.backdropWrap}>
      <SlotBackdrop kind={TONE_BACKDROP[tone]} className={css.backdrop} rate={1 + bars * 0.4} />
      <SlotBackdrop kind="speedLines" className={css.lines} />
    </div>
  );
}

function Chevrons() {
  return (
    <span className={css.chevrons}>
      {[0, 1, 2].map((index) => (
        <i key={index} className={css.chevron} style={{ animationDelay: `${(2 - index) * 110}ms` }} />
      ))}
    </span>
  );
}

/** Over the character: the BAR plate, "AIM!!" and the running band. */
export function SlotBarChanceCommand({ bars }: { bars: number }) {
  return (
    <div className={css.aim} data-bars={bars}>
      <div className={css.call}>
        <div className={css.plate}>
          <i className={css.rays} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={css.symbol} src={BAR_SYMBOL} alt="" draggable={false} />
          {[0, 1, 2, 3].map((index) => (
            <i key={index} className={css.glint} data-at={index} />
          ))}
        </div>
        <SlotGlyphs text={CALL} tone="silverHeavy" className={css.callGlyphs} />
      </div>

      {/* The band lies back into the screen: far on the right, near on the
          left, and what it carries runs out of the distance toward the viewer.
          That is also the way to turn the cards: from the right. */}
      <div className={css.bandSpace}>
        <div className={css.band}>
          <div className={css.bandRun}>
            {[0, 1].map((copy) => (
              <div key={copy} className={css.bandSet}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <Fragment key={index}>
                    <Chevrons />
                    <SlotGlyphs text="BAR CHANCE" tone="silver" className={css.bandGlyphs} shine={false} bloom={false} />
                  </Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* A BAR has landed: one flash for each. */}
      {bars > 0 && <i key={bars} className={css.hit} />}
    </div>
  );
}
