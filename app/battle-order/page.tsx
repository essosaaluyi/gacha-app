"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BattleDeckOrder from "@/components/gacha/BattleDeckOrder";
import type { Card } from "@/lib/gacha/pullLogic";

export default function BattleOrderPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved =
        localStorage.getItem("pending_battle_cards") ??
        localStorage.getItem("battle_player_cards");

      if (saved) {
        try {
          setCards(JSON.parse(saved));
        } catch {
          setCards([]);
        }
      }

      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!loaded) {
    return (
      <main className="battle-order-room">
        <div className="battle-order-spotlight" />
        <div className="battle-order-dust" />
      </main>
    );
  }

  return (
    <main className="battle-order-room">
      <div className="battle-order-spotlight" />
      <div className="battle-order-dust" />
      <div className="battle-order-dust battle-order-dust-second" />

      <div className="battle-order-content">
        {cards.length > 0 ? (
          <BattleDeckOrder cards={cards} />
        ) : (
          <section className="battle-order-panel text-center">
            <h1 className="text-2xl font-black mb-3">No Battle Deck Found</h1>
            <p className="text-zinc-300 mb-6">
              Pull cards first, then continue to battle.
            </p>
            <Link
              href="/gacha"
              className="inline-flex bg-blue-600 hover:bg-blue-500 px-5 py-3 rounded-xl font-bold"
            >
              Back to Gacha
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
