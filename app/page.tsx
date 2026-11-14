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
      <section className="mx-auto grid w-full max-w-[1160px] justify-items-center gap-5 py-6 sm:gap-7 sm:py-9" aria-labelledby="home-battle-heading">
        <h1 id="home-battle-heading" className="text-center text-3xl font-semibold tracking-tight sm:text-5xl">Open a pack. <span className="text-[#18745f]">Enter battle.</span></h1>
        <picture className="block w-full max-w-[360px] overflow-hidden rounded-2xl shadow-lg sm:max-w-none">
          <source media="(max-width: 639px)" srcSet="/images/pack-to-battle.portrait.v1.webp" width={800} height={1000} />
          <Image unoptimized fetchPriority="high" loading="eager" width={1800} height={600} className="block h-auto w-full" src="/images/pack-to-battle.wide.v1.webp" alt="Open a pack, get five cards, and use them in battle to defeat the enemy." />
        </picture>
        <div className="site-landing-actions justify-center">
          <button type="button" className="site-primary" onClick={handleStart}>Start your first battle<SiteIcon name="arrow" /></button>
          {canResume && <button type="button" className="site-secondary" onClick={handleResumeBattle}>Continue battle<SiteIcon name="history" /></button>}
        </div>
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
