"use client";

import SlotGlyphs from "./SlotGlyphs";
import styles from "./SlotFx.module.css";

// PROVISIONAL — see slotFxStore.ts. The round intro's title: a small gold
// ROUND over one huge numeral, with the opponent in a thin serif underneath.
export default function SlotRoundTitle({ roundText, enemyName }: { roundText: string; enemyName: string }) {
  // "ROUND 03" or "ROUND EXTRA 2".
  const extra = /EXTRA/i.test(roundText);
  const digits = /(\d+)\s*$/.exec(roundText)?.[1] ?? "";
  const number = String(Number(digits) || digits);

  return (
    <div className={styles.round}>
      <div className={styles.roundInner}>
        <SlotGlyphs text="ROUND" tone="gold" className={styles.roundLabel} shine={false} />
        <div className={styles.roundRow}>
          <SlotGlyphs text={number} tone={extra ? "violet" : "gold"} className={styles.roundNumber} />
          {extra && <SlotGlyphs text="EXTRA" tone="violet" className={styles.roundExtra} shine={false} />}
        </div>
        {enemyName && (
          <div className={styles.roundVersus}><b>VS</b>{enemyName}</div>
        )}
      </div>
    </div>
  );
}
