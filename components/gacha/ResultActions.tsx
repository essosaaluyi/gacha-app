"use client";

import Link from "next/link";

type Props = {
  resetPull: () => void;
};

export default function ResultActions({
  resetPull,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-5 mt-6">
      <button
        onClick={resetPull}
        className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-2xl font-semibold text-lg"
      >
        Pull Again
      </button>

      <Link
        href="/battle"
        className="group animate-battleGlow hover:scale-105 active:scale-95 transition-transform duration-200"
      >
        <img
          src="/images/beginbattle.png"
          alt="Begin Battle"
          className="w-[800px] object-contain drop-shadow-[0_0_25px_rgba(59,130,246,0.7)] group-hover:drop-shadow-[0_0_40px_rgba(96,165,250,1)] transition-all duration-300"
        />
      </Link>

      <Link
        href="/menu"
        className="bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-2xl font-semibold text-lg"
      >
        Back to Menu
      </Link>
    </div>
  );
}