"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getBgmMuted,
  pauseBgm,
  setBgmMuted,
} from "@/lib/audio/bgmStore";
import { playBgm } from "@/lib/audio/bgmStore";
import {
  addPoints,
  getWalletState,
  initializeWallet,
  subscribeWallet,
} from "@/lib/wallet/walletStore";
import { logEvent } from "@/lib/events/gameEventStore";
import { patchConfig } from "@/lib/game-config/patchConfig";
import GiftBoxOverlay from "@/components/GiftBoxOverlay";
import { getClaimableCount } from "@/lib/giftbox/giftBoxStore";

function MusicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18.5a2.5 2.5 0 1 1-1.5-2.29V5.5l10-2v11.25a2.5 2.5 0 1 1-1.5-2.29V7.1l-7 1.4v10Z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.25v13.5L18.5 12 8 5.25Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5.5h4v13H7v-13Zm6 0h4v13h-4v-13Z" />
    </svg>
  );
}

export default function TopBar() {
  const [email, setEmail] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [isGuest, setIsGuest] = useState(false);
  const [, setDailyReward] = useState(0);
  const [cooldownText, setCooldownText] = useState("");
  const [claimPopupOpen, setClaimPopupOpen] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [returnPopupOpen, setReturnPopupOpen] = useState(false);

const [muted, setMuted] = useState(() => getBgmMuted());
const [playing, setPlaying] = useState(false);
const [welcomeGiftOpen, setWelcomeGiftOpen] = useState(false);
const [welcomeGiftAmount, setWelcomeGiftAmount] = useState(0);
const [giftBoxOpen, setGiftBoxOpen] = useState(false);
const [giftClaimable, setGiftClaimable] = useState(0);

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

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      localStorage.removeItem("guest_mode");
      setIsGuest(false);
      setEmail(`User ${user.id.slice(0, 8)}`);

      const { data } = await supabase
        .from("user_points")
        .select("last_daily_claim")
        .eq("user_id", user.id)
        .single();

      setCooldownText(formatCooldown(data?.last_daily_claim ?? null));

      const reward = await getPointSetting(
        "member_daily_points",
        patchConfig.dailyClaim.memberDaily
      );
      setDailyReward(reward);

      await initializeWallet();
      return;
    }

    const guestMode = localStorage.getItem("guest_mode");

    if (guestMode === "true") {
      setIsGuest(true);
      setEmail("Guest");

      const giftClaimed =
        localStorage.getItem("guest_welcome_gift_claimed") === "true";

      await initializeWallet();

      if (!giftClaimed) {
        localStorage.setItem("guest_welcome_gift_claimed", "true");
        await addPoints(1000, "welcome_gift");
        setWelcomeGiftAmount(1000);
        setWelcomeGiftOpen(true);
      }

      const guestLastClaim = localStorage.getItem("guest_last_daily_claim");
      setCooldownText(formatCooldown(guestLastClaim));

      const reward = await getPointSetting(
        "guest_daily_points",
        patchConfig.dailyClaim.guestDaily
      );
      setDailyReward(reward);
      return;
    }

    setEmail(null);
    setPoints(0);
  }

  const claimDailyReward = async () => {
    const now = new Date().toISOString();

    if (isGuest) {
      const lastClaim = localStorage.getItem("guest_last_daily_claim");

      if (formatCooldown(lastClaim)) return;

      const reward = await getPointSetting(
        "guest_daily_points",
        patchConfig.dailyClaim.guestDaily
      );

      localStorage.setItem("guest_last_daily_claim", now);
      await addPoints(reward, "daily_claim");
      logEvent({ kind: "dailyClaim", detail: { reward, tier: "guest" } });

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
      .select("last_daily_claim")
      .eq("user_id", user.id)
      .single();

    if (formatCooldown(data?.last_daily_claim ?? null)) return;

    const reward = await getPointSetting(
      "member_daily_points",
      patchConfig.dailyClaim.memberDaily
    );

    await supabase
      .from("user_points")
      .update({ last_daily_claim: now })
      .eq("user_id", user.id);

    await addPoints(reward, "daily_claim");
    logEvent({ kind: "dailyClaim", detail: { reward, tier: "member" } });

    setClaimedAmount(reward);
    setClaimPopupOpen(true);
    setCooldownText(formatCooldown(now));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("guest_mode");
    window.location.href = "/";
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUser();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Gift box badge: refresh on mount and whenever the overlay closes.
  useEffect(() => {
    if (!giftBoxOpen) setGiftClaimable(getClaimableCount());
  }, [giftBoxOpen]);

  // Unified wallet: the points readout always mirrors the shared balance.
  useEffect(() => {
    const syncPoints = () => setPoints(getWalletState().points);
    syncPoints();
    return subscribeWallet(syncPoints);
  }, []);

  return (
    <>
      {/* The shell owns the bar's width so it renders identically on every
          page, regardless of the content container it sits above. */}
      <header className="game-topbar-shell">
      <div className="game-topbar">
        <div className="game-topbar-brand">
          <button
            onClick={() => setReturnPopupOpen(true)}
            className="game-topbar-logo"
          >
            <img
              src="/images/title.webp"
              alt="Title"
            />
          </button>
        </div>

        <nav className="game-topbar-nav" aria-label="Game navigation">
          <Link href="/menu">Menu</Link>
          <Link href="/gacha">Gacha</Link>
          <Link href="/inventory">Cards</Link>
          <Link href="/history">History</Link>
          {/* Shop is visible either way: unlocked when enabled, tagged as
              coming soon while redeeming is still gated. */}
          <Link href="/shop" className="game-topbar-nav-item">
            Shop
            {!patchConfig.shop.enabled && (
              <span className="game-topbar-nav-tag">Coming Soon</span>
            )}
          </Link>
          <Link href="/how-to-play">Game Info</Link>
          <Link href="/rules">Rules</Link>
          <Link href="/support">Support</Link>
        </nav>

        <div className="game-topbar-actions">
          <div className="game-topbar-tools">
            <button
              onClick={claimDailyReward}
              disabled={!!cooldownText}
              className="game-topbar-tool"
            >
              {cooldownText ? cooldownText : "Daily Gift"}
            </button>

            <button
              onClick={() => setGiftBoxOpen(true)}
              className="game-topbar-tool relative"
            >
              Gift Box
              {giftClaimable > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-black flex items-center justify-center">
                  {giftClaimable}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                const next = !muted;
                setMuted(next);
                setBgmMuted(next);
              }}
              className={`game-topbar-icon-button ${
                muted ? "game-topbar-icon-button-muted" : ""
              }`}
              aria-label={muted ? "Unmute music" : "Mute music"}
              title={muted ? "Unmute music" : "Mute music"}
            >
              <MusicIcon />
            </button>

            <button
              onClick={() => {
                if (playing) {
                  pauseBgm();
                  setPlaying(false);
                  return;
                }

                void playBgm();
                setPlaying(true);
              }}
              className="game-topbar-icon-button"
              aria-label={playing ? "Pause music" : "Play music"}
              title={playing ? "Pause music" : "Play music"}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>

          <div className="game-topbar-play-stack">
            <div className="game-topbar-account-row">
              {isGuest ? (
                <a
                  href="/login"
                  className="game-topbar-account-link"
                >
                  Login
                </a>
              ) : email ? (
                <button
                  onClick={logout}
                  className="game-topbar-account-link"
                >
                  Logout
                </button>
              ) : (
                <a
                  href="/login"
                  className="game-topbar-account-link"
                >
                  Login
                </a>
              )}

              <div className="game-topbar-account">
                <span>{email ?? "Guest"}</span>
                <strong>{points.toLocaleString()} pts</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
      </header>

      {returnPopupOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-3">
              Return to Title Screen?
            </h2>

            <p className="text-zinc-300 mb-6">
              {isGuest
  ? "Guest data will be reset if you return to the title screen."
  : "Current progress will remain saved."}
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
  if (isGuest) {
    localStorage.removeItem("guest_mode");
    localStorage.removeItem("guest_points");
    localStorage.removeItem("guest_inventory");
    localStorage.removeItem("guest_history");
    localStorage.removeItem("guest_last_daily_claim");
    localStorage.removeItem("guest_welcome_gift_claimed");
  }

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
      {giftBoxOpen && <GiftBoxOverlay onClose={() => setGiftBoxOpen(false)} />}

      {welcomeGiftOpen && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md text-white text-center">
      <h2 className="text-2xl font-bold mb-4">
        Thank You for Playing!
      </h2>

      <p className="text-zinc-300 mb-4">
        You received a welcome gift.
      </p>

      <p className="text-emerald-400 text-2xl font-bold mb-6">
        +{welcomeGiftAmount} Points
      </p>

      <button
        onClick={() => setWelcomeGiftOpen(false)}
        className="w-full bg-blue-600 hover:bg-blue-500 p-3 rounded-xl font-semibold"
      >
        OK
      </button>
    </div>
  </div>
)}
    </>
  );
}
