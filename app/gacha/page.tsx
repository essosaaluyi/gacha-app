"use client";

import PullSelection from "@/components/gacha/PullSelection";
import ResultGrid from "@/components/gacha/ResultGrid";
import RevealPlayer from "@/components/gacha/RevealPlayer";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ResultActions from "@/components/gacha/ResultActions";
import { type Card, pullMany } from "@/lib/gacha/pullLogic";
import {
  chooseRevealVideo,
  getFreezeSettings,
} from "@/lib/gacha/revealLogic";
import {
  saveGuestResults,
  saveUserResults,
} from "@/lib/gacha/saveResults";
import { setBgmMuted } from "@/lib/audio/bgmStore";


export default function GachaPage() {
  const [results, setResults] = useState<Card[]>([]);
  const [pendingResults, setPendingResults] = useState<Card[]>([]);
  const [message, setMessage] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [pullCount, setPullCount] = useState(1);
  const [revealVideo, setRevealVideo] = useState("/videos/standard.mp4");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [email, setEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCount, setConfirmCount] = useState(1);
  const [confirmCost, setConfirmCost] = useState(0);

  const [freezeActive, setFreezeActive] = useState(false);
  const [freezeTriggered, setFreezeTriggered] = useState(false);
  const [freezeTime, setFreezeTime] = useState<number | null>(null);
  const [mainRevealStopped, setMainRevealStopped] = useState(false);
  const [revealFinished, setRevealFinished] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setIsGuest(false);
      setEmail(`User ${user.id.slice(0, 8)}`);

      const { data } = await supabase
        .from("user_points")
        .select("points")
        .eq("user_id", user.id)
        .single();

      setPoints(data?.points ?? 0);
      return;
    }

    const guestMode = localStorage.getItem("guest_mode");

    if (guestMode === "true") {
      setIsGuest(true);
      setEmail("Guest");

      const guestPoints = Number(localStorage.getItem("guest_points") ?? 0);
      setPoints(guestPoints);
      return;
    }

    setEmail(null);
    setPoints(0);
  };

  const askPullConfirm = async (count: number) => {
    const costKey = count === 10 ? "ten_pull_cost" : "single_pull_cost";

    const { data: costData } = await supabase
      .from("point_settings")
      .select("setting_value")
      .eq("setting_key", costKey)
      .single();

    const cost = costData?.setting_value ?? (count === 10 ? 1000 : 100);

    setConfirmCount(count);
    setConfirmCost(cost);
    setConfirmOpen(true);
  };

  const startPull = async (count: number, cost: number) => {
    setConfirmOpen(false);
    setMessage("Pulling...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let currentPoints = 0;

    if (user) {
      const { data: pointData } = await supabase
        .from("user_points")
        .select("points")
        .eq("user_id", user.id)
        .single();

      currentPoints = pointData?.points ?? 0;

      if (currentPoints < cost) {
        setMessage("Not enough points.");
        return;
      }

      const newPoints = currentPoints - cost;

      await supabase
        .from("user_points")
        .update({ points: newPoints })
        .eq("user_id", user.id);

      setPoints(newPoints);
    } else if (isGuest) {
      currentPoints = Number(localStorage.getItem("guest_points") ?? 0);

      if (currentPoints < cost) {
        setMessage("Not enough points.");
        return;
      }

      const newPoints = currentPoints - cost;
      localStorage.setItem("guest_points", String(newPoints));
      setPoints(newPoints);
    } else {
      setMessage("Please log in first.");
      return;
    }

    const pulled = pullMany(count);
  
    const selectedVideo = await chooseRevealVideo(pulled);

    const hasUR = pulled.some((card) => card.rarity === "UR");
    const { freezeChance } =
  await getFreezeSettings();
    

    if (hasUR && Math.random() * 100 < freezeChance) {
      const randomFreezeTime = 6 + Math.random() * 10;
      setFreezeTime(randomFreezeTime);
    } else {
      setFreezeTime(null);
    }

    setFreezeTriggered(false);
    setFreezeActive(false);
    setMainRevealStopped(false);
    setRevealFinished(false);
    setRevealVideo(selectedVideo);
    setPullCount(count);
    setPendingResults(pulled);
    setResults([]);
    setBgmMuted(true);
    setIsRevealing(true);
  };

  const finishReveal = async () => {
    if (revealFinished) return;
    setBgmMuted(false);

    setRevealFinished(true);
    setIsRevealing(false);
    setFreezeActive(false);
    setMainRevealStopped(false);
    setResults([]);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setResults(pendingResults);

    if (!user) {
      await saveGuestResults(pendingResults);

setMessage("Guest pull complete.");
return;
    }

    try {
  await saveUserResults(
    user.id,
    pullCount,
    pendingResults
  );

  setMessage("Pull saved.");
} catch (error: any) {
  setMessage(error.message);
}
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <TopBar />

        <img
          src="/images/widebanner.png"
          alt="Gacha Banner"
          className="w-full max-w-5xl mx-auto object-contain rounded-2xl mb-6"
        />

        {!isRevealing && results.length === 0 && (
  <PullSelection
    askPullConfirm={askPullConfirm}
  />
)}

        {message && <p className="text-zinc-300 mb-6 text-center">{message}</p>}

        <RevealPlayer
  isRevealing={isRevealing}
  revealVideo={revealVideo}
  freezeActive={freezeActive}
  freezeTriggered={freezeTriggered}
  freezeTime={freezeTime}
  mainRevealStopped={mainRevealStopped}

  setFreezeTriggered={setFreezeTriggered}
  setFreezeActive={setFreezeActive}
  setMainRevealStopped={setMainRevealStopped}

  finishReveal={finishReveal}
/>

        {results.length > 0 && !isRevealing && (
          <>
            <h2 className="text-2xl font-bold mb-4">Pull Results</h2>

            <ResultGrid
  results={results}
  setSelectedImage={setSelectedImage}
/>

            <ResultActions
  resetPull={() => {
    setResults([]);
    setPendingResults([]);
    setMessage("");
    setIsRevealing(false);
  }}
/>
          </>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-3">Confirm Pull</h2>

            <p className="text-zinc-300 mb-6">
              Spend {confirmCost} points for{" "}
              {confirmCount === 10 ? "10 Pull" : "Single Pull"}?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded-xl font-semibold"
              >
                No
              </button>

              <button
                onClick={() => startPull(confirmCount, confirmCost)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-xl font-semibold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Enlarged card"
            className="max-w-full max-h-full object-contain rounded-2xl"
          />
        </div>
      )}
    </main>
  );
}