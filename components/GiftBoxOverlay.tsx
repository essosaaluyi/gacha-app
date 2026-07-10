"use client";

// Feature 10: gift box overlay — milestone rewards + stubbed ad reward.

import { useEffect, useRef, useState } from "react";
import {
  claimAdReward,
  claimMilestone,
  getGiftRewards,
  type GiftReward,
} from "@/lib/giftbox/giftBoxStore";

const AD_SECONDS = 5;

type Props = { onClose: () => void };

export default function GiftBoxOverlay({ onClose }: Props) {
  const [rewards, setRewards] = useState<GiftReward[]>([]);
  const [notice, setNotice] = useState("");
  const [adCountdown, setAdCountdown] = useState<number | null>(null);
  const adTimer = useRef<number | null>(null);

  useEffect(() => {
    setRewards(getGiftRewards());
    return () => {
      if (adTimer.current !== null) window.clearInterval(adTimer.current);
    };
  }, []);

  const claim = async (id: string) => {
    const points = await claimMilestone(id);
    if (points !== null) {
      setNotice(`+${points} points!`);
      setRewards(getGiftRewards());
    }
  };

  const watchAd = () => {
    if (adCountdown !== null) return;
    setNotice("");
    setAdCountdown(AD_SECONDS);
    adTimer.current = window.setInterval(() => {
      setAdCountdown((prev) => {
        if (prev === null || prev > 1) return prev === null ? null : prev - 1;
        if (adTimer.current !== null) window.clearInterval(adTimer.current);
        adTimer.current = null;
        void claimAdReward().then((points) => setNotice(`+${points} points!`));
        return null;
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md text-white">
        <h2 className="text-2xl font-bold mb-1 text-center">Gift Box</h2>
        <p className="text-zinc-400 text-sm mb-5 text-center">
          Rewards for playing. Claim them anytime.
        </p>

        {notice && (
          <p className="text-emerald-400 text-center font-bold mb-4">{notice}</p>
        )}

        <div className="space-y-3 mb-5">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="bg-zinc-800/70 border border-zinc-700 rounded-xl p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{reward.title}</p>
                  <p className="text-xs text-zinc-400">
                    {reward.progress}/{reward.target} games ·{" "}
                    <span className="text-emerald-400">
                      {reward.points} pts
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => void claim(reward.id)}
                  disabled={!reward.claimable}
                  className={`px-4 py-2 rounded-lg text-sm font-bold shrink-0 ${
                    reward.claimed
                      ? "bg-zinc-700 text-zinc-500"
                      : reward.claimable
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-zinc-700 text-zinc-400"
                  }`}
                >
                  {reward.claimed
                    ? "Claimed"
                    : reward.claimable
                    ? "Claim"
                    : "Locked"}
                </button>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                <div
                  className="h-full bg-emerald-500/80"
                  style={{
                    width: `${(reward.progress / reward.target) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={watchAd}
          disabled={adCountdown !== null}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 px-4 py-3 rounded-xl font-semibold mb-3"
        >
          {adCountdown !== null
            ? `Watching ad… ${adCountdown}s`
            : "Watch Ad (+bonus points)"}
        </button>

        <button
          onClick={onClose}
          className="w-full bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded-xl font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
}
