"use client";

import Image from "next/image";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { hasSavedBattleSession } from "@/lib/battle-pixi/state/battleSessionStore";

import { TitleNewsPanel } from "@/components/TitleNewsPanel";
import LegalFooter from "@/components/trust/LegalFooter";
import Link from "next/link";
import SiteIcon from "@/components/site/SiteIcon";
import SoftDialog from "@/components/site/SoftDialog";
import BGMPlayer from "@/components/BGMPlayer";

export default function HomePage() {
  const router = useRouter();

  const [loginOpen, setLoginOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setLoggedIn(!!user);
    };

    checkUser();
    setCanResume(hasSavedBattleSession());
  }, []);

  const handleStart = async () => {
    if (loggedIn) {
      router.push("/menu");
      return;
    }

    setLoginOpen(true);
  };

  const handleResumeBattle = () => {
    localStorage.setItem("battle_resume_requested", "true");
    router.push("/battle");
  };

  return (
    <main className="site-landing">
      <header className="site-landing-header">
        <Link href="/" className="site-landing-brand" aria-label="Destiny Wars home"><Image src="/images/team-c-title.webp" alt="Destiny Wars" width={160} height={89} unoptimized /></Link>
        <div className="site-landing-tools"><Link href="/how-to-play" className="site-secondary" aria-label="How to play"><SiteIcon name="help" /><span>How to play</span></Link><BGMPlayer /></div>
      </header>
      <section className="site-landing-grid">
        <div className="site-landing-copy"><p className="site-eyebrow">A LITTLE LUCK. A NEW DESTINY.</p><h1>Your next card.<br />Your next <span>adventure.</span></h1><p className="site-landing-description">Collect extraordinary characters. Build your hand.<br />Make the decisive draw in Destiny Wars.</p><div className="site-landing-actions"><button type="button" className="site-primary" onClick={handleStart}>Play now<SiteIcon name="arrow" /></button>{canResume && <button type="button" className="site-secondary" onClick={handleResumeBattle}>Continue battle<SiteIcon name="history" /></button>}</div><div className="site-landing-tags">Free to play<span />Gacha card game<span />Instant battles</div></div>
        <div className="site-landing-art" aria-label="Discover the Destiny Wars card collection"><Image unoptimized width={400} height={600} className="site-landing-card" src="/images/cards/player/SR2/card.webp" alt="SR character card" /><Image unoptimized width={400} height={600} className="site-landing-card" src="/images/cards/player/SSR2/card.webp" alt="SSR character card" /><Image unoptimized width={400} height={600} className="site-landing-card" src="/images/cards/player/UR1/card.webp" alt="UR character card" /><div className="site-landing-art-caption"><SiteIcon name="cards" />A world of characters to discover</div></div>
      </section>
      <div className="site-landing-bottom"><div className="site-development-note"><strong>In development</strong><p>This game is still growing. Some features are unfinished, and progress may be reset while we keep building.</p></div><TitleNewsPanel /></div>
      <LegalFooter compact />
      <SoftDialog open={loginOpen} onClose={() => setLoginOpen(false)} title="Welcome to Destiny Wars">
        <div className="site-dialog-symbol"><SiteIcon name="pack" /></div><p className="site-dialog-copy">Your next adventure is one draw away.<br />Log in to keep your collection, or try guest mode.</p>
        <button type="button" className="site-primary site-button-full" onClick={() => router.push("/login")}>Log in / Sign up<SiteIcon name="account" /></button>
        <button type="button" className="site-secondary site-button-full" style={{ marginTop: 12 }} onClick={() => { localStorage.setItem("guest_mode", "true"); window.location.href = "/menu"; }}>Play as guest<SiteIcon name="arrow" /></button>
      </SoftDialog>
    </main>
  );
}
