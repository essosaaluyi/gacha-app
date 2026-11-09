"use client";

import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { useRef, useState } from "react";
import ResultGrid from "@/components/gacha/ResultGrid";
import CardFrame from "@/components/gacha/CardFrame";

const PackReveal3D = dynamic(() => import("@/components/gacha/PackReveal3D"), {
  ssr: false,
  loading: () => <p role="status">Loading pack...</p>,
});
const FIXTURE_CARDS = [
  { name: "R1", rarity: "R", image: "/images/cards/player/R1/card.webp" },
  { name: "SR1", rarity: "SR", image: "/images/cards/player/SR1/card.webp" },
  { name: "SSR1", rarity: "SSR", image: "/images/cards/player/SSR1/card.webp" },
  { name: "UR1", rarity: "UR", image: "/images/cards/player/UR1/card.webp" },
  { name: "R2", rarity: "R", image: "/images/cards/player/R2/card.webp" },
] as const;
const SINGLE_CARD = FIXTURE_CARDS.slice(0, 1);

export default function GachaPackPreviewPage() {
  const [count, setCount] = useState<1 | 5>(5);
  const [complete, setComplete] = useState(false);
  const [run, setRun] = useState(0);
  const runRef = useRef(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (process.env.NODE_ENV !== "development") notFound();

  const cards = count === 1 ? SINGLE_CARD : FIXTURE_CARDS;
  const replay = (nextCount: 1 | 5) => {
    setCount(nextCount);
    setComplete(false);
    setSelectedImage(null);
    setRun(++runRef.current);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6" data-testid="gacha-pack-preview" data-phase={complete ? "results" : "pack"}>
      <h1 className="text-xl font-bold mb-4">Pack reveal preview</h1>
      <div className="flex gap-4 mb-4">
        <button type="button" onClick={() => replay(1)}>Replay 1 card</button>
        <button type="button" onClick={() => replay(5)}>Replay 5 cards</button>
      </div>
      {complete ? (
        <ResultGrid results={cards} setSelectedImage={setSelectedImage} />
      ) : (
        <PackReveal3D key={run} cards={cards} onComplete={() => {
          if (run === runRef.current) setComplete(true);
        }} />
      )}
      {selectedImage && (
        <button type="button" aria-label="Close card inspection" className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <CardFrame src={selectedImage} alt="Enlarged card" rarity={cards.find(card => card.image === selectedImage)?.rarity ?? "R"} inspection />
        </button>
      )}
    </main>
  );
}
