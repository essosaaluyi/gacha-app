"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TopBar from "@/components/TopBar";
import { playBgm } from "@/lib/audio/bgmStore";
import LegalFooter from "@/components/trust/LegalFooter";
import { initializeWallet } from "@/lib/wallet/walletStore";
import { hasSavedBattleSession, clearBattleSession } from "@/lib/battle-pixi/state/battleSessionStore";

export default function MenuPage() {
  const router = useRouter();
  const [guestNoticeOpen, setGuestNoticeOpen] = useState(false);
  const [canResume, setCanResume] = useState(false);

  // Balance display and daily claim live in TopBar via the unified wallet.
  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      localStorage.removeItem("guest_mode");
    } else if (localStorage.getItem("guest_mode") === "true") {
      setGuestNoticeOpen(true);
    }

    await initializeWallet();
    setCanResume(hasSavedBattleSession());
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUser();
      playBgm();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleResume = () => {
    localStorage.setItem("battle_resume_requested", "true");
    router.push("/battle");
  };

  const handleDismissResume = () => {
    clearBattleSession();
    setCanResume(false);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-6 relative flex flex-col">
      <TopBar />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <img
          src="/images/gachabanner.webp"
          alt="Gacha Banner"
          className="w-full max-w-3xl object-contain mb-6 rounded-2xl"
        />

        {canResume && (
          <div className="mb-4 w-full max-w-md flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResume}
              className="w-full bg-amber-600 hover:bg-amber-500 px-8 py-4 rounded-2xl text-2xl font-bold text-center transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              Continue Battle
            </button>
            <button
              type="button"
              onClick={handleDismissResume}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Dismiss saved session
            </button>
          </div>
        )}

        <Link
          href="/gacha"
          className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl text-2xl font-bold text-center transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          Pull and Play
        </Link>

        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-zinc-400">
          <Link href="/how-to-play" className="hover:text-white">
            How To Play
          </Link>
          <Link href="/rules" className="hover:text-white">
            Rules / Odds
          </Link>
          <Link href="/support" className="hover:text-white">
            Support
          </Link>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4">
        <LegalFooter compact />
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
