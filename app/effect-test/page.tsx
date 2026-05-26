"use client";

import { useState } from "react";

export default function EffectTestPage() {
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  const triggerEffect = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setOrigin(`${x}% ${y}%`);
    setActive(false);

    setTimeout(() => setActive(true), 20);
    setTimeout(() => setActive(false), 650);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-6">Press Depth Test</h1>

      <button
        onClick={triggerEffect}
        className="relative bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.35)] overflow-hidden"
      >
        <img
          src="/images/widebanner.png"
          alt="Test"
          style={{ transformOrigin: origin }}
          className={`w-full max-w-3xl rounded-2xl inline-block ${
            active ? "press-depth-effect" : ""
          }`}
        />
      </button>

      <p className="text-zinc-400 mt-6">
        Click different parts of the image.
      </p>
    </main>
  );
}