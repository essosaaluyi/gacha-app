"use client";

import type { CSSProperties } from "react";
import atlas from "./slotGlyphAtlas.json";
import steelAtlas from "./slotGlyphAtlasSteel.json";
import steelHeavyAtlas from "./slotGlyphAtlasSteelHeavy.json";
import styles from "./SlotFx.module.css";
import type { SlotTone } from "./slotFxStore";

// PROVISIONAL — see slotFxStore.ts.
//
// Lettering set from pre-rendered glyphs (tools/slotfx/render_slot_glyphs.py):
// heavy serif figures and capitals with a gold rim, a dark inset line and a
// coloured face. Each glyph is one cell of a sheet, so any number or word can
// be set, and a count-up only changes which cells show.
//
// A second sheet, "silver", is upright Roman capitals in polished steel with a
// shallow depth: lettering for moments that must promise nothing. Letters only.
// "silverHeavy" is the same steel in a heavy block face, for short calls
// ("AIM!!"): capitals, and the Japanese characters of the calls drawn so far.

type GlyphSet = {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  padX: number;
  padY: number;
  capHeight: number;
  files: Record<string, string>;
  glyphs: Record<string, { col: number; row: number; advance: number }>;
};

type GlyphStyle = "gold" | "blood" | "violet" | "rainbow" | "silver";

/** The layer's colour families, and the cold steel that belongs to none of them. */
export type SlotGlyphTone = SlotTone | "silver" | "silverHeavy";

const BASE = "/images/battle-assets/slotfx/";
const SETS = Object.values(atlas.sets) as unknown as GlyphSet[];
const STEEL_SETS = Object.values(steelAtlas.sets) as unknown as GlyphSet[];
const HEAVY_SETS = Object.values(steelHeavyAtlas.sets) as unknown as GlyphSet[];
const isSteel = (tone: SlotGlyphTone) => tone === "silver" || tone === "silverHeavy";
const setsFor = (tone: SlotGlyphTone) => (tone === "silver" ? STEEL_SETS : tone === "silverHeavy" ? HEAVY_SETS : SETS);

/** The layer's colour families, mapped onto the four rendered faces. */
const TONE_STYLE: Record<SlotTone, GlyphStyle> = {
  fire: "blood",
  gold: "gold",
  ice: "violet",
  violet: "violet",
  rainbow: "rainbow",
};

const em = (value: number) => `${Math.round(value * 1000) / 1000}em`;

/** Every sheet, for warming the cache before the first telop needs one. */
export function slotGlyphSheets(tone: SlotGlyphTone = "gold"): string[] {
  return setsFor(tone).flatMap((set) => Object.values(set.files).map((file) => BASE + file));
}

/** How wide a word sets, in capital heights (the element's `em`). */
export function slotGlyphsWidth(text: string, tone: SlotGlyphTone): number {
  const sets = setsFor(tone);
  return Array.from(text.toUpperCase()).reduce((width, char) => {
    if (char === " ") return width + 0.5;
    const set = sets.find((candidate) => candidate.glyphs[char]);
    return set ? width + set.glyphs[char].advance / set.capHeight : width;
  }, 0);
}

/**
 * `font-size` on the element is the height of a capital; the rim and the depth
 * hang outside that box, as they would on a real sign.
 */
export default function SlotGlyphs({
  text,
  tone,
  className = "",
  shine = true,
  bloom = true,
  shineDelay = 380,
}: {
  text: string;
  tone: SlotGlyphTone;
  className?: string;
  shine?: boolean;
  bloom?: boolean;
  /** When the band of light sets off across the word, in ms. */
  shineDelay?: number;
}) {
  const style = isSteel(tone) ? "silver" : TONE_STYLE[tone as SlotTone];
  const sets = setsFor(tone);

  return (
    <span className={`${styles.glyphs} ${className}`} data-tone={isSteel(tone) ? "silver" : tone}>
      {Array.from(text.toUpperCase()).map((char, index) => {
        if (char === " ") return <span key={index} className={styles.glyphGap} />;
        const set = sets.find((candidate) => candidate.glyphs[char]);
        if (!set) return null;
        const glyph = set.glyphs[char];
        const unit = 1 / set.capHeight;
        const cell: CSSProperties = {
          left: em(-set.padX * unit),
          bottom: em(-set.padY * unit),
          width: em(set.cellW * unit),
          height: em(set.cellH * unit),
        };
        const sheet = `url(${BASE}${set.files[style]})`;
        const size = `${em(set.cols * set.cellW * unit)} ${em(set.rows * set.cellH * unit)}`;
        const position = `${em(-glyph.col * set.cellW * unit)} ${em(-glyph.row * set.cellH * unit)}`;

        return (
          <span key={index} className={styles.glyph} style={{ width: em(glyph.advance * unit) }}>
            <i className={styles.glyphCell} style={{ ...cell, backgroundImage: sheet, backgroundSize: size, backgroundPosition: position }} />
            {bloom && <i className={styles.glyphBloom} style={{ ...cell, backgroundImage: sheet, backgroundSize: size, backgroundPosition: position }} />}
            {shine && (
              <i
                className={styles.glyphShine}
                style={{
                  ...cell,
                  WebkitMaskImage: sheet,
                  maskImage: sheet,
                  WebkitMaskSize: size,
                  maskSize: size,
                  WebkitMaskPosition: position,
                  maskPosition: position,
                  animationDelay: `${shineDelay + index * 70}ms`,
                }}
              />
            )}
          </span>
        );
      })}
    </span>
  );
}
