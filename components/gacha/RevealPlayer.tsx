"use client";

import { useState } from "react";

type Props = {
  isRevealing: boolean;
  revealVideo: string;
  freezeActive: boolean;
  freezeTriggered: boolean;
  freezeTime: number | null;
  mainRevealStopped: boolean;

  setFreezeTriggered: (value: boolean) => void;
  setFreezeActive: (value: boolean) => void;
  setMainRevealStopped: (value: boolean) => void;

  finishReveal: () => void;
};

export default function RevealPlayer({
  isRevealing,
  revealVideo,
  freezeActive,
  freezeTriggered,
  freezeTime,
  mainRevealStopped,
  setFreezeTriggered,
  setFreezeActive,
  setMainRevealStopped,
  finishReveal,
}: Props) {
  const [readyVideoSrc, setReadyVideoSrc] = useState<string | null>(null);
  const [freezeVideoReady, setFreezeVideoReady] = useState(false);
  const mainVideoReady = readyVideoSrc === revealVideo;

  if (!isRevealing) return null;

  return (
    <div className="mb-8 relative">
      {!mainRevealStopped && (
        <>
          {!mainVideoReady && (
            <div className="reveal-loading-layer mb-4">
              <div className="reveal-loading-stage">
                <div className="reveal-loading-ring" />
                <div className="reveal-loading-core" />
                <p className="reveal-loading-text">LOADING REVEAL</p>
              </div>
            </div>
          )}

          <video
            key={revealVideo}
            src={revealVideo}
            autoPlay
            playsInline
            preload="auto"
            onCanPlay={() => setReadyVideoSrc(revealVideo)}
            onTimeUpdate={(e) => {
              const current = e.currentTarget.currentTime;

              if (
                freezeTime !== null &&
                !freezeTriggered &&
                current >= freezeTime
              ) {
                setFreezeTriggered(true);
                setMainRevealStopped(true);
                setFreezeActive(true);
              }
            }}
            onEnded={finishReveal}
            className={`w-full h-[70vh] md:h-auto object-cover rounded-2xl mb-4 ${
              mainVideoReady ? "block" : "hidden"
            }`}
          />
        </>
      )}

      {freezeActive && (
        <>
          {!freezeVideoReady && (
            <div className="reveal-loading-layer mb-4">
              <div className="reveal-loading-stage">
                <div className="reveal-loading-ring" />
                <div className="reveal-loading-core" />
                <p className="reveal-loading-text">FREEZE LOADING</p>
              </div>
            </div>
          )}

          <video
            src="/videos/freeze.mp4"
            autoPlay
            playsInline
            preload="auto"
            onCanPlay={() => setFreezeVideoReady(true)}
            onEnded={finishReveal}
            className={`w-full h-[70vh] md:h-auto object-cover rounded-2xl mb-4 ${
              freezeVideoReady ? "block" : "hidden"
            }`}
          />
        </>
      )}

      <button
        onClick={finishReveal}
        className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl font-semibold"
      >
        Skip Reveal
      </button>
    </div>
  );
}
