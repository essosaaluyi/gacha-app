"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getCurrentRound, subscribeRound } from "@/lib/battle-pixi/state/roundStore";
import BattleDigitStrip from "./BattleDigitStrip";

const DISPLAY_ROUNDS = 7;
const RAIL_STATIONS = [1, 2, 3, 4, 5, 6, 7];
const RAIL_STATION_CENTERS = [
  12.818,
  25.305,
  37.64,
  49.975,
  62.335,
  74.695,
  87.08,
] as const;

export default function RoundMeter() {
  const [round, setRound] = useState(getCurrentRound());
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previewStage = Number(searchParams.get("stage"));
  const displayRound = pathname === "/battle-sim" && Number.isInteger(previewStage)
    ? Math.max(1, Math.min(previewStage, RAIL_STATIONS.length))
    : round;
  const currentStation = Math.max(1, Math.min(displayRound, RAIL_STATIONS.length));

  useEffect(() => subscribeRound(() => setRound(getCurrentRound())), []);

  const nodes = useMemo(
    () => RAIL_STATIONS.map((roundStart, index) => {
      const value = index + 1;
      const isCleared = value < currentStation;
      const isCurrent = value === currentStation;
      return {
        value,
        roundStart,
        isCleared,
        isCurrent,
        left: `${RAIL_STATION_CENTERS[index]}%`,
      };
    }),
    [currentStation]
  );

  return (
    <div className="battle-progress-roadmap" aria-label={`Battle progress: round ${displayRound} of ${DISPLAY_ROUNDS}`}>
      <img src="/images/battle-ui/production/v1/transparent/aether-stage-roadmap-seven-frame-v2.png" alt="" className="battle-progress-track" />
      {nodes.map((node) => (
        <div
          key={node.value}
          className={`battle-progress-station ${node.isCurrent ? "battle-progress-station-current" : ""} ${node.isCleared ? "battle-progress-station-cleared" : ""}`}
          style={{ left: node.left }}
        >
          <span className="battle-progress-station-fill" />
          {node.isCurrent && <span className="battle-progress-now">Now</span>}
          <BattleDigitStrip value={node.value} style="rune-led" className="battle-progress-station-label" />
        </div>
      ))}
    </div>
  );
}
