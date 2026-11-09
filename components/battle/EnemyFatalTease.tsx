/* eslint-disable @next/next/no-img-element -- Existing card art is intentionally cropped for this temporary cut-in. */
import styles from "./EnemyFatalTease.module.css";

export type EnemyFatalTeaseProps = {
  active: boolean;
  stage: "anticipation" | "warning";
  stops: 0 | 1 | 2 | 3;
  enemyImage: string;
  enemyName: string;
};

export default function EnemyFatalTease({ active, stage, stops, enemyImage, enemyName }: EnemyFatalTeaseProps) {
  if (!active) return null;
  const visible = stops > 0 || stage === "warning";
  return (
    <div className={styles.overlay} data-stage={stage} data-stops={stops}
      role="img" aria-label={stage === "warning" ? `${enemyName}：敵の攻撃` : `${enemyName}：警戒演出`}>
      {visible && <>
        <div className={styles.portrait} aria-hidden="true"><img src={enemyImage} alt="" draggable={false} /></div>
        <div className={styles.heartbeat} aria-hidden="true" />
        <div className={styles.waves} aria-hidden="true"><i /><i /><i /></div>
      </>}
      {stage === "warning" && <div className={styles.warning} aria-hidden="true">
        <div className={`${styles.tape} ${styles.topTape}`}><span>DANGER / DANGER / DANGER / DANGER / DANGER / DANGER / DANGER / DANGER / </span></div>
        <p className={styles.title}>ENEMY&apos;S ATTACK</p>
        <p className={styles.name}>{enemyName}</p>
        <div className={`${styles.tape} ${styles.bottomTape}`}><span>DANGER / DANGER / DANGER / DANGER / DANGER / DANGER / DANGER / DANGER / </span></div>
      </div>}
    </div>
  );
}
