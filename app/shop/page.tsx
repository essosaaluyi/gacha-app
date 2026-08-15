"use client";

// Feature 8: shop foundation. Catalog + redeem flow are live, but redeeming
// stays gated behind patchConfig.shop.enabled until the economy test-run.

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { patchConfig } from "@/lib/game-config/patchConfig";
import { logEvent } from "@/lib/events/gameEventStore";
import {
  getWalletState,
  initializeWallet,
  spendPoints,
  subscribeWallet,
} from "@/lib/wallet/walletStore";

const REDEEMED_KEY = "shop_redemptions";

type ShopItem = (typeof patchConfig.shop.items)[number];

function getRedemptions(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(REDEEMED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export default function ShopPage() {
  const [points, setPoints] = useState(0);
  const [redemptions, setRedemptions] = useState<Record<string, number>>({});
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const shopEnabled = Boolean(patchConfig.shop.enabled);

  useEffect(() => {
    void initializeWallet();
    setRedemptions(getRedemptions());
    setReady(true);
    const sync = () => setPoints(getWalletState().points);
    sync();
    return subscribeWallet(sync);
  }, []);

  const redeem = async (item: ShopItem) => {
    setConfirmItem(null);
    const paid = await spendPoints(item.cost, "shop_redeem");
    if (!paid) {
      setMessage("Not enough points.");
      return;
    }
    const next = { ...getRedemptions(), [item.id]: (getRedemptions()[item.id] ?? 0) + 1 };
    window.localStorage.setItem(REDEEMED_KEY, JSON.stringify(next));
    setRedemptions(next);
    logEvent({
      kind: "shopRedeem",
      pointsDelta: -item.cost,
      detail: { id: item.id, cost: item.cost },
    });
    setMessage(`Redeemed: ${item.title}`);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-6">
      <TopBar />

      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-baseline justify-between mt-4 mb-2">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            Shop
            {!shopEnabled && (
              <span className="text-[11px] font-black uppercase tracking-wide bg-amber-400/20 border border-amber-400/45 text-amber-300 rounded px-2 py-1">
                Coming Soon
              </span>
            )}
          </h1>
          <p className="text-zinc-400 text-sm">
            Balance:{" "}
            <span className="text-emerald-400 font-bold">
              {points.toLocaleString()} pts
            </span>
          </p>
        </div>

        {!shopEnabled && (
          <p className="mb-6 text-sm text-amber-300 bg-amber-950/40 border border-amber-800/40 rounded-xl px-4 py-3">
            The shop is in preview — redeeming opens after the current test
            period.
          </p>
        )}

        {message && (
          <p className="mb-6 text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-4 py-3">
            {message}
          </p>
        )}

        {ready && (
          <div className="grid gap-5 md:grid-cols-3">
            {patchConfig.shop.items.map((item) => {
              const owned = redemptions[item.id] ?? 0;
              const affordable = points >= item.cost;

              return (
                <section
                  key={item.id}
                  className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 flex flex-col"
                >
                  <h2 className="text-lg font-bold mb-1">{item.title}</h2>
                  <p className="text-xs text-zinc-500 mb-4 flex-1">
                    {item.desc}
                  </p>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-emerald-400 font-bold">
                      {item.cost.toLocaleString()} pts
                    </span>
                    <button
                      onClick={() => setConfirmItem(item)}
                      disabled={!shopEnabled || !affordable}
                      className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      {!shopEnabled
                        ? "Coming soon"
                        : affordable
                        ? "Redeem"
                        : "Not enough"}
                    </button>
                  </div>

                  {owned > 0 && (
                    <p className="mt-3 text-xs text-zinc-400">
                      Redeemed ×{owned}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {confirmItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-3">Confirm Redeem</h2>
            <p className="text-zinc-300 mb-6">
              Spend {confirmItem.cost} points on {confirmItem.title}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmItem(null)}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded-xl font-semibold"
              >
                No
              </button>
              <button
                onClick={() => void redeem(confirmItem)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-xl font-semibold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
