"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Card } from "@/lib/gacha/pullLogic";
import CardFrame from "./CardFrame";

type Props = {
  cards: Card[];
};

export default function BattleDeckOrder({ cards }: Props) {
  const router = useRouter();
  const beginBattle = () => {
    localStorage.setItem("battle_player_cards", JSON.stringify(cards));
    localStorage.removeItem("pending_battle_cards");
    localStorage.removeItem("battle_resume_requested");
    localStorage.setItem("battle_opening_pending", "true");
    router.push("/battle");
  };

  return (
    <section className="battle-order-panel">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-2xl font-bold">Battle Hand</h3>
          <p className="text-sm text-zinc-300">
            {cards.length} cards in your hand. See the enemy, then choose a card to summon.
          </p>
        </div>

      </div>

      <div className="grid grid-cols-5 gap-2 md:gap-4 mb-6">
        {cards.map((card, index) => (
          <button
            key={`${card.name}-${card.image}-${index}`}
            onClick={() => undefined}
            className="relative bg-transparent border-0 p-0"
          >
            <div className="absolute top-2 left-2 z-10 bg-black/80 border border-white/30 rounded-full w-8 h-8 flex items-center justify-center text-sm font-black">
              {index + 1}
            </div>

            <CardFrame src={card.image} alt={card.name} rarity={card.rarity} />

            <div className="mt-2 text-center text-xs font-bold">
              {card.name} / {card.rarity}
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button type="button" onClick={beginBattle} className="site-primary w-full sm:max-w-xs">
          Begin battle <span aria-hidden="true">→</span>
        </button>
      </div>

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
