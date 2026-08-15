"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import StatsGraphPanel from "@/components/battle/StatsGraphPanel";
import {
  readBattleRunSummary,
  type BattleRunSummary,
} from "@/lib/battle-pixi/state/battleRunSummaryStore";

const ENDING_COPY: Record<BattleRunSummary["ending"], string> = {
  quit: "You ended this run.",
  gameOver: "Your run is over.",
  defeat: "Your run is over.",
};

export default function BattleResultPage() {
  // Read on the client only: the summary lives in sessionStorage, so rendering
  // it during SSR would mismatch. Null means we never got a summary (a direct
  // visit to this URL), which reads differently from a run that scored nothing.
  const [summary, setSummary] = useState<BattleRunSummary | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSummary(readBattleRunSummary());
    setReady(true);

    // Deliberately NOT cleared on unmount. React StrictMode double-invokes
    // effects in development (mount, unmount, mount), so an unmount cleanup
    // wipes the summary before the second mount can read it -- the screen then
    // renders the same zeros this whole fix exists to remove. The summary is
    // overwritten by the next run that ends, which is enough: the worst case is
    // that revisiting this URL re-shows the run you just finished.
  }, []);

  const rows: [string, string][] = [
    ["Enemies Defeated", (summary?.enemiesDefeated ?? 0).toLocaleString()],
    ["Games Played", (summary?.gamesPlayed ?? 0).toLocaleString()],
    ["Points Earned", (summary?.pointsEarned ?? 0).toLocaleString()],
    ["Cards Drawn", (summary?.cardsDrawn ?? 0).toLocaleString()],
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-black rounded-3xl border border-zinc-800 p-8">

        <h1 className="text-4xl font-bold text-center mb-2">
          Battle Result
        </h1>

        <p className="text-center text-zinc-400 mb-8">
          {!ready
            ? " "
            : summary
              ? `${ENDING_COPY[summary.ending]} Reached round ${summary.round}.`
              : "No recent run to show."}
        </p>

        <div className="space-y-4 text-lg">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span>{label}</span>
              <span className="tabular-nums font-semibold">{value}</span>
            </div>
          ))}
        </div>

        {/* The run's slump graph / data counter, reusing the battle cabinet's
            own panel rather than a second chart implementation. It reads the
            event log, which survives the navigation here. */}
        <div className="mt-8 flex justify-center">
          <StatsGraphPanel inline />
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/menu"
            className="bg-emerald-600 hover:bg-emerald-500 px-8 py-3 rounded-xl font-bold"
          >
            Return To Menu
          </Link>
        </div>

      </div>
    </main>
  );
}
