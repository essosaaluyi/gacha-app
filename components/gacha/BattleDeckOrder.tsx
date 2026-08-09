"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Card } from "@/lib/gacha/pullLogic";

type Props = {
  cards: Card[];
};

function shuffleCards(cards: Card[]) {
  const next = [...cards];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export default function BattleDeckOrder({ cards }: Props) {
  const router = useRouter();
  const [orderedCards, setOrderedCards] = useState(cards);
  const [shuffleUsed, setShuffleUsed] = useState(false);
  const [shuffling, setShuffling] = useState(false);

  const orderLabel = useMemo(
    () => (orderedCards.length === 1 ? "1" : `1-${orderedCards.length}`),
    [orderedCards.length]
  );

  const shuffleOnce = () => {
    if (shuffleUsed || shuffling || orderedCards.length <= 1) return;

    setShuffling(true);
    const audio = new Audio("/audio/card-flip-se.wav");
    audio.volume = 0.85;
    void audio.play().catch(() => undefined);

    window.setTimeout(() => {
      setOrderedCards(shuffleCards(orderedCards));
      setShuffleUsed(true);
      setShuffling(false);
    }, 520);
  };

  const beginBattle = () => {
    localStorage.setItem("battle_player_cards", JSON.stringify(orderedCards));
    localStorage.removeItem("pending_battle_cards");
    localStorage.setItem("battle_opening_pending", "true");
    router.push("/battle");
  };

  return (
    <section className="battle-order-panel">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-2xl font-bold">Battle Deck Order</h3>
          <p className="text-sm text-zinc-300">
            Battle cards enter from {orderLabel}, top-left to bottom-right.
          </p>
        </div>

        <button
          onClick={shuffleOnce}
          disabled={shuffleUsed || shuffling || orderedCards.length <= 1}
          className={`px-5 py-3 rounded-xl font-bold ${
            shuffleUsed || shuffling || orderedCards.length <= 1
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-yellow-600 hover:bg-yellow-500 text-white"
          }`}
        >
          {shuffling ? "Shuffling..." : shuffleUsed ? "Shuffle Used" : "Shuffle?(1)"}
        </button>
      </div>

      <div className={`grid grid-cols-5 gap-2 md:gap-4 mb-6 ${shuffling ? "battle-order-shuffling" : ""}`}>
        {orderedCards.map((card, index) => (
          <button
            key={`${card.name}-${card.image}-${index}`}
            onClick={() => undefined}
            className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-2"
          >
            <div className="absolute top-2 left-2 z-10 bg-black/80 border border-white/30 rounded-full w-8 h-8 flex items-center justify-center text-sm font-black">
              {index + 1}
            </div>

            <img
              src={card.image}
              alt={card.name}
              className="w-full aspect-[3/4] object-contain rounded-xl bg-zinc-800"
            />

            <div className="mt-2 text-center text-xs font-bold">
              {card.name} / {card.rarity}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={beginBattle}
        aria-label="Begin battle"
        className="group animate-battleGlow hover:scale-105 active:scale-95 transition-transform duration-200 w-full flex justify-center"
      >
        <img
          src="/images/beginbattle.webp"
          alt=""
          className="w-full max-w-[800px] object-contain drop-shadow-[0_0_25px_rgba(59,130,246,0.7)] group-hover:drop-shadow-[0_0_40px_rgba(96,165,250,1)] transition-all duration-300"
        />
      </button>

      {/* This screen used to be forward-only: once you arrived, browser-back was
          the sole way out, and the pulled cards are already banked by then. */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => router.push("/menu")}
          className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 text-sm font-semibold"
        >
          Back to menu
        </button>
      </div>
    </section>
  );
}
