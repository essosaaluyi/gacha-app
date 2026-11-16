"use client";

import styles from "./SlotFx.module.css";
import type { SlotTone } from "./slotFxStore";

/**
 * Heavy slanted lettering with a dark rim, a bright rim and a banded metal
 * fill — the reference machine's numerals. The three layers are the same text
 * stacked, because one element cannot carry two outlines and a gradient fill.
 */
export default function SlotText({ text, tone, className = "" }: { text: string; tone: SlotTone; className?: string }) {
  return (
    <span className={`${styles.text} ${className}`} data-tone={tone}>
      <span className={styles.textRim} aria-hidden="true">{text}</span>
      <span className={styles.textEdge} aria-hidden="true">{text}</span>
      <span className={styles.textFill}>{text}</span>
      <span className={styles.textShine} aria-hidden="true">{text}</span>
    </span>
  );
}
