"use client";

import { useRouter } from "next/navigation";

export default function BattleQuitButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/battle-result")}
      className="battle-utility-button battle-quit-button"
      aria-label="Quit battle"
    >
      Quit
    </button>
  );
}
