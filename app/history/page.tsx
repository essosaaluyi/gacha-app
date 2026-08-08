"use client";
import TopBar from "@/components/TopBar";
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
      setMessage("Please log in first.");
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
        <h1 className="text-3xl font-bold mb-6">Pull History</h1>

        {message && <p className="text-zinc-300 mb-4">{message}</p>}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {results.map((card) => (
            <div
              key={card.id}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl p-3 relative cursor-pointer"
              onClick={() => setSelectedImage(card.image)}
            >
              <img
                src={card.image}
                alt={card.card_name}
                className="w-full aspect-[3/4] object-contain rounded-xl bg-zinc-800"
              />

              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg">
                {formatDate(card.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>

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
