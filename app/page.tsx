"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { playBgm } from "@/lib/audio/bgmStore";

export default function HomePage() {
  const router = useRouter();

  const [loginOpen, setLoginOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setLoggedIn(!!user);
    };

    checkUser();
  }, []);

  const handleStart = async () => {
  await playBgm();

  if (loggedIn) {
    router.push("/menu");
  } else {
    setLoginOpen(true);

    setTimeout(() => {
      playBgm();
    }, 100);
  }
};

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      {/* BACKGROUND */}
      <img
        src="/images/home-bg.png"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/40" />

      {/* CENTER */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          {/* TITLE */}
          <img
            src="/images/title.png"
            alt="Title"
            style={{ width: "760px", height: "auto" }}
            className="object-contain mb-4"
          />

          {/* START */}
          <button
            onClick={handleStart}
            className="transition-transform duration-300 hover:scale-105 active:scale-95"
          >
            <img
              src="/images/START.png"
              alt="Start"
              style={{ width: "320px", height: "auto" }}
              className="start-button-animated object-contain cursor-pointer hover:[animation-play-state:paused]"
            />
          </button>
        </div>
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