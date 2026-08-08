"use client";

import { useEffect, useState } from "react";

import {
  getBattleLogs,
  subscribeBattleLogs,
} from "@/lib/battle-pixi/state/battleLogStore";

function getLogColor(type: string) {
  switch (type) {
    case "draw":
      return "#60a5fa"; // blue

    case "fakeout":
      return "#f472b6"; // pink

    case "success":
      return "#22c55e"; // green

    case "fail":
      return "#ef4444"; // red

    case "chance":
      return "#facc15"; // yellow

    default:
      return "#d4d4d8"; // gray
  }
}

type BattleLogProps = {
  /** "ticker" renders the cabinet LED panel's amber dot-matrix readout. */
  variant?: "panel" | "ticker";
};

const TICKER_MAX_LINES = 8;
const TICKER_SYS_TYPES = new Set(["draw", "success", "chance"]);

export default function BattleLog({ variant = "panel" }: BattleLogProps) {
  const [logs, setLogs] = useState(getBattleLogs());

  useEffect(() => {
    return subscribeBattleLogs(() => {
      setLogs([...getBattleLogs()]);
    });
  }, []);

  if (variant === "ticker") {
    const tickerLogs = logs.slice(-TICKER_MAX_LINES);

    return (
      <div className="bcab-ticker" role="status" aria-live="polite">
        {tickerLogs.length ? (
          tickerLogs.map((log, index) => (
            <div
              key={`${log.message}-${index}`}
              className={`bcab-ticker-line ${
                TICKER_SYS_TYPES.has(log.type) ? "bcab-sys" : ""
              }`}
            >
              &gt; {log.message}
            </div>
          ))
        ) : (
          <div className="bcab-ticker-line bcab-sys">&gt; SYSTEM READY</div>
        )}
      </div>
    );
  }

  const recentLogs = logs.slice(-2);

  return (
    <div
      className="battle-log-ticker"
      role="status"
    >
      <img className="battle-hud-frame" src="/images/battle-ui/production/v1/transparent/event-ticker-frame-v1.png" alt="" />
      <div className="battle-log-events" aria-live="polite">
        {recentLogs.length ? recentLogs.map((log, index) => (
          <div
            key={`${log.message}-${index}`}
            className="battle-log-event"
            style={{ color: getLogColor(log.type) }}
          >
            {log.message}
          </div>
        )) : (
          <div className="battle-log-event">Battle initialized</div>
        )}
      </div>
    </div>
  );
}
