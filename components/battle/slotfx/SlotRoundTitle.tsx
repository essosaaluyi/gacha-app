"use client";

import SlotText from "./SlotText";
import styles from "./SlotFx.module.css";

// PROVISIONAL — see slotFxStore.ts. The round intro's title in the reference
// machine's style: a small ROUND over one huge numeral, with the opponent on
// a "VS" plate underneath.
export default function SlotRoundTitle({ roundText, enemyName }: { roundText: string; enemyName: string }) {
  // "ROUND 03" or "ROUND EXTRA 2".
  const extra = /EXTRA/i.test(roundText);
  const digits = /(\d+)\s*$/.exec(roundText)?.[1] ?? "";
  const number = String(Number(digits) || digits);

  return (
    <div className={styles.round}>
      <div className={styles.roundInner}>
        <SlotText text="ROUND" tone="gold" className={styles.roundLabel} />
        <div className={styles.roundRow}>
          <SlotText text={number} tone={extra ? "ice" : "fire"} className={styles.roundNumber} />
          {extra && <SlotText text="EXTRA" tone="ice" className={styles.roundExtra} />}
        </div>
        {enemyName && (
          <div className={styles.roundVersus}><b>VS</b>{enemyName}</div>
        )}
      </div>
    </div>
  );
}
