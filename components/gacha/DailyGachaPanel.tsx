"use client";

// Feature 9: today's rotating lineup + simulated community stats.
// All values come from lib/gacha/dailyRotation and are computed client-side
// after mount (they depend on the local date, so SSR would mismatch).

import { useEffect, useState } from "react";
import {
  getCommunityStats,
  getDailyLineup,
  msUntilRotation,
  type CommunityStats,
} from "@/lib/gacha/dailyRotation";
import type { Card } from "@/lib/gacha/pullLogic";

const STATS_REFRESH_MS = 60_000;

function rarityFrameClass(rarity: string) {
  if (rarity === "UR") {
    return "bg-zinc-900 border-zinc-200 shadow-[0_0_18px_rgba(255,255,255,0.35)]";
  }
  if (rarity === "SSR") {
    return "bg-yellow-950 border-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.4)]";
  }
  if (rarity === "SR") {
    return "bg-blue-950 border-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.35)]";
  }
  return "bg-zinc-900 border-zinc-700";
}

function rarityTextClass(rarity: string) {
  if (rarity === "UR") return "text-white";
  if (rarity === "SSR") return "text-yellow-300";
  if (rarity === "SR") return "text-blue-300";
  return "text-zinc-400";
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function DailyGachaPanel() {
  const [lineup, setLineup] = useState<Card[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      setLineup(getDailyLineup());
      setStats(getCommunityStats());
    };
    refresh();
    const timer = window.setInterval(refresh, STATS_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const tick = () => setCountdownMs(msUntilRotation());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (lineup.length === 0 || !stats) return null;

  const pullsByCard = new Map(
    stats.perCard.map((stat) => [stat.card.name, stat])
  );
  const topName = stats.topCards[0]?.card.name;
  const maxPulls = Math.max(1, ...stats.perCard.map((stat) => stat.pulls));

  return (
    <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 md:p-6 mb-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-lg font-black tracking-[0.2em] text-zinc-100">
          TODAY&apos;S LINEUP
        </h2>
        <p className="text-sm text-zinc-400">
          Rotates in{" "}
          <span className="font-mono font-bold text-emerald-400">
            {countdownMs === null ? "--:--:--" : formatCountdown(countdownMs)}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-7 gap-3 mb-5">
        {lineup.map((card) => {
          const stat = pullsByCard.get(card.name);
          const pulls = stat?.pulls ?? 0;
          const isTop = card.name === topName;

          return (
            <div key={card.name} className="text-center">
              <div
                className={`relative rounded-xl border p-1 ${rarityFrameClass(
                  card.rarity
                )}`}
              >
                {isTop && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full z-10">
                    HOT
                  </span>
                )}
                <img
                  src={card.image}
                  alt={card.name}
                  className="w-full aspect-[3/4] object-contain rounded-lg bg-zinc-800"
                />
              </div>
              <p
                className={`mt-1 text-xs font-bold ${rarityTextClass(
                  card.rarity
                )}`}
              >
                {card.rarity}
              </p>
              <div className="mt-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500/80"
                  style={{ width: `${(pulls / maxPulls) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500">{pulls} pulls</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3">
        <p className="text-sm text-zinc-300">
          Community pulls today:{" "}
          <span className="font-bold text-emerald-400">
            {stats.totalPulls.toLocaleString()}
          </span>
        </p>
        {stats.topCards[0] && (
          <p className="text-sm text-zinc-400">
            Most pulled:{" "}
            <span
              className={`font-bold ${rarityTextClass(
                stats.topCards[0].card.rarity
              )}`}
            >
              {stats.topCards[0].card.name}
            </span>{" "}
            ({stats.topCards[0].sharePct.toFixed(0)}%)
          </p>
        )}
      </div>
    </section>
  );
}
