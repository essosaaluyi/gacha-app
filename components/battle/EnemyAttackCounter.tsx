"use client";

import { useEffect, useState } from "react";

import {
  getEnemyAttackCounter,
  getEnemyAttackCounterMax,
  subscribeEnemyAttackCounter,
} from "@/lib/battle-pixi/state/enemyAttackCounterStore";
import { isEnemyAttackModeActive, getEnemyAttackModeTurnsLeft, subscribeEnemyAttackMode } from "@/lib/battle-pixi/state/enemyAttackModeStore";

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Fuse colour by how much of the counter is left, not by raw count, so the ramp
// reads the same whether an enemy is armed at 5 draws or 12.
function gaugeTone(ratio: number) {
  if (ratio > 0.6) return { key: "safe", color: "#22c55e" };
  if (ratio > 0.35) return { key: "caution", color: "#eab308" };
  if (ratio > 0.15) return { key: "danger", color: "#f97316" };
  return { key: "critical", color: "#ef4444" };
}

export default function EnemyAttackCounter() {
  const [counter, setCounter] = useState(getEnemyAttackCounter());
  const [max, setMax] = useState(getEnemyAttackCounterMax());
  const [fatal, setFatal] = useState(isEnemyAttackModeActive());
  const [remaining, setRemaining] = useState(getEnemyAttackModeTurnsLeft());
  useEffect(() => subscribeEnemyAttackMode(() => {
    setFatal(isEnemyAttackModeActive());
    setRemaining(getEnemyAttackModeTurnsLeft());
  }), []);

  useEffect(() => {
    return subscribeEnemyAttackCounter(() => {
      setCounter(getEnemyAttackCounter());
      setMax(getEnemyAttackCounterMax());
    });
  }, []);

  const ratio = !fatal && max > 0 ? Math.max(0, Math.min(1, counter / max)) : 0;
  const tone = gaugeTone(ratio);
  const held = fatal || counter <= 0;

  return (
    <div
      className={`enemy-attack-gauge enemy-attack-gauge-${tone.key} ${
        held ? "enemy-attack-gauge-held" : ""
      }`}
      style={{ ["--eag-color" as string]: tone.color }}
      role="img"
      aria-label={
        fatal ? `Enemy Fatal attack window: ${remaining} following rescue draws remaining`
          : held ? "Enemy Fatal ready: each Empty game has a 50 percent entry chance; other results do not enter"
          : `Enemy attacks in ${counter} of ${max} draws`
      }
    >
      <svg viewBox="0 0 100 100" className="enemy-attack-gauge-svg">
        {fatal && <g transform="rotate(90 50 50)" fill="#ffe4c4">
          <text x="50" y="43" textAnchor="middle" fontSize="12" fontWeight="800">FATAL</text>
          <text x="50" y="66" textAnchor="middle" fontSize="22" fontWeight="800">{remaining}G</text>
        </g>}
        <circle className="enemy-attack-gauge-track" cx="50" cy="50" r={RADIUS} />
        <circle
          className="enemy-attack-gauge-fill"
          cx="50"
          cy="50"
          r={RADIUS}
          style={{
            strokeDasharray: CIRCUMFERENCE,
            strokeDashoffset: CIRCUMFERENCE * (1 - ratio),
          }}
        />
      </svg>
    </div>
  );
}
