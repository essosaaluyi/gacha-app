"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TopBar from "@/components/TopBar";
import { playBgm } from "@/lib/audio/bgmStore";

export default function MenuPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [guestNoticeOpen, setGuestNoticeOpen] = useState(false);
  const [dailyMessage, setDailyMessage] = useState("");
  const [dailyReward, setDailyReward] = useState(0);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    loadUser();
    playBgm();
  }, []);

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
        .select("points")
        .eq("user_id", user.id)
        .single();

      setPoints(data?.points ?? 0);

      const reward = await getPointSetting("member_daily_points", 300);
      setDailyReward(reward);

      return;
    }

    const guestMode = localStorage.getItem("guest_mode");

    if (guestMode === "true") {
      setIsGuest(true);
      setEmail("Guest");

      const guestPoints = localStorage.getItem("guest_points");
      setPoints(Number(guestPoints ?? 0));

      const reward = await getPointSetting("guest_daily_points", 100);
      setDailyReward(reward);

      setGuestNoticeOpen(true);

      return;
    }

    setEmail(null);
    setPoints(0);
  };

  const getPointSetting = async (key: string, fallback: number) => {
    const { data } = await supabase
      .from("point_settings")
      .select("setting_value")
      .eq("setting_key", key)
      .single();

    return data?.setting_value ?? fallback;
  };

  const canClaimDaily = (lastClaim: string | null) => {
    if (!lastClaim) return true;

    const last = new Date(lastClaim).getTime();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return now - last >= oneDay;
  };

  const claimDailyReward = async () => {
    setDailyMessage("");

    const now = new Date().toISOString();

    if (isGuest) {
      const lastClaim = localStorage.getItem("guest_last_daily_claim");

      if (!canClaimDaily(lastClaim)) {
        setDailyMessage("Daily reward already claimed.");
        return;
      }

      const reward = await getPointSetting("guest_daily_points", 100);
      const before = points;
      const after = before + reward;

      localStorage.setItem("guest_points", String(after));
      localStorage.setItem("guest_last_daily_claim", now);

      setPoints(after);
      setDailyReward(reward);
      setDailyMessage(`Daily reward claimed: ${before} → ${after}`);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setDailyMessage("Please log in first.");
      return;
    }

    const { data: pointRow } = await supabase
      .from("user_points")
      .select("points, last_daily_claim")
      .eq("user_id", user.id)
      .single();

    if (!canClaimDaily(pointRow?.last_daily_claim ?? null)) {
      setDailyMessage("Daily reward already claimed.");
      return;
    }

    const reward = await getPointSetting("member_daily_points", 300);
    const before = pointRow?.points ?? 0;
    const after = before + reward;

    await supabase
      .from("user_points")
      .update({
        points: after,
        last_daily_claim: now,
      })
      .eq("user_id", user.id);

    setPoints(after);
    setDailyReward(reward);
    setDailyMessage(`Daily reward claimed: ${before} → ${after}`);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("guest_mode");
    window.location.href = "/";
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 relative">
      <div className="absolute top-6 left-6 right-6 z-20">
  <TopBar />
</div>

      {/* Main content */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <img
          src="/images/gachabanner.png"
          alt="Gacha Banner"
          className="w-full max-w-3xl object-contain mb-6 rounded-2xl"
        />

        <Link
          href="/gacha"
          className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl text-2xl font-bold text-center transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          Pull and Play
        </Link>

        
      </div>

      {guestNoticeOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md text-white">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Guest Mode Notice
            </h2>

            <div className="text-sm text-zinc-300 space-y-3 mb-6">
              <p>Guest progress is stored only on this browser and device.</p>

              <p>
                Guest data may be lost if browser data is cleared, the browser
                is reinstalled, or another device is used.
              </p>

              <p className="text-yellow-400">
                Create an account to permanently save your progress.
              </p>
            </div>

            <button
              onClick={() => setGuestNoticeOpen(false)}
              className="w-full bg-blue-600 hover:bg-blue-500 p-3 rounded-xl font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}