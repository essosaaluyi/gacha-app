"use client";

import { useEffect, useState } from "react";
import {
  getDefenseShieldState,
  settleDefenseShield,
  subscribeDefenseShield,
} from "@/lib/battle-pixi/state/defenseShieldStore";

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
        <svg viewBox="0 0 64 76">
          <path d="M32 3 57 13v22c0 18-10 30-25 38C17 65 7 53 7 35V13L32 3Z" />
          <path d="M32 12 48 18v17c0 12-6 21-16 27-10-6-16-15-16-27V18l16-6Z" />
        </svg>
      </div>
    </div>
  );
}
