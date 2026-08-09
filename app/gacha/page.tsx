"use client";

import DailyGachaPanel from "@/components/gacha/DailyGachaPanel";
import PullSelection from "@/components/gacha/PullSelection";
import ResultGrid from "@/components/gacha/ResultGrid";
import RevealPlayer from "@/components/gacha/RevealPlayer";
import TopBar from "@/components/TopBar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ResultActions from "@/components/gacha/ResultActions";
import { type Card, pullMany } from "@/lib/gacha/pullLogic";
import { chooseRevealPlan } from "@/lib/gacha/revealLogic";
import { preloadRevealVideos } from "@/lib/gacha/revealPreload";
import {
  saveGuestResults,
  saveUserResults,
} from "@/lib/gacha/saveResults";
import { setBgmMuted } from "@/lib/audio/bgmStore";
import {
  getWalletState,
  initializeWallet,
  spendPoints,
  subscribeWallet,
} from "@/lib/wallet/walletStore";

// Used until the server's point_settings rows load, and whenever they are
// absent. These are the only hardcoded prices left: the pack labels and the
// confirm dialog both read the fetched values below.
const FALLBACK_PULL_COSTS = { single: 100, ten: 1000 };

export default function GachaPage() {
  const router = useRouter();
  const [results, setResults] = useState<Card[]>([]);
  const [pendingResults, setPendingResults] = useState<Card[]>([]);
  const [message, setMessage] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [pullCount, setPullCount] = useState(1);
  const [revealVideo, setRevealVideo] = useState("/videos/standard.mp4");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [, setPoints] = useState<number>(0);
  const [, setEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [revealPreparing, setRevealPreparing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCount, setConfirmCount] = useState(1);
  const [confirmCost, setConfirmCost] = useState(0);
  // Fetched once, then used for both the pack labels and the confirm dialog, so
  // the advertised price and the charged price cannot disagree.
  const [pullCosts, setPullCosts] = useState(FALLBACK_PULL_COSTS);

  const [freezeActive, setFreezeActive] = useState(false);
  const [freezeTriggered, setFreezeTriggered] = useState(false);
  const [freezeTime, setFreezeTime] = useState<number | null>(null);
  const [mainRevealStopped, setMainRevealStopped] = useState(false);
  const [revealFinished, setRevealFinished] = useState(false);

  async function loadUserData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setIsGuest(false);
      setEmail(`User ${user.id.slice(0, 8)}`);
    } else if (localStorage.getItem("guest_mode") === "true") {
      setIsGuest(true);
      setEmail("Guest");
    } else {
      setEmail(null);
    }

    await initializeWallet();
  }

  useEffect(() => {
    preloadRevealVideos();

    const timer = window.setTimeout(() => {
      void loadUserData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Unified wallet: mirror the shared balance into this page's display.
  useEffect(() => {
    const syncPoints = () => setPoints(getWalletState().points);
    syncPoints();
    return subscribeWallet(syncPoints);
  }, []);

  // Both prices in one request on mount, rather than one request per click of a
  // pack. The pack labels used to be hardcoded text while only the confirm
  // dialog asked the server, so changing single_pull_cost in /admin made the
  // advertised price wrong.
  useEffect(() => {
    let cancelled = false;

    void supabase
      .from("point_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["single_pull_cost", "ten_pull_cost"])
      .then(({ data }) => {
        if (cancelled || !data) return;

        const byKey = Object.fromEntries(
          data.map((row) => [row.setting_key, row.setting_value])
        );

        setPullCosts({
          single: byKey.single_pull_cost ?? FALLBACK_PULL_COSTS.single,
          ten: byKey.ten_pull_cost ?? FALLBACK_PULL_COSTS.ten,
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const askPullConfirm = (count: number) => {
    setConfirmCount(count);
    setConfirmCost(count === 10 ? pullCosts.ten : pullCosts.single);
    setConfirmOpen(true);
  };

  const startPull = async (count: number, cost: number) => {
    setConfirmOpen(false);
    setRevealPreparing(true);
    setMessage("Pulling...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isGuest) {
      setRevealPreparing(false);
      setMessage("Please log in first.");
      return;
    }

    const paid = await spendPoints(cost, "gacha_pull");

    if (!paid) {
      setRevealPreparing(false);
      setMessage("Not enough points.");
      return;
    }

    const pulled = pullMany(count);
  
    const revealPlan = await chooseRevealPlan(pulled);

    const hasUR = pulled.some((card) => card.rarity === "UR");
    

    if (hasUR && Math.random() * 100 < revealPlan.freezeChance) {
      const randomFreezeTime = 6 + Math.random() * 10;
      setFreezeTime(randomFreezeTime);
    } else {
      setFreezeTime(null);
    }

    setFreezeTriggered(false);
    setFreezeActive(false);
    setMainRevealStopped(false);
    setRevealFinished(false);
    setRevealVideo(revealPlan.video);
    setPullCount(count);
    setPendingResults(pulled);
    setResults([]);
    setBgmMuted(true);
    setRevealPreparing(false);
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
} catch (error: unknown) {
  setMessage(error instanceof Error ? error.message : "Failed to save pull.");
}
  };

  const continueToBattleOrder = () => {
    localStorage.setItem("pending_battle_cards", JSON.stringify(results));
    router.push("/battle-order");
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-6">
      <TopBar />

      <div className="max-w-5xl mx-auto px-6">
        <img
          src="/images/widebanner.webp"
          alt="Gacha Banner"
          className="w-full max-w-5xl mx-auto object-contain rounded-2xl mb-6"
        />

        {!revealPreparing && !isRevealing && results.length === 0 && (
  <>
    <DailyGachaPanel />
    <PullSelection
      askPullConfirm={askPullConfirm}
      costs={pullCosts}
    />
  </>
)}

        {message && <p className="text-zinc-300 mb-6 text-center">{message}</p>}

        {revealPreparing && (
          <div className="reveal-loading-layer mb-8">
            <div className="reveal-loading-stage">
              <div className="reveal-loading-ring" />
              <div className="reveal-loading-core" />
              <p className="reveal-loading-text">REVEAL STANDBY</p>
            </div>
          </div>
        )}

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

            <button
              onClick={continueToBattleOrder}
              className="group mt-8 animate-battleGlow hover:scale-105 active:scale-95 transition-transform duration-200 w-full flex flex-col items-center gap-2"
            >
              <span className="text-sm font-black tracking-[0.3em] text-blue-200">
                CONTINUE TO BATTLE
              </span>
              <img
                src="/images/beginbattle.webp"
                alt="Continue to Battle"
                className="w-full max-w-[760px] object-contain drop-shadow-[0_0_25px_rgba(59,130,246,0.7)] group-hover:drop-shadow-[0_0_42px_rgba(96,165,250,1)] transition-all duration-300"
              />
            </button>

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
