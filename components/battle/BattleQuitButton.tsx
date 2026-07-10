"use client";

import { useRouter } from "next/navigation";

export default function BattleQuitButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/battle-result")}
      className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl font-bold text-sm"
    >
      Quit Game
    </button>
  );
}