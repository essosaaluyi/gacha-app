"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getBgmMuted,
  getBgmVolume,
  setBgmMuted,
  setBgmVolume,
} from "@/lib/audio/bgmStore";
import { playBgm } from "@/lib/audio/bgmStore";

export default function TopBar() {
  const [email, setEmail] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [isGuest, setIsGuest] = useState(false);
  const [dailyReward, setDailyReward] = useState(0);
  const [cooldownText, setCooldownText] = useState("");
  const [claimPopupOpen, setClaimPopupOpen] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [returnPopupOpen, setReturnPopupOpen] = useState(false);

  const [muted, setMuted] = useState(false);
const [volume, setVolume] = useState(0.5);
const [needsResumeBgm, setNeedsResumeBgm] = useState(false);

  useEffect(() => {
    setMuted(getBgmMuted());
setVolume(getBgmVolume());
    loadUser();
  }, []);

  const getPointSetting = async (key: string, fallback: number) => {
    const { data } = await supabase
      .from("point_settings")
      .select("setting_value")
      .eq("setting_key", key)
      .single();

    return data?.setting_value ?? fallback;
  };

  const formatCooldown = (lastClaim: string | null) => {
    if (!lastClaim) return "";

    const last = new Date(lastClaim).getTime();
    const next = last + 24 * 60 * 60 * 1000;
    const diff = next - Date.now();

    if (diff <= 0) return "";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `Next: ${hours}h ${minutes}m`;
  };

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      localStorage.removeItem("guest_mode");
      setIsGuest(false);
      setEmail(`User ${user.id.slice(0, 8)}`);

      const { data } = await supabase
        .from("user_points")
        .select("points, last_daily_claim")
        .eq("user_id", user.id)
        .single();

      setPoints(data?.points ?? 0);
      setCooldownText(formatCooldown(data?.last_daily_claim ?? null));

      const reward = await getPointSetting("member_daily_points", 300);
      setDailyReward(reward);
      return;
    }

    const guestMode = localStorage.getItem("guest_mode");

    if (guestMode === "true") {
      setIsGuest(true);
      setEmail("Guest");

      const guestPoints = Number(localStorage.getItem("guest_points") ?? 0);
      const guestLastClaim = localStorage.getItem("guest_last_daily_claim");

      setPoints(guestPoints);
      setCooldownText(formatCooldown(guestLastClaim));

      const reward = await getPointSetting("guest_daily_points", 100);
      setDailyReward(reward);
      return;
    }

    setEmail(null);
    setPoints(0);
  };

  const claimDailyReward = async () => {
    const now = new Date().toISOString();

    if (isGuest) {
      const lastClaim = localStorage.getItem("guest_last_daily_claim");

      if (formatCooldown(lastClaim)) return;

      const reward = await getPointSetting("guest_daily_points", 100);
      const after = points + reward;

      localStorage.setItem("guest_points", String(after));
      localStorage.setItem("guest_last_daily_claim", now);

      setPoints(after);
      setClaimedAmount(reward);
      setClaimPopupOpen(true);
      setCooldownText(formatCooldown(now));
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("user_points")
      .select("points, last_daily_claim")
      .eq("user_id", user.id)
      .single();

    if (formatCooldown(data?.last_daily_claim ?? null)) return;

    const reward = await getPointSetting("member_daily_points", 300);
    const after = (data?.points ?? 0) + reward;

    await supabase
      .from("user_points")
      .update({
        points: after,
        last_daily_claim: now,
      })
      .eq("user_id", user.id);

    setPoints(after);
    setClaimedAmount(reward);
    setClaimPopupOpen(true);
    setCooldownText(formatCooldown(now));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("guest_mode");
    window.location.href = "/";
  };

  return (
    <>
      <div className="mb-6 flex justify-between items-start gap-4">
        <div>
          <button
            onClick={() => setReturnPopupOpen(true)}
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="/images/title.png"
              alt="Title"
              className="w-32 object-contain"
            />
          </button>
        </div>

        <div className="text-right">
          <p className="text-sm text-zinc-300 mb-2">{email ?? "Guest"}</p>

          <div className="flex justify-end gap-3 mb-3">
  <Link
    href="/menu"
    className="text-zinc-400 hover:text-white text-sm"
  >
    Menu
  </Link>

  <Link
    href="/gacha"
    className="text-zinc-400 hover:text-white text-sm"
  >
    Gacha
  </Link>

  <Link
    href="/inventory"
    className="text-zinc-400 hover:text-white text-sm"
  >
    Inventory
  </Link>

  <Link
    href="/history"
    className="text-zinc-400 hover:text-white text-sm"
  >
    History
  </Link>
</div>

          <p className="text-emerald-400 text-xl font-bold mb-3">
            Points: {points}
          </p>

          {isGuest ? (
            <a
              href="/login"
              className="inline-block bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-sm font-semibold mb-2"
            >
              Sign Up / Log In
            </a>
          ) : email ? (
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-semibold mb-2"
            >
              Logout
            </button>
          ) : (
            <a
              href="/login"
              className="inline-block bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-sm font-semibold mb-2"
            >
              Sign Up / Log In
            </a>
          )}

          <div>
            <button
              onClick={claimDailyReward}
              disabled={!!cooldownText}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                cooldownText
                  ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              Claim Daily Reward
            </button>

            <div className="mt-2">
  <button
    onClick={() => {
      const next = !muted;
      setMuted(next);
      setBgmMuted(next);
    }}
    className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm font-semibold"
  >
    {muted ? "BGM: Muted" : "BGM: On"}
  </button>

  <button
  onClick={() => playBgm()}
  className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-semibold mt-2"
>
  Resume BGM
</button>

  <input
    type="range"
    min="0"
    max="1"
    step="0.05"
    value={volume}
    onChange={(e) => {
      const next = Number(e.target.value);
      setVolume(next);
      setBgmVolume(next);
    }}
    className="w-24 ml-2"
  />
</div>

            {cooldownText && (
              <p className="text-xs text-zinc-400 mt-1">{cooldownText}</p>
            )}
          </div>
        </div>
      </div>

      {returnPopupOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-3">
              Return to Title Screen?
            </h2>

            <p className="text-zinc-300 mb-6">
              Current progress will remain saved.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setReturnPopupOpen(false)}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded-xl font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  window.location.href = "/";
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-xl font-semibold"
              >
                Return
              </button>
            </div>
          </div>
        </div>
      )}

      {claimPopupOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-3">Daily Reward Claimed</h2>

            <p className="text-emerald-400 text-xl font-bold mb-6">
              +{claimedAmount} Points
            </p>

            <button
              onClick={() => setClaimPopupOpen(false)}
              className="w-full bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-xl font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}