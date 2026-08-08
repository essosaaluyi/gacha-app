"use client";

// Feature 5: pachislot data counter with slump graph.
// The DATA tab sits on the right edge; tapping it opens the dashboard as a
// centered in-page window. Rendered through a portal to <body> so the battle
// stage's scaling transform can't trap or cover it.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import LineChart from "@/components/charts/LineChart";
import { subscribeGameEvents } from "@/lib/events/gameEventStore";
import {
  getDataCounterStats,
  getSlumpSeries,
  type StatsScope,
} from "@/lib/events/statsSelectors";

type StatsGraphPanelProps = {
  /** Render the DATA switch in place (cabinet LED panel) instead of the floating edge tab. */
  inline?: boolean;
};

export default function StatsGraphPanel({ inline = false }: StatsGraphPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<StatsScope>("battle");
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Re-render on every logged event so the counter tracks live play.
    return subscribeGameEvents(() => setTick((value) => value + 1));
  }, [open]);

  if (!mounted) return null;

  const series = open ? getSlumpSeries(scope) : [];
  const stats = open
    ? getDataCounterStats(scope)
    : { bbCount: 0, totalGames: 0, combinedRate: null, diffCoins: 0 };

  const diffSign = stats.diffCoins > 0 ? "+" : "";
  const diffClass =
    stats.diffCoins >= 0 ? "data-counter-led-plus" : "data-counter-led-minus";

  const tabButton = inline ? (
    <button
      type="button"
      className="bcab-data-btn"
      onClick={() => setOpen((value) => !value)}
      aria-label={open ? "Close data counter" : "Open data counter"}
    >
      DATA
    </button>
  ) : (
    <button
      type="button"
      className={`stats-graph-tab ${open ? "stats-graph-tab-open" : ""}`}
      onClick={() => setOpen((value) => !value)}
      aria-label={open ? "Close data counter" : "Open data counter"}
    >
      <span className="stats-graph-tab-icon">📈</span>
      <span className="stats-graph-tab-label">DATA</span>
    </button>
  );

  return (
    <>
      {inline ? tabButton : createPortal(tabButton, document.body)}

      {open && createPortal(
        <div
          className="data-counter-backdrop"
          onClick={() => setOpen(false)}
        >
          <aside
            className="data-counter"
            aria-label="Data counter"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="data-counter-grid">
              {/* Top left: BB count */}
              <div className="data-counter-panel data-counter-panel-bb">
                <span className="data-counter-label data-counter-label-bb">
                  BB
                </span>
                <span className="data-counter-led">{stats.bbCount}</span>
              </div>

              {/* Top right: bonus combined rate */}
              <div className="data-counter-panel">
                <span className="data-counter-label">BONUS RATE</span>
                <span className="data-counter-led data-counter-led-rate">
                  {stats.combinedRate === null
                    ? "1/---"
                    : `1/${stats.combinedRate.toFixed(1)}`}
                </span>
              </div>

              {/* Middle left: difference coins */}
              <div className="data-counter-panel">
                <span className="data-counter-label">DIFF PTS (EST.)</span>
                <span className={`data-counter-led ${diffClass}`}>
                  {diffSign}
                  {stats.diffCoins.toLocaleString()}
                </span>
              </div>

              {/* Center banner */}
              <div className="data-counter-banner">
                <img src="/images/title.webp" alt="" />
              </div>

              {/* Bottom left: total games */}
              <div className="data-counter-panel">
                <span className="data-counter-label">TOTAL GAMES</span>
                <span className="data-counter-led">
                  {stats.totalGames.toLocaleString()}
                  <span className="data-counter-led-unit">G</span>
                </span>
              </div>

              {/* Bottom right: slump graph */}
              <div className="data-counter-graph">
                <LineChart
                  points={series}
                  width={252}
                  height={158}
                  stroke="#fbbf24"
                  fillTop="rgba(251, 191, 36, 0.12)"
                  zeroLine
                  stepUnit={500}
                  showLastDot={false}
                />
              </div>
            </div>

            <div className="data-counter-scope">
              <button
                type="button"
                className={
                  scope === "battle" ? "data-counter-scope-active" : ""
                }
                onClick={() => setScope("battle")}
              >
                THIS BATTLE
              </button>
              <button
                type="button"
                className={scope === "today" ? "data-counter-scope-active" : ""}
                onClick={() => setScope("today")}
              >
                TODAY
              </button>
            </div>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}
