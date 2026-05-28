"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type NewsPost = {
  id: string;
  message: string;
  created_at: string;
};

export function TitleNewsPanel() {
  const [news, setNews] = useState<NewsPost[]>([]);

  useEffect(() => {
    const loadNews = async () => {
      const { data } = await supabase
        .from("news_posts")
        .select("id, message, created_at")
        .order("created_at", { ascending: false });

      setNews(data ?? []);
    };

    loadNews();
  }, []);

  return (
    <div className="w-full max-w-sm bg-black/55 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-sm">
      <h2 className="text-lg font-bold mb-3 tracking-wide">NEWS</h2>

      <div className="max-h-64 overflow-y-auto pr-2 space-y-3">
        {news.length === 0 ? (
          <p className="text-sm text-zinc-300">No news yet.</p>
        ) : (
          news.map((item) => (
            <div key={item.id} className="border-b border-white/10 pb-3 last:border-b-0">
              <p className="text-xs text-emerald-300 mb-1">
                {new Date(item.created_at).toLocaleDateString("ja-JP")}
              </p>

              <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-line">
                {item.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}