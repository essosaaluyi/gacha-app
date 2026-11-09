"use client";

import Image from "next/image";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TopBar from "@/components/TopBar";
import SiteIcon from "@/components/site/SiteIcon";
import SoftDialog from "@/components/site/SoftDialog";
import { playBgm } from "@/lib/audio/bgmStore";
import LegalFooter from "@/components/trust/LegalFooter";
import { initializeWallet } from "@/lib/wallet/walletStore";
import { hasSavedBattleSession, clearBattleSession } from "@/lib/battle-pixi/state/battleSessionStore";

/** Set once the guest has acknowledged how guest saves work. */
const GUEST_NOTICE_SEEN_KEY = "guest_notice_seen";

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
    } else if (
      localStorage.getItem("guest_mode") === "true" &&
      localStorage.getItem(GUEST_NOTICE_SEEN_KEY) !== "true"
    ) {
      // Once per browser, not once per visit to the menu -- it is a one-time
      // explanation of how guest saves work, and re-showing it on every return
      // to the menu just trains people to dismiss it without reading.
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
    <main className="min-h-screen pb-6 relative flex flex-col">
      <TopBar />
      <div className="site-menu-shell">
        {canResume && <div className="site-menu-resume"><button type="button" onClick={handleResume}>Continue your battle →</button><button type="button" onClick={handleDismissResume}>Dismiss saved session</button></div>}
        <section className="site-menu-hero">
          <div><p className="site-eyebrow">WELCOME TO DESTINY WARS</p><h1>A new pack.<br /><span>Endless possibilities.</span></h1><p>Find your next favorite character.<br />Open a pack, build your hand, and step into battle.</p><Link href="/gacha" className="site-primary">Pull and play<SiteIcon name="arrow" /></Link></div>
          <div className="site-menu-art"><Image unoptimized width={400} height={600} src="/images/cards/player/UR1/card.webp" alt="Discover rare Destiny Wars characters" /></div>
        </section>
        <div className="site-menu-links"><Link href="/inventory" className="site-menu-link"><SiteIcon name="cards" /><span>Card Archive<small>Your collection, all in one place</small></span><SiteIcon name="arrow" /></Link><Link href="/history" className="site-menu-link"><SiteIcon name="history" /><span>Pull History<small>Look back at your discoveries</small></span><SiteIcon name="arrow" /></Link><Link href="/how-to-play" className="site-menu-link"><SiteIcon name="help" /><span>How to Play<small>A quick guide to your first battle</small></span><SiteIcon name="arrow" /></Link></div>
      </div>
      <div className="site-menu-footer"><LegalFooter compact /></div>
      <SoftDialog open={guestNoticeOpen} onClose={() => { localStorage.setItem(GUEST_NOTICE_SEEN_KEY, "true"); setGuestNoticeOpen(false); }} title="Playing as a guest">
        <div className="site-dialog-symbol"><SiteIcon name="info" /></div><p className="site-dialog-copy">Your guest progress stays on this browser and device. It may be lost if browser data is cleared or you switch devices.</p><p className="site-dialog-copy">Create an account to save your progress to your account.</p><button type="button" className="site-primary site-button-full" onClick={() => { localStorage.setItem(GUEST_NOTICE_SEEN_KEY, "true"); setGuestNoticeOpen(false); }}>Got it<SiteIcon name="check" /></button>
      </SoftDialog>
    </main>
  );
}
