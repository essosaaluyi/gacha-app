"use client";

import { useEffect, useState, type CSSProperties } from "react";

import styles from "@/app/bonus-number-preview/page.module.css";

type CollectionPointsHandoffProps = {
  points: number;
};

const COUNT_MS = 1500;

export default function CollectionPointsHandoff({
  points,
}: CollectionPointsHandoffProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / COUNT_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(points * eased));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [points]);

  return (
    <div className={styles.battleHandoff} aria-live="polite">
      <small>BONUS BANKED</small>
      <strong className={styles.layeredRewardText}>
        <span className={styles.rewardTextBase}>+{shown.toLocaleString()}P</span>
        <span className={styles.rewardTextGloss} aria-hidden="true">
          +{shown.toLocaleString()}P
        </span>
      </strong>
      <span className={styles.handoffParticles} aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <i
            key={index}
            style={
              {
                "--handoff-angle": `${(360 / 16) * index}deg`,
                "--handoff-delay": `${(index % 5) * 45}ms`,
              } as CSSProperties
            }
          />
        ))}
      </span>
    </div>
  );
}
