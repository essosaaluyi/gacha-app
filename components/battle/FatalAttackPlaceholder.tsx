/* eslint-disable @next/next/no-img-element -- Preserve existing card artwork at its natural aspect ratio. */
import styles from "./FatalAttackPlaceholder.module.css";

export type FatalAttackPlaceholderProps = {
  active: boolean;
  side: "player" | "enemy";
  image: string;
  name: string;
};

export default function FatalAttackPlaceholder({ active, side, image, name }: FatalAttackPlaceholderProps) {
  if (!active) return null;
  return (
    <div className={styles.overlay} data-side={side} role="img" aria-label={`${side === "player" ? "味方" : "敵"}のFatal攻撃：${name}`}>
      <div className={styles.shutter} aria-hidden="true" />
      <div className={styles.card} aria-hidden="true"><img src={image} alt="" draggable={false} /></div>
      <div className={styles.copy} aria-hidden="true">
        <span className={styles.side}>{side === "player" ? "PLAYER" : "ENEMY"}</span>
        <p className={styles.title}>ATTACK</p>
        <p className={styles.name}>{name}</p>
        <span className={styles.rule} />
      </div>
    </div>
  );
}
