"use client";
import TopBar from "@/components/TopBar";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  addPoints,
  getWalletState,
  initializeWallet,
  subscribeWallet,
} from "@/lib/wallet/walletStore";

type RawCard = {
  id: string;
  card_name: string;
  rarity: string;
  image: string;
};

type InventoryGroup = {
  card_name: string;
  rarity: string;
  image: string;
  ids: string[];
  count: number;
};

export default function InventoryPage() {
  const [cards, setCards] = useState<InventoryGroup[]>([]);
  const [message, setMessage] = useState("Loading...");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sellOpen, setSellOpen] = useState(false);
  const [points, setPoints] = useState(0);

   const [, setEmail] = useState<string | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [pointBefore, setPointBefore] = useState(0);
  const [pointAfter, setPointAfter] = useState(0);

  const [returnValues, setReturnValues] = useState<Record<string, number>>({
    R: 10,
    SR: 20,
    SSR: 50,
    UR: 100,
  });

  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>(
    {}
  );

  async function loadInventory() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
  const guestMode = localStorage.getItem("guest_mode");

  if (guestMode === "true") {
    setEmail("Guest");

    await initializeWallet();

    const guestInventory = JSON.parse(
      localStorage.getItem("guest_inventory") ?? "[]"
    );

    const grouped: Record<string, InventoryGroup> = {};

    guestInventory.forEach((card: RawCard) => {
      if (!grouped[card.card_name]) {
        grouped[card.card_name] = {
          card_name: card.card_name,
          rarity: card.rarity,
          image: card.image,
          ids: [card.id],
          count: 1,
        };
      } else {
        grouped[card.card_name].ids.push(card.id);
        grouped[card.card_name].count += 1;
      }
    });

    setCards(Object.values(grouped));
    setMessage("");

    return;
  }

  setMessage("Please log in first.");
  return;
}


    await initializeWallet();

    const { data: settings } = await supabase
      .from("point_settings")
      .select("setting_key, setting_value");

    const valueMap: Record<string, number> = {
      R: 10,
      SR: 20,
      SSR: 50,
      UR: 100,
    };

    (settings || []).forEach((s) => {
      if (s.setting_key === "return_R") valueMap.R = s.setting_value;
      if (s.setting_key === "return_SR") valueMap.SR = s.setting_value;
      if (s.setting_key === "return_SSR") valueMap.SSR = s.setting_value;
      if (s.setting_key === "return_UR") valueMap.UR = s.setting_value;
    });

    setReturnValues(valueMap);

    const { data, error } = await supabase
      .from("pull_results")
      .select("id, card_name, rarity, image")
      .eq("user_id", user.id)
      .is("sold_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    const grouped: Record<string, InventoryGroup> = {};

    (data || []).forEach((card: RawCard) => {
      if (!grouped[card.card_name]) {
        grouped[card.card_name] = {
          card_name: card.card_name,
          rarity: card.rarity,
          image: card.image,
          ids: [card.id],
          count: 1,
        };
      } else {
        grouped[card.card_name].ids.push(card.id);
        grouped[card.card_name].count += 1;
      }
    });

    setCards(Object.values(grouped));
    setMessage("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInventory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Unified wallet: mirror the shared balance into this page's display.
  useEffect(() => {
    const syncPoints = () => setPoints(getWalletState().points);
    syncPoints();
    return subscribeWallet(syncPoints);
  }, []);


  const setSellCount = (cardName: string, amount: number, max: number) => {
    setSelectedCounts((prev) => ({
      ...prev,
      [cardName]: Math.max(0, Math.min(max, amount)),
    }));
  };

  const changeSelectedCount = (
    cardName: string,
    max: number,
    change: number
  ) => {
    setSelectedCounts((prev) => {
      const current = prev[cardName] ?? 0;
      const next = Math.max(0, Math.min(max, current + change));

      return {
        ...prev,
        [cardName]: next,
      };
    });
  };

  const totalSelectedCount = Object.values(selectedCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const totalSellPoints = cards.reduce((sum, card) => {
    const selected = selectedCounts[card.card_name] ?? 0;
    const value = returnValues[card.rarity] ?? 0;
    return sum + selected * value;
  }, 0);

  const sellSelected = async () => {
    setSellOpen(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || totalSelectedCount === 0) return;

    const idsToSell: string[] = [];

    cards.forEach((card) => {
      const amount = selectedCounts[card.card_name] ?? 0;
      idsToSell.push(...card.ids.slice(0, amount));
    });

    const before = points;

    const { error: sellError } = await supabase
  .from("pull_results")
  .update({ sold_at: new Date().toISOString() })
  .in("id", idsToSell);

if (sellError) {
  setMessage(sellError.message);
  return;
}

    await addPoints(totalSellPoints, "card_sell");

    setPointBefore(before);
    setPointAfter(before + totalSellPoints);
    setResultOpen(true);
    setMessage("");

    setCards((prev) =>
      prev
        .map((card) => {
          const soldAmount = selectedCounts[card.card_name] ?? 0;

          return {
            ...card,
            ids: card.ids.slice(soldAmount),
            count: card.count - soldAmount,
          };
        })
        .filter((card) => card.count > 0)
    );
    setSelectedCounts({});
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-6">
      {/* TOP BAR */}
      <TopBar />

      <div className="max-w-5xl mx-auto px-6">
        <h1 className="text-3xl font-bold mb-4">Inventory</h1>

        {message && <p className="text-zinc-300 mb-4">{message}</p>}

        {totalSelectedCount > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setSellOpen(true)}
              className="bg-red-600 hover:bg-red-500 px-5 py-3 rounded-xl font-semibold"
            >
              Sell Selected ({totalSelectedCount})
            </button>

            <p className="text-emerald-400 font-bold">
              Selling Points: +{totalSellPoints}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {cards.map((card) => {
            const selected = selectedCounts[card.card_name] ?? 0;

            return (
              <div
                key={card.card_name}
                className={`bg-zinc-900 border rounded-2xl p-3 relative ${
                  selected > 0
                    ? "border-red-400"
                    : "border-zinc-700"
                }`}
              >
                <button
                  onClick={() => setSelectedImage(card.image)}
                  className="w-full"
                >
                  <img
                    src={card.image}
                    alt={card.card_name}
                    className="w-full aspect-[3/4] object-contain rounded-xl bg-zinc-800"
                  />
                </button>

                <div className="mt-3 text-center">
                  <p className="text-xs text-zinc-400 mb-2">
                    Owned: {card.count} / Selling: {selected}
                  </p>

                  <div className="grid grid-cols-6 gap-1 mb-2 text-xs">
                    <button
                      onClick={() =>
                        setSellCount(card.card_name, 0, card.count)
                      }
                      className="bg-zinc-800 hover:bg-zinc-700 px-1 py-2 rounded-lg text-xs"
                    >
                      ⇤
                    </button>

                    <button
                      onClick={() =>
                        changeSelectedCount(
                          card.card_name,
                          card.count,
                          -10
                        )
                      }
                      className="bg-zinc-800 hover:bg-zinc-700 px-1 py-2 rounded-lg text-xs"
                    >
                      «
                    </button>

                    <button
                      onClick={() =>
                        changeSelectedCount(
                          card.card_name,
                          card.count,
                          -1
                        )
                      }
                      className="bg-zinc-800 hover:bg-zinc-700 px-1 py-2 rounded-lg text-xs"
                    >
                      ‹
                    </button>

                    <button
                      onClick={() =>
                        changeSelectedCount(
                          card.card_name,
                          card.count,
                          1
                        )
                      }
                      className="bg-zinc-800 hover:bg-zinc-700 px-1 py-2 rounded-lg text-xs"
                    >
                      ›
                    </button>

                    <button
                      onClick={() =>
                        changeSelectedCount(
                          card.card_name,
                          card.count,
                          10
                        )
                      }
                      className="bg-zinc-800 hover:bg-zinc-700 px-1 py-2 rounded-lg text-xs"
                    >
                      »
                    </button>

                    <button
                      onClick={() =>
                        setSellCount(
                          card.card_name,
                          card.count,
                          card.count
                        )
                      }
                      className="bg-zinc-800 hover:bg-zinc-700 px-1 py-2 rounded-lg text-xs"
                    >
                      ⇥
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELL POPUP */}
      {sellOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-3">
              Sell Cards
            </h2>

            <p className="text-zinc-300 mb-3">
              Sell {totalSelectedCount} selected card(s)?
            </p>

            <p className="text-emerald-400 font-bold mb-6">
              Points: {points} → {points + totalSellPoints}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setSellOpen(false)}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded-xl font-semibold"
              >
                No
              </button>

              <button
                onClick={sellSelected}
                className="flex-1 bg-red-600 hover:bg-red-500 px-4 py-3 rounded-xl font-semibold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT POPUP */}
      {resultOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-3">
              Points Updated
            </h2>

            <p className="text-emerald-400 font-bold text-xl mb-6">
              {pointBefore} → {pointAfter}
            </p>

            <button
              onClick={() => setResultOpen(false)}
              className="w-full bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-xl font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* IMAGE POPUP */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Enlarged card"
            className="max-w-full max-h-full object-contain rounded-2xl"
          />
        </div>
      )}
    </main>
  );
}
