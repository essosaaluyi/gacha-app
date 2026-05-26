"use client";

import { useRef, useState } from "react";

const tracks = ["/audio/BGM1.mp3", "/audio/BGM2.mp3"];

export default function BGMPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);

  const playTrack = async (index: number) => {
    if (!audioRef.current) return;

    audioRef.current.src = tracks[index];
    audioRef.current.volume = 0.5;

    await audioRef.current.play();
    setPlaying(true);
  };

  const toggleBgm = async () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    await playTrack(trackIndex);
  };

  const nextTrack = async () => {
    const next = (trackIndex + 1) % tracks.length;
    setTrackIndex(next);

    if (playing) {
      await playTrack(next);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-2">
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={nextTrack}
      />

      <button
        onClick={toggleBgm}
        className="bg-zinc-900/80 border border-zinc-700 hover:bg-zinc-800 px-4 py-2 rounded-xl text-white text-sm"
      >
        {playing ? "BGM: ON" : "BGM: OFF"}
      </button>

      <button
        onClick={nextTrack}
        className="bg-zinc-900/80 border border-zinc-700 hover:bg-zinc-800 px-4 py-2 rounded-xl text-white text-sm"
      >
        Next
      </button>
    </div>
  );
}