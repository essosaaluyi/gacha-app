"use client";

import { useEffect, useState } from "react";
import LineChart from "@/components/charts/LineChart";
import { subscribeGameEvents } from "@/lib/events/gameEventStore";
import { getDataCounterStats, getSlumpSeries, type StatsScope } from "@/lib/events/statsSelectors";
import SoftDialog from "./SoftDialog";
import SiteIcon from "./SiteIcon";

// Read the existing counters; this website view never changes battle or reward state.
export default function ResultDataDialog() {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<StatsScope>("battle");
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    return subscribeGameEvents(() => setTick((tick) => tick + 1));
  }, [open]);

  const stats = open ? getDataCounterStats(scope) : null;
  return <>
    <button type="button" className="site-secondary" onClick={() => setOpen(true)}><SiteIcon name="history" />View battle statistics</button>
    <SoftDialog open={open} onClose={() => setOpen(false)} title="Battle statistics" wide>
      <div className="archive-filters" role="group" aria-label="Statistics period">
        <button type="button" aria-pressed={scope === "battle"} onClick={() => setScope("battle")}>This battle</button>
        <button type="button" aria-pressed={scope === "today"} onClick={() => setScope("today")}>Today</button>
      </div>
      {stats && <>
        <div className="site-result-stat-grid">
          <div><span>Bonuses</span><strong>{stats.bbCount.toLocaleString()}</strong></div>
          <div><span>Bonus rate</span><strong>{stats.combinedRate ? `1 / ${stats.combinedRate.toFixed(1)}` : "—"}</strong></div>
          <div><span>Total games</span><strong>{stats.totalGames.toLocaleString()}</strong></div>
          <div><span>Point difference · est.</span><strong>{stats.diffCoins > 0 ? "+" : ""}{stats.diffCoins.toLocaleString()}</strong></div>
        </div>
        <div className="site-result-chart"><LineChart points={getSlumpSeries(scope)} width={480} height={220} stroke="#18745f" fillTop="rgba(24,116,95,.10)" zeroLine stepUnit={500} showLastDot={false} /></div>
      </>}
    </SoftDialog>
  </>;
}
