"use client";

import { useEffect, useState } from "react";
import {
  getDefenseShieldState,
  settleDefenseShield,
  subscribeDefenseShield,
} from "@/lib/battle-pixi/state/defenseShieldStore";
import styles from "./DefenseShieldOverlay.module.css";

const TRANSFER_MS = 620;

export default function DefenseShieldOverlay() {
  const [shield, setShield] = useState(getDefenseShieldState());

  useEffect(
    () =>
      subscribeDefenseShield(() => {
        setShield({ ...getDefenseShieldState() });
      }),
    []
  );

  useEffect(() => {
    if (shield.phase !== "traveling") return;
    const timer = window.setTimeout(
      () => settleDefenseShield(shield.token),
      TRANSFER_MS
    );
    return () => window.clearTimeout(timer);
  }, [shield.phase, shield.token]);

  if (!shield.grade || shield.phase === "hidden") return null;

  return (
    <div
      className={`defense-shield-overlay defense-shield-${shield.grade}`}
      data-phase={shield.phase}
      aria-label={`${shield.grade} defense shield stored`}
    >
      {shield.phase === "traveling" && (
        <svg
          className="defense-shield-transfer"
          viewBox="0 0 1920 1080"
          aria-hidden="true"
        >
          <path className="defense-shield-transfer-bloom" d="M 952 862 Q 706 786 520 635" />
          <path className="defense-shield-transfer-core" d="M 952 862 Q 706 786 520 635" />
        </svg>
      )}
      <div className="defense-shield-marker" aria-hidden="true">
        <div className={styles.place}>
          <i className={styles.rays} />
          <i className={styles.halo} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.icon} src={`/images/battle-ui/defense-shield/shield-${shield.grade}.v1.webp`} alt="" draggable={false} />
        </div>
      </div>
    </div>
  );
}
