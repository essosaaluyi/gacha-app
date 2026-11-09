"use client";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import SoftDialog from "@/components/site/SoftDialog";
import SiteIcon from "@/components/site/SiteIcon";
import CardFrame from "@/components/gacha/CardFrame";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PullResult = {
  id: string;
  card_name: string;
  rarity: string;
  image: string;
  created_at: string;
};

export default function HistoryPage() {
  const [results, setResults] = useState<PullResult[]>([]);
  const [message, setMessage] = useState("Loading...");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  async function loadHistory() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Guests can pull but their pulls are not written to the server table
      // this page reads, so there is genuinely nothing to show them. Say why,
      // and give them the way out rather than a bare refusal.
      setMessage("guest");
      return;
    }

    const { data, error } = await supabase
      .from("pull_results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setResults(data || []);
    setMessage("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);



  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-6">
      {/* TOP BAR */}
      <TopBar />

      <div className="max-w-5xl mx-auto px-6">
        <header className="site-page-heading"><div><p className="site-eyebrow">YOUR JOURNEY</p><h1>Pull History<span className="site-heading-dot">.</span></h1><p>A look back at every discovery.</p></div></header>

        {message === "guest" ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md">
            <p className="text-zinc-300">
              Pull history is saved to your account. Guest pulls stay on this
              device only, so there is nothing to show here yet.
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href="/login"
                className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-xl font-semibold text-sm"
              >
                Log in or sign up
              </Link>
              <Link
                href="/inventory"
                className="border border-zinc-700 hover:bg-zinc-800 px-5 py-2.5 rounded-xl font-semibold text-sm text-zinc-300"
              >
                View your cards
              </Link>
            </div>
          </div>
        ) : (
          message && <p className="text-zinc-300 mb-4">{message}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {results.map((card) => (
            <button
              type="button"
              aria-label={`Enlarge ${card.card_name}`}
              key={card.id}
              className="bg-transparent border-0 p-0 relative cursor-pointer"
              onClick={() => setSelectedImage(card.image)}
            >
              <CardFrame src={card.image} alt={card.card_name} rarity={card.rarity} />
              <span className="archive-zoom"><SiteIcon name="search" /></span>

              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg">
                {formatDate(card.created_at)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <SoftDialog open={selectedImage !== null} onClose={() => setSelectedImage(null)} title="Card preview" wide>{selectedImage && <CardFrame src={selectedImage} alt="Full card" rarity={results.find(card => card.image === selectedImage)?.rarity ?? "R"} inspection />}</SoftDialog>
    </main>
  );
}
