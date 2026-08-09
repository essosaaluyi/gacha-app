"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { hasSavedBattleSession } from "@/lib/battle-pixi/state/battleSessionStore";

import { TitleNewsPanel } from "@/components/TitleNewsPanel";
import LegalFooter from "@/components/trust/LegalFooter";

export default function HomePage() {
  const router = useRouter();
  const lightRef = useRef<HTMLDivElement | null>(null);
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const videoLayerRef = useRef<HTMLDivElement | null>(null);

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

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);

    lightRef.current?.style.setProperty("--mouse-x", `${x * 100}%`);
    lightRef.current?.style.setProperty("--mouse-y", `${y * 100}%`);

    const videoShiftX = (0.5 - x) * 120;
    const videoShiftY = (0.5 - y) * 64;
    const overlayShiftX = (0.5 - x) * 28;
    const overlayShiftY = (0.5 - y) * 18;

    if (videoLayerRef.current) {
      videoLayerRef.current.style.transform = `translate3d(${videoShiftX}px, ${videoShiftY}px, 0) scale(0.9)`;
    }

    if (parallaxRef.current) {
      parallaxRef.current.style.transform = `translate3d(${overlayShiftX}px, ${overlayShiftY}px, 0)`;
    }
  };

  return (
    <main
      className="fixed inset-0 overflow-hidden bg-black"
      onMouseMove={handleMouseMove}
    >
      {/* BACKGROUND */}
      <div
        ref={videoLayerRef}
        className="title-video-parallax"
        onMouseMove={handleMouseMove}
      >
        <video
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          src="/videos/BGvideo.mp4"
        />
      </div>

      <div ref={parallaxRef} className="title-parallax-vignette" />
      <div ref={lightRef} className="title-mouse-light" />
      <div className="absolute inset-0 bg-black/34" />

      {/* CENTER */}
      {/* From md up, centre above the footer band rather than the whole
          viewport: at full size the stack is taller than a 768px screen, so on
          short laptops it used to land under the legal footer, which then
          swallowed the Play Now click. Mobile keeps inset-0 — the footer sits
          well clear of the button there, and the row/column switch makes the
          reserved band counterproductive. */}
      <div className="absolute inset-0 md:bottom-[88px] z-10 flex items-center justify-center px-6">
  <div className="flex flex-col md:flex-row items-center justify-center gap-8">
    <div className="flex flex-col items-center justify-center">
      <img
        src="/images/team-c-title.webp"
        alt="Title"
        style={{ width: "min(860px, 88vw)", maxHeight: "34vh" }}
        className="object-contain"
      />

      <div className="title-catchphrase" aria-label="Game catchphrase">
        <p>Make the Decisive Draw!</p>
        <span>Gacha Card Game • Instant Battles</span>
        <span>Free to Play</span>
      </div>

      <div className="title-dev-notice" role="status">
        <strong>In Development</strong>
        <span>
          This game is still under development. Some features are unfinished
          and progress may be reset while we keep building.
        </span>
      </div>

      <button
        type="button"
        onClick={handleStart}
        aria-label="Play now"
        className="play-now-button transition-transform duration-300 hover:scale-105 active:scale-95"
      >
        <img
          src="/images/play-now-button.webp"
          alt="Play Now"
          style={{ width: "220px", height: "auto" }}
          className="start-button-animated object-contain cursor-pointer hover:[animation-play-state:paused]"
        />
      </button>

      {canResume && (
        <button
          type="button"
          onClick={handleResumeBattle}
          className="mt-3 px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-lg transition-transform duration-200 hover:scale-105 active:scale-95 animate-pulse"
        >
          Continue Battle
        </button>
      )}
    </div>

    <TitleNewsPanel />
  </div>
</div>

      <div className="absolute bottom-4 left-4 right-4 z-10">
        <LegalFooter compact />
      </div>

      {/* LOGIN POPUP */}
      {loginOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md text-white">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Login Required
            </h2>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/login")}
                className="bg-emerald-600 hover:bg-emerald-500 p-4 rounded-xl font-semibold"
              >
                Login / Sign Up
              </button>
<button
  onClick={() => {
    localStorage.setItem("guest_mode", "true");
    window.location.href = "/menu";
  }}
  className="bg-zinc-700 hover:bg-zinc-600 p-4 rounded-xl font-semibold"
>
  Play as Guest
</button>
              <button
                onClick={() => setLoginOpen(false)}
                className="bg-zinc-700 hover:bg-zinc-600 p-4 rounded-xl font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
