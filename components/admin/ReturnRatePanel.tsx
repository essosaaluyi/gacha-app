"use client";

import { useEffect, useState } from "react";
import {
  getReturnRateReport,
  type ReturnRateWindow,
} from "@/lib/events/returnRateReport";
import { subscribeGameEvents } from "@/lib/events/gameEventStore";

// Rough guide rails for reading the number at a glance.
function toneFor(row: ReturnRateWindow) {
  if (row.returnPct === null) return "text-zinc-500";
  if (row.returnPct < 60) return "text-rose-300";
  if (row.returnPct > 130) return "text-amber-300";
  return "text-emerald-300";
}

function labelFor(row: ReturnRateWindow) {
  if (row.returnPct === null) return "no draws yet";
  if (!row.complete) return `only ${row.draws} draws so far`;
  if (row.returnPct < 60) return "harsh";
  if (row.returnPct > 130) return "too generous";
  return "healthy";
}

export default function ReturnRatePanel() {
  const [rows, setRows] = useState<ReturnRateWindow[]>([]);

  useEffect(() => {
    const refresh = () => setRows(getReturnRateReport());

    refresh();
    return subscribeGameEvents(refresh);
  }, []);

  return (
    <section className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
      <h2 className="text-lg font-bold text-sky-300 mb-1">Return to player</h2>

      <p className="text-zinc-400 text-xs mb-4">
        Points won back per 100 points spent on draws. Measured over the last N
        draws, so a short session and a long one can be compared. Gifts, daily
        claims and card sales are excluded — battle winnings only.
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-xs">
            <th className="text-left font-medium pb-2">Window</th>
            <th className="text-right font-medium pb-2">Spent</th>
            <th className="text-right font-medium pb-2">Won back</th>
            <th className="text-right font-medium pb-2">Rate</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((row) => (
            <tr key={row.window} className="border-t border-zinc-800">
              <td className="py-2 text-zinc-300">last {row.window}</td>
              <td className="py-2 text-right text-zinc-400">{row.spent}</td>
              <td className="py-2 text-right text-zinc-400">{row.returned}</td>
              <td className={`py-2 text-right font-bold ${toneFor(row)}`}>
                {row.returnPct === null ? "—" : `${row.returnPct.toFixed(1)}%`}
                <span className="block text-[10px] font-sans font-normal text-zinc-500">
                  {labelFor(row)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
