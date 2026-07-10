"use client";

import Link from "next/link";

export default function BattleResultPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-black rounded-3xl border border-zinc-800 p-8">

        <h1 className="text-4xl font-bold text-center mb-8">
          Battle Result
        </h1>

        <div className="space-y-4 text-lg">

          <div className="flex justify-between">
            <span>Enemies Defeated</span>
            <span>0</span>
          </div>

          <div className="flex justify-between">
            <span>Games Played</span>
            <span>0</span>
          </div>

          <div className="flex justify-between">
            <span>Points Earned</span>
            <span>0</span>
          </div>

          <div className="flex justify-between">
            <span>Cards Drawn</span>
            <span>0</span>
          </div>

        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/menu"
            className="bg-emerald-600 hover:bg-emerald-500 px-8 py-3 rounded-xl font-bold"
          >
            Return To Menu
          </Link>
        </div>

      </div>
    </main>
  );
}