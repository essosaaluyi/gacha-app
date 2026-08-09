"use client";

type Props = {
  askPullConfirm: (count: number) => void;
  /** Live prices, so the pack labels cannot advertise a stale cost. */
  costs: { single: number; ten: number };
};

export default function PullSelection({
  askPullConfirm,
  costs,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-3xl mx-auto">
      <button
        onClick={() => askPullConfirm(1)}
        aria-label="Single pull"
        className="bg-zinc-900 border border-zinc-700 hover:border-blue-400 rounded-2xl p-4 transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {/* Decorative: the button is labelled above and the text below already
            names the pack, so alt text here would just repeat it. */}
        <img
          src="/images/pack-1.webp"
          alt=""
          className="w-full aspect-[4/3] object-contain mb-3"
        />

        <p className="text-xl font-bold">Single Pull</p>

        <p className="text-emerald-400 font-bold">
          Cost: {costs.single.toLocaleString()} Points
        </p>
      </button>

      <button
        onClick={() => askPullConfirm(10)}
        aria-label="Ten pull"
        className="bg-zinc-900 border border-zinc-700 hover:border-purple-400 rounded-2xl p-4 transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <img
          src="/images/pack-10.webp"
          alt=""
          className="w-full aspect-[4/3] object-contain mb-3"
        />

        <p className="text-xl font-bold">10 Pull</p>

        <p className="text-emerald-400 font-bold">
          Cost: {costs.ten.toLocaleString()} Points
        </p>
      </button>
    </div>
  );
}