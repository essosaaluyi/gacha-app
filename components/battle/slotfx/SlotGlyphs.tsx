"use client";

import type { CSSProperties } from "react";
import atlas from "./slotGlyphAtlas.json";
import styles from "./SlotFx.module.css";
import type { SlotTone } from "./slotFxStore";

// PROVISIONAL — see slotFxStore.ts.
//
// Lettering set from pre-rendered glyphs (tools/slotfx/render_slot_glyphs.py):
// heavy serif figures and capitals with a gold rim, a dark inset line and a
// coloured face. Each glyph is one cell of a sheet, so any number or word can
// be set, and a count-up only changes which cells show.

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

type GlyphStyle = "gold" | "blood" | "violet" | "rainbow";

const BASE = "/images/battle-assets/slotfx/";
const SETS = Object.values(atlas.sets) as unknown as GlyphSet[];

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
export function slotGlyphSheets(): string[] {
  return SETS.flatMap((set) => Object.values(set.files).map((file) => BASE + file));
}

/**
 * `font-size` on the element is the height of a capital; the rim and the depth
 * hang outside that box, as they would on a real sign.
 */
export default function SlotGlyphs({ text, tone, className = "", shine = true }: { text: string; tone: SlotTone; className?: string; shine?: boolean }) {
  const style = TONE_STYLE[tone];

  return (
    <span className={`${styles.glyphs} ${className}`} data-tone={tone}>
      {Array.from(text.toUpperCase()).map((char, index) => {
        if (char === " ") return <span key={index} className={styles.glyphGap} />;
        const set = SETS.find((candidate) => candidate.glyphs[char]);
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
                  animationDelay: `${380 + index * 70}ms`,
                }}
              />
            )}
          </span>
        );
      })}
    </span>
  );
}
