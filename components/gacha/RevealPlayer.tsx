"use client";

import { useState } from "react";
import RevealLoading from "./RevealLoading";

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
    <div className="gacha-cinema">
      {!mainRevealStopped && (
        <>
          {!mainVideoReady && (
            <RevealLoading />
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
            className={`gacha-cinema-video ${
              mainVideoReady ? "block" : "hidden"
            }`}
          />
        </>
      )}

      {freezeActive && (
        <>
          {!freezeVideoReady && (
            <RevealLoading />
          )}

          <video
            src="/videos/freeze.mp4"
            autoPlay
            playsInline
            preload="auto"
            onCanPlay={() => setFreezeVideoReady(true)}
            onEnded={finishReveal}
            className={`gacha-cinema-video ${
              freezeVideoReady ? "block" : "hidden"
            }`}
          />
        </>
      )}

      <button
        onClick={finishReveal}
        className="gacha-cinema-skip"
      >
        Skip Reveal
      </button>
    </div>
  );
}
