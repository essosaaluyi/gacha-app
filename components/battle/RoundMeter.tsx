"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getCurrentRound, subscribeRound } from "@/lib/battle-pixi/state/roundStore";
import { getNormalBattleRounds, subscribeCurrentEnemy } from "@/lib/battle-pixi/state/currentEnemyStore";
import BattleDigitStrip from "./BattleDigitStrip";

export default function RoundMeter() {
  const [progress, setProgress] = useState(() => ({
    round: getCurrentRound(), normalRounds: getNormalBattleRounds(),
  }));
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previewStage = Number(searchParams.get("stage"));
  const displayRound = pathname === "/battle-sim" && Number.isInteger(previewStage)
    ? Math.max(1, previewStage) : progress.round;
  const limit = progress.normalRounds;
  const extra = Math.max(0, displayRound - limit);
  const nodes = Array.from({ length: limit + 1 }, (_, index) => index + 1);

  useEffect(() => {
    const sync = () => setProgress({ round: getCurrentRound(), normalRounds: getNormalBattleRounds() });
    const detachRound = subscribeRound(sync);
    const detachEnemy = subscribeCurrentEnemy(sync);
    return () => { detachRound(); detachEnemy(); };
  }, []);

  return (
    <div className="battle-progress-roadmap" role="status"
      aria-label={extra ? `Battle progress: EXTRA ${extra}` : `Battle progress: round ${displayRound} of ${limit}`}>
      <div aria-hidden="true" style={{ position: "absolute", left: "5%", right: "5%", top: "50%",
        height: 3, background: "linear-gradient(90deg, #355364, #bd9d59)", boxShadow: "0 0 8px #172c38" }} />
      {nodes.map((value, index) => {
        const isExtra = value > limit;
        const current = isExtra ? extra > 0 : value === displayRound;
        const cleared = !isExtra && value < displayRound;
        const label = isExtra ? `EXTRA ${extra || 1}` : `Round ${value}`;
        return (
          <div key={value} aria-label={label} aria-current={current ? "step" : undefined}
            className={`battle-progress-station ${current ? "battle-progress-station-current" : ""} ${cleared ? "battle-progress-station-cleared" : ""}`}
            style={{ left: `${5 + index * 90 / limit}%`, width: `${80 / nodes.length}%`,
              minWidth: 0, maxWidth: 60, height: 36, borderRadius: 6,
              border: `1px solid ${current ? "#a4f2ff" : "#8e784d"}`,
              background: current ? "#173945" : "#101b24" }}>
            {current && <span style={{ position: "absolute", top: -15, fontSize: 10, color: "#bff6ff" }}>Now</span>}
            {isExtra
              ? <span style={{ fontSize: limit > 5 ? 8 : 10, fontWeight: 900, color: "#eac96f", whiteSpace: "nowrap" }}>EXTRA {extra || 1}</span>
              : <BattleDigitStrip value={value} style="rune-led" className="battle-progress-station-label" />}
          </div>
        );
      })}
    </div>
  );
}
