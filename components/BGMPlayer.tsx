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
    <div className="battle-audio-controls">
      <button
        onClick={togglePlay}
        className="battle-utility-button battle-audio-button"
        aria-label={playing ? "Pause background music" : "Play background music"}
      >
        {playing ? "BGM On" : "BGM Off"}
      </button>

      <button
        onClick={toggleMute}
        className="battle-utility-button battle-audio-button"
        aria-label={muted ? "Unmute background music" : "Mute background music"}
      >
        {muted ? "Muted" : "Volume"}
      </button>
    </div>
  );
}
