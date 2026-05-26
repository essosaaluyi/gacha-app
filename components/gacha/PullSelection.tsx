"use client";

type Props = {
  askPullConfirm: (count: number) => void;
};

export default function PullSelection({
  askPullConfirm,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-3xl mx-auto">
      <button
        onClick={() => askPullConfirm(1)}
        className="bg-zinc-900 border border-zinc-700 hover:border-blue-400 rounded-2xl p-4 transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <img
          src="/images/pack-1.png"
          alt="Single Pull"
          className="w-full aspect-[4/3] object-contain mb-3"
        />

        <p className="text-xl font-bold">Single Pull</p>

        <p className="text-emerald-400 font-bold">
          Cost: 100 Points
        </p>
      </button>

      <button
        onClick={() => askPullConfirm(10)}
        className="bg-zinc-900 border border-zinc-700 hover:border-purple-400 rounded-2xl p-4 transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <img
          src="/images/pack-10.png"
          alt="10 Pull"
          className="w-full aspect-[4/3] object-contain mb-3"
        />

        <p className="text-xl font-bold">10 Pull</p>

        <p className="text-emerald-400 font-bold">
          Cost: 1000 Points
        </p>
      </button>
    </div>
  );
}