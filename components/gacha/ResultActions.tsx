"use client";

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

      <a
        href="/menu"
        className="bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-2xl font-semibold text-lg"
      >
        Back to Menu
      </a>
    </div>
  );
}
