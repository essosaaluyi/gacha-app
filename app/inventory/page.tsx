"use client";
import TopBar from "@/components/TopBar";
import CardArchive from "@/components/site/CardArchive";
import SoftDialog from "@/components/site/SoftDialog";
import SiteIcon from "@/components/site/SiteIcon";
import Link from "next/link";
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
  const [canSell, setCanSell] = useState(false);
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

    setCanSell(true);

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
    <main className="min-h-screen pb-6">
      <TopBar />
      <CardArchive cards={cards} message={message} points={points} returnValues={returnValues} selectedCounts={selectedCounts} setSellCount={setSellCount} totalSelectedCount={totalSelectedCount} totalSellPoints={totalSellPoints} onReviewSale={() => setSellOpen(true)} onClearSelection={() => setSelectedCounts({})} />
      <SoftDialog open={sellOpen} onClose={() => setSellOpen(false)} title="Sell selected cards?">
        <div className="site-dialog-symbol"><SiteIcon name="cards" /></div>
        <p className="site-dialog-copy">{totalSelectedCount} card{totalSelectedCount === 1 ? "" : "s"} will leave your collection.</p>
        <div className="archive-sale-summary"><span>You receive</span><strong><SiteIcon name="coin" />+{totalSellPoints.toLocaleString()} pts</strong><span>Balance after sale</span><b>{points.toLocaleString()} → {(points + totalSellPoints).toLocaleString()}</b></div>
        {canSell ? <button type="button" className="site-primary site-button-full" onClick={sellSelected}>Sell {totalSelectedCount} card{totalSelectedCount === 1 ? "" : "s"}<SiteIcon name="check" /></button> : <><p className="site-dialog-copy">Card selling is available when you log in to your account.</p><Link className="site-primary site-button-full" href="/login">Log in to sell <SiteIcon name="arrow" /></Link></>}
        <p className="archive-dialog-note">Close this window to keep your cards.</p>
      </SoftDialog>
      <SoftDialog open={resultOpen} onClose={() => setResultOpen(false)} title="Cards sold">
        <div className="site-dialog-symbol"><SiteIcon name="check" /></div>
        <p className="site-dialog-copy">Your points have been added.</p>
        <div className="archive-sale-summary"><span>Points balance</span><strong>{pointBefore.toLocaleString()} → {pointAfter.toLocaleString()}</strong></div>
        <button type="button" className="site-primary site-button-full" onClick={() => setResultOpen(false)}>Back to collection<SiteIcon name="cards" /></button>
      </SoftDialog>
    </main>
  );
}
