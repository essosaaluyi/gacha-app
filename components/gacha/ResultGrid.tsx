"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const resultKey = useMemo(
    () => results.map((card) => `${card.name}:${card.rarity}:${card.image}`).join("|"),
    [results]
  );
  const [revealState, setRevealState] = useState<{
    key: string;
    indexes: number[];
  }>({ key: "", indexes: [] });
  const backGlows = useMemo(
    () => results.map((card) => chooseBackGlow(card)),
    [results]
  );
  const flipAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (results.length === 0) return;

    if (!flipAudioRef.current) {
      flipAudioRef.current = new Audio("/audio/card-flip-se.wav");
    }

    const timers = results.map((_, index) =>
      window.setTimeout(() => {
        if (flipAudioRef.current) {
  flipAudioRef.current.currentTime = 0;
  flipAudioRef.current.volume = 0.7;
  flipAudioRef.current.play();
}
        setRevealState((prev) => {
          const indexes = prev.key === resultKey ? prev.indexes : [];
          if (indexes.includes(index)) return { key: resultKey, indexes };
          return { key: resultKey, indexes: [...indexes, index] };
        });
      }, 500 + index * 350)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [resultKey, results]);

  if (results.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {results.map((card, index) => {
        const revealed =
          revealState.key === resultKey && revealState.indexes.includes(index);
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
                    src="/images/card-back.webp"
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
