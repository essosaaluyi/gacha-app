"use client";

import { useEffect, useState } from "react";

type Card = {
  name: string;
  rarity: string;
  image: string;
};

type BackGlow = "none" | "blue" | "gold" | "rainbow";

type Props = {
  results: Card[];
  setSelectedImage: (image: string | null) => void;
};

function chooseBackGlow(card: Card): BackGlow {
  if (!["SR", "SSR", "UR"].includes(card.rarity)) return "none";

  // 50% chance no glow even if SR or higher
  if (Math.random() >= 0.5) return "none";

  if (card.rarity === "SR") {
    return "blue";
  }

  if (card.rarity === "SSR") {
    return Math.random() < 0.5 ? "blue" : "gold";
  }

  if (card.rarity === "UR") {
    const rand = Math.random();

    if (rand < 0.25) return "blue";
    if (rand < 0.5) return "gold";
    return "rainbow";
  }

  return "none";
}

function getBackGlowClass(glow: BackGlow) {
  if (glow === "blue") {
    return "animate-cardBackGlow bg-blue-950 border-blue-400 shadow-[0_0_28px_rgba(96,165,250,0.65)]";
  }

  if (glow === "gold") {
    return "animate-cardBackGlow bg-yellow-950 border-yellow-400 shadow-[0_0_32px_rgba(250,204,21,0.7)]";
  }

  if (glow === "rainbow") {
    return "animate-cardBackGlow bg-gradient-to-br from-pink-500 via-blue-400 to-yellow-300 border-white shadow-[0_0_36px_rgba(255,255,255,0.75)]";
  }

  return "bg-zinc-900 border-zinc-700";
}

export default function ResultGrid({ results, setSelectedImage }: Props) {
  const [revealedIndexes, setRevealedIndexes] = useState<number[]>([]);
  const [backGlows, setBackGlows] = useState<BackGlow[]>([]);
  const flipAudio = typeof Audio !== "undefined"
  ? new Audio("/audio/card-flip-se.wav")
  : null;

  useEffect(() => {
    setRevealedIndexes([]);
    setBackGlows(results.map((card) => chooseBackGlow(card)));

    if (results.length === 0) return;

    const timers = results.map((_, index) =>
      window.setTimeout(() => {
        if (flipAudio) {
  flipAudio.currentTime = 0;
  flipAudio.volume = 0.7;
  flipAudio.play();
}
        setRevealedIndexes((prev) => {
          if (prev.includes(index)) return prev;
          return [...prev, index];
        });
      }, 500 + index * 350)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [results]);

  if (results.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {results.map((card, index) => {
        const revealed = revealedIndexes.includes(index);
        const backGlow = backGlows[index] ?? "none";

        return (
          <div
            key={`${card.name}-${index}`}
            onClick={() => revealed && setSelectedImage(card.image)}
            className="cursor-pointer perspective"
          >
            <div className="relative w-full aspect-[3/4]">
              <div
                className={`absolute inset-0 transition-transform duration-700 transform-style-preserve-3d ${
                  revealed ? "rotate-y-180" : ""
                }`}
              >
                {/* Back side */}
                <div
                  className={`absolute inset-0 backface-hidden rounded-2xl border p-[2px] ${getBackGlowClass(
                    backGlow
                  )}`}
                >
                  <img
                    src="/images/card-back.png"
                    alt="Card Back"
                    className="w-full h-full object-contain rounded-2xl"
                  />
                </div>

                {/* Front side */}
                <div
                  className={`absolute inset-0 rotate-y-180 backface-hidden rounded-2xl p-[2px] ${
                    card.rarity === "UR"
                      ? "bg-gradient-to-br from-pink-500 via-blue-400 to-yellow-300 shadow-[0_0_30px_rgba(255,255,255,0.25)]"
                      : ""
                  }`}
                >
                  <div
                    className={`rounded-2xl p-3 text-center border h-full ${
                      card.rarity === "SR"
                        ? "bg-blue-950 border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.45)]"
                        : card.rarity === "SSR"
                        ? "bg-yellow-950 border-yellow-400 shadow-[0_0_24px_rgba(250,204,21,0.5)]"
                        : card.rarity === "UR"
                        ? "bg-zinc-900 border-zinc-200"
                        : "bg-zinc-900 border-zinc-700"
                    }`}
                  >
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-contain rounded-xl bg-zinc-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}