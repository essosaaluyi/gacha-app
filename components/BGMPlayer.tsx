"use client";

import { useState } from "react";

import {
  playBgm,
  pauseBgm,
  getBgmMuted,
  setBgmMuted,
} from "@/lib/audio/bgmStore";

export default function BGMPlayer() {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(getBgmMuted());

  const togglePlay = async () => {
    if (playing) {
      pauseBgm();
      setPlaying(false);
      return;
    }

    await playBgm();
    setPlaying(true);
  };

  const toggleMute = () => {
    const next = !muted;

    setBgmMuted(next);
    setMuted(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={togglePlay}
        className="bg-zinc-900/80 border border-zinc-700 hover:bg-zinc-800 px-4 py-2 rounded-xl text-white text-sm"
      >
        {playing ? "BGM: ON" : "BGM: OFF"}
      </button>

      <button
        onClick={toggleMute}
        className="bg-zinc-900/80 border border-zinc-700 hover:bg-zinc-800 px-4 py-2 rounded-xl text-white text-sm"
      >
        {muted ? "Muted" : "Volume"}
      </button>
    </div>
  );
}