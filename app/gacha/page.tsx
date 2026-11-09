"use client";

import RevealLoading from "@/components/gacha/RevealLoading";

import PullSelection from "@/components/gacha/PullSelection";
import ResultGrid from "@/components/gacha/ResultGrid";
import CardFrame from "@/components/gacha/CardFrame";
import RevealPlayer from "@/components/gacha/RevealPlayer";
import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import SoftDialog from "@/components/site/SoftDialog";
import SiteIcon from "@/components/site/SiteIcon";
import { useEffect, useRef, useState } from "react";
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
const PackReveal3D = dynamic(() => import("@/components/gacha/PackReveal3D"), {
  ssr: false,
  loading: () => <p role="status">Loading pack...</p>,
});

export default function GachaPage() {
  const router = useRouter();
  const [results, setResults] = useState<Card[]>([]);
  const [pendingResults, setPendingResults] = useState<Card[]>([]);
  const [message, setMessage] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [pullCount, setPullCount] = useState(5);
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
  // Owner-approved: retain the old pack's unit price/discount, at half the
  // quantity. Keep its existing setting key; no database migration is needed.
  const fivePullCost = pullCosts.ten / 2;
  const pullInFlightRef = useRef(false);
  const revealFinishedRef = useRef(false);

  const [freezeActive, setFreezeActive] = useState(false);
  const [freezeTriggered, setFreezeTriggered] = useState(false);
  const [freezeTime, setFreezeTime] = useState<number | null>(null);
  const [mainRevealStopped, setMainRevealStopped] = useState(false);
  const [packActive, setPackActive] = useState(false);
  const [packFinished, setPackFinished] = useState(false);
  const [saveSettled, setSaveSettled] = useState(false);
  const [pullRun, setPullRun] = useState(0);
  const pullRunRef = useRef(0);
  const mountedRef = useRef(false);
  const packFinishedRef = useRef(false);
  const resultsReady = packFinished && saveSettled && results.length > 0;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pullRunRef.current += 1;
      setBgmMuted(false);
    };
  }, []);

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

  const askPullConfirm = (count: 1 | 5) => {
    if (count !== 5) return;
    if (count === 5 && !isGuest) return;
    setConfirmCount(count);
    setConfirmCost(fivePullCost);
    setConfirmOpen(true);
  };

  const startPull = async (count: number, cost: number) => {
    if (count !== 5 || pullInFlightRef.current) return;
    if (count === 5 && !isGuest) return;
    pullInFlightRef.current = true;
    const run = ++pullRunRef.current;
    setPullRun(run);
    setPackActive(false);
    setPackFinished(false);
    packFinishedRef.current = false;
    setSaveSettled(false);
    setSelectedImage(null);
    setConfirmOpen(false);
    setRevealPreparing(true);
    setMessage("Pulling...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isGuest) {
      pullInFlightRef.current = false;
      setRevealPreparing(false);
      setMessage("Please log in first.");
      return;
    }

    // Local saving supports five, but the inactive database's pull_type
    // constraint has not been verified. Keep members blocked before payment,
    // including auth changes after the dialog opened, until DB compatibility
    // is confirmed. Do not turn a failed paid save into a successful pull.
    if (count === 5 && user) {
      pullInFlightRef.current = false;
      setRevealPreparing(false);
      setMessage("5 Pull is currently available in guest mode.");
      return;
    }

    const paid = await spendPoints(cost, "gacha_pull");

    if (!paid) {
      pullInFlightRef.current = false;
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
    revealFinishedRef.current = false;
    setFreezeActive(false);
    setMainRevealStopped(false);
    setRevealVideo(revealPlan.video);
    setPullCount(count);
    setPendingResults(pulled);
    setResults([]);
    setBgmMuted(true);
    setRevealPreparing(false);
    setIsRevealing(true);
  };

  const finishReveal = async () => {
    if (!mountedRef.current || pullRun !== pullRunRef.current || revealFinishedRef.current) return;
    revealFinishedRef.current = true;
    setBgmMuted(false);

    setIsRevealing(false);
    setPackActive(true);
    setFreezeActive(false);
    setMainRevealStopped(false);
    setResults([]);

    // Persist the committed draw at the same video-end boundary as before.
    // Pack completion is presentation-only, including repeated/stale callbacks.
    const isCurrentRun = () => mountedRef.current && pullRun === pullRunRef.current;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      localStorage.setItem("battle_player_cards", JSON.stringify(pendingResults));
      if (!user) {
        await saveGuestResults(pendingResults);
      } else {
        await saveUserResults(user.id, pullCount, pendingResults);
      }
      if (isCurrentRun()) setMessage(user ? "Pull saved." : "Guest pull complete.");
    } catch (error: unknown) {
      if (isCurrentRun()) {
        setMessage(error instanceof Error ? error.message : "Failed to save pull.");
      }
    } finally {
      if (isCurrentRun()) {
        setResults(pendingResults);
        setSaveSettled(true);
      }
    }
  };

  const finishPack = () => {
    if (!mountedRef.current || pullRun !== pullRunRef.current ||
        !revealFinishedRef.current || packFinishedRef.current) return;
    packFinishedRef.current = true;
    setPackFinished(true);
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

        {!revealPreparing && !isRevealing && !packActive && results.length === 0 && (
  <>
    <PullSelection
      askPullConfirm={askPullConfirm}
      costs={{ five: fivePullCost }}
      fiveUnavailableReason={!isGuest ? "5 Pull is currently available in guest mode." : undefined}
    />
  </>
)}

        {message && <p className="text-zinc-300 mb-6 text-center">{message}</p>}

        {revealPreparing && (
          <RevealLoading />
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

        {packActive && !packFinished && (
          <PackReveal3D key={pullRun} cards={pendingResults} onComplete={finishPack} packImage="/images/pack-isolated-legends-v1-r01.png" />
        )}

        {packFinished && !saveSettled && (
          <p role="status">Saving pull...</p>
        )}

        {resultsReady && (
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
    setPackActive(false);
    setPackFinished(false);
    setSaveSettled(false);
    setSelectedImage(null);
    revealFinishedRef.current = false;
    packFinishedRef.current = false;
    pullInFlightRef.current = false;
    pullRunRef.current += 1;
  }}
/>
          </>
        )}
      </div>

      {confirmOpen && (
        <SoftDialog open onClose={() => setConfirmOpen(false)} title="Confirm Pull">
            <div className="site-dialog-symbol"><SiteIcon name="pack" /></div>
            <p className="site-dialog-copy">
              Spend {confirmCost} points for{" "}
              one pack of 5 cards?
            </p>

              <button
                onClick={() => startPull(confirmCount, confirmCost)}
                className="site-primary site-button-full"
              >
                Open pack<SiteIcon name="arrow" />
              </button>
        </SoftDialog>
      )}


      <SoftDialog open={selectedImage !== null} onClose={() => setSelectedImage(null)} title="Card preview" wide>{selectedImage && <CardFrame src={selectedImage} alt="Full card" rarity={results.find(card => card.image === selectedImage)?.rarity ?? "R"} inspection />}</SoftDialog>
    </main>
  );
}
