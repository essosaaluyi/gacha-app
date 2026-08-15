"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RevealHandle, RevealStats } from "@/components/vfx/CardRevealCanvas";

/**
 * three.js is ~150 KB gzipped before our VFX layer. Loading it lazily and
 * client-only keeps it out of every other route's bundle, and the scene touches
 * `window` and WebGL at construction so it must never be prerendered.
 */
const CardRevealCanvas = dynamic(() => import("@/components/vfx/CardRevealCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
      Loading renderer…
    </div>
  ),
});

const QUALITIES = ["high", "medium", "low", "minimal"] as const;
const RARITIES = ["SR", "SSR", "UR"] as const;
const CARDS = [
  { label: "UR1", image: "/images/UR1.png" },
  { label: "UR2", image: "/images/UR2.png" },
  { label: "SSR1", image: "/images/SSR1.png" },
  { label: "SR1", image: "/images/SR1.png" },
];

const BENCHMARK_SECONDS = 10;

type Verdict = {
  tone: "good" | "warn" | "bad";
  headline: string;
  detail: string;
};

/** Turn a stats window into a plain-language answer about shipping this. */
function judge(stats: RevealStats): Verdict {
  const { frameP95Ms, droppedPct } = stats;

  if (frameP95Ms <= 17.5 && droppedPct < 5) {
    return {
      tone: "good",
      headline: "Holds 60 fps",
      detail: "p95 is inside one vsync. This tier is shippable on this device.",
    };
  }
  if (frameP95Ms <= 22 && droppedPct < 20) {
    return {
      tone: "warn",
      headline: "Mostly 60, with drops",
      detail: "Occasional missed frames. Fine for a 3-second reveal, not for a persistent scene.",
    };
  }
  if (frameP95Ms <= 34) {
    return {
      tone: "warn",
      headline: "Holds 30 fps, not 60",
      detail: "Playable but visibly less smooth. Drop a tier, or accept 30 for this device class.",
    };
  }
  return {
    tone: "bad",
    headline: "Below 30 fps",
    detail: "This device should get the pre-rendered video fallback instead.",
  };
}

const EMPTY_DEVICE: Record<string, string> = {};
let deviceCache: Record<string, string> | null = null;

/**
 * Facts about the machine the numbers came from — a measurement without its
 * hardware is not a data point.
 *
 * Memoised because `useSyncExternalStore` requires a referentially stable
 * snapshot; recomputing would spin the render loop.
 */
function readDevice(): Record<string, string> {
  if (deviceCache) return deviceCache;

  const info: Record<string, string> = {
    "Device pixel ratio": String(window.devicePixelRatio ?? 1),
    "CPU cores": String(navigator.hardwareConcurrency ?? "unknown"),
    // deviceMemory is Chromium-only.
    "Memory (GB)": String(
      (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? "unknown"
    ),
    Pointer: window.matchMedia("(pointer: coarse)").matches ? "coarse (touch)" : "fine (mouse)",
  };

  try {
    const probe = document.createElement("canvas").getContext("webgl2");
    const ext = probe?.getExtension("WEBGL_debug_renderer_info");
    if (probe && ext) {
      info.GPU = String(probe.getParameter(ext.UNMASKED_RENDERER_WEBGL));
    }
    probe?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // Renderer strings are routinely blocked for fingerprinting reasons.
  }

  deviceCache = info;
  return info;
}

const subscribeNever = () => () => {};

function StatRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-zinc-800/60 last:border-0">
      <span className="text-zinc-400 text-sm">
        {label}
        {hint && <span className="text-zinc-600 text-xs ml-1.5">{hint}</span>}
      </span>
      <span className="font-mono text-sm tabular-nums text-zinc-100">{value}</span>
    </div>
  );
}

export default function EffectTestPage() {
  const [tab, setTab] = useState<"reveal" | "press">("reveal");

  /* ---------------- 3D reveal harness ---------------- */
  const handleRef = useRef<RevealHandle | null>(null);
  const [quality, setQuality] = useState<string>("high");
  const [rarity, setRarity] = useState<string>("UR");
  const [cardImage, setCardImage] = useState(CARDS[0].image);
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<RevealStats | null>(null);
  const [loop, setLoop] = useState(false);
  const [benchmark, setBenchmark] = useState<{ running: boolean; left: number } | null>(null);
  const [result, setResult] = useState<(RevealStats & { quality: string }) | null>(null);
  const [size, setSize] = useState<{ width: number; height: number; pixelRatio: number } | null>(
    null
  );

  // Browser-only, never changes: the server snapshot is empty and React
  // re-renders with the real one after hydration.
  const device = useSyncExternalStore(subscribeNever, readDevice, () => EMPTY_DEVICE);

  const loopRef = useRef(loop);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  // Poll the scene for its rolling stats window.
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      setStats(handleRef.current?.getStats() ?? null);
      setSize(handleRef.current?.getRenderSize() ?? null);
    }, 250);
    return () => window.clearInterval(id);
  }, [ready]);

  // Benchmark countdown: play on loop for a fixed window, then freeze the result.
  useEffect(() => {
    if (!benchmark?.running) return;

    const id = window.setInterval(() => {
      setBenchmark((current) => {
        if (!current) return current;
        if (current.left <= 1) {
          const final = handleRef.current?.getStats();
          if (final) setResult({ ...final, quality });
          setLoop(false);
          return { running: false, left: 0 };
        }
        return { running: true, left: current.left - 1 };
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [benchmark?.running, quality]);

  const play = () => handleRef.current?.play(rarity);

  const startBenchmark = () => {
    setResult(null);
    setLoop(true);
    setBenchmark({ running: true, left: BENCHMARK_SECONDS });
    play();
  };

  const onComplete = () => {
    if (loopRef.current) {
      // Immediate replay keeps the heaviest phases on screen for the whole
      // benchmark window instead of measuring an idle scene.
      window.setTimeout(() => handleRef.current?.play(rarity), 120);
    }
  };

  const verdict = stats && stats.samples > 30 ? judge(stats) : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold mr-4">Effect Test</h1>
          {(
            [
              ["reveal", "3D Reveal (three.js)"],
              ["press", "Press Depth (CSS)"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                tab === key ? "bg-blue-600" : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "reveal" ? (
          <div className="grid lg:grid-cols-[1fr_340px] gap-6">
            {/* ---- viewport ---- */}
            <div>
              <div className="relative w-full aspect-[3/4] md:aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800">
                <CardRevealCanvas
                  quality={quality}
                  cardImage={cardImage}
                  handleRef={handleRef}
                  onReady={() => setReady(true)}
                  onComplete={onComplete}
                />

                {benchmark?.running && (
                  <div className="absolute top-3 left-3 bg-red-600/90 px-3 py-1.5 rounded-lg text-sm font-semibold">
                    Measuring… {benchmark.left}s
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {RARITIES.map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      setRarity(value);
                      handleRef.current?.play(value);
                    }}
                    disabled={!ready}
                    className={`px-4 py-2.5 rounded-xl font-semibold disabled:opacity-40 ${
                      rarity === value ? "bg-blue-600" : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    Play {value}
                  </button>
                ))}

                <button
                  onClick={() => handleRef.current?.stop()}
                  disabled={!ready}
                  className="px-4 py-2.5 rounded-xl font-semibold bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40"
                >
                  Stop
                </button>

                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loop}
                    onChange={(event) => {
                      setLoop(event.target.checked);
                      if (event.target.checked) play();
                    }}
                    className="accent-blue-500"
                  />
                  <span className="text-sm">Loop</span>
                </label>

                <button
                  onClick={startBenchmark}
                  disabled={!ready || benchmark?.running}
                  className="px-4 py-2.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
                >
                  Run {BENCHMARK_SECONDS}s benchmark
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {CARDS.map((card) => (
                  <button
                    key={card.image}
                    onClick={() => {
                      setCardImage(card.image);
                      handleRef.current?.setCardImage(card.image);
                    }}
                    disabled={!ready}
                    className={`px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 ${
                      cardImage === card.image ? "bg-zinc-700" : "bg-zinc-900 hover:bg-zinc-800"
                    }`}
                  >
                    {card.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ---- readouts ---- */}
            <div className="space-y-4">
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <h2 className="font-semibold mb-3">Quality tier</h2>
                <div className="grid grid-cols-2 gap-2">
                  {QUALITIES.map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setReady(false);
                        setStats(null);
                        setQuality(value);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium capitalize ${
                        quality === value ? "bg-blue-600" : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Switching tier rebuilds the scene — tessellation, particle capacity and which
                  post passes exist are all fixed at construction.
                </p>
              </section>

              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <h2 className="font-semibold mb-2">Live</h2>
                {stats ? (
                  <>
                    <StatRow label="FPS" value={String(stats.fps)} hint="median" />
                    <StatRow label="Frame" value={`${stats.frameMs.toFixed(1)} ms`} hint="p50" />
                    <StatRow label="Frame" value={`${stats.frameP95Ms.toFixed(1)} ms`} hint="p95" />
                    <StatRow label="Worst" value={`${stats.frameWorstMs.toFixed(1)} ms`} />
                    <StatRow label="CPU" value={`${stats.cpuMs.toFixed(1)} ms`} hint="p50" />
                    <StatRow label="Missed vsync" value={`${stats.droppedPct.toFixed(0)}%`} />
                    <StatRow label="Draw calls" value={String(stats.calls)} />
                    <StatRow
                      label="Triangles"
                      value={stats.triangles.toLocaleString()}
                    />
                    <StatRow label="Particles" value={stats.particles.toLocaleString()} />
                    <StatRow label="Programs" value={String(stats.programs)} />
                    {size && (
                      <StatRow
                        label="Render size"
                        value={`${size.width}×${size.height} @${size.pixelRatio.toFixed(2)}x`}
                      />
                    )}
                  </>
                ) : (
                  <p className="text-zinc-500 text-sm">Waiting for the first frames…</p>
                )}
              </section>

              {verdict && (
                <section
                  className={`rounded-2xl p-4 border ${
                    verdict.tone === "good"
                      ? "bg-emerald-950/50 border-emerald-800"
                      : verdict.tone === "warn"
                        ? "bg-amber-950/50 border-amber-800"
                        : "bg-red-950/50 border-red-800"
                  }`}
                >
                  <h2 className="font-semibold mb-1">{verdict.headline}</h2>
                  <p className="text-sm text-zinc-300">{verdict.detail}</p>
                </section>
              )}

              {result && (
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <h2 className="font-semibold mb-2">
                    Benchmark result
                    <span className="text-zinc-500 font-normal text-sm ml-2 capitalize">
                      {result.quality}
                    </span>
                  </h2>
                  <StatRow label="FPS" value={String(result.fps)} hint="median" />
                  <StatRow label="Frame p95" value={`${result.frameP95Ms.toFixed(1)} ms`} />
                  <StatRow label="Missed vsync" value={`${result.droppedPct.toFixed(0)}%`} />
                  <StatRow label="Samples" value={String(result.samples)} />
                </section>
              )}

              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <h2 className="font-semibold mb-2">Device</h2>
                {Object.entries(device).map(([key, value]) => (
                  <StatRow key={key} label={key} value={value} />
                ))}
              </section>
            </div>
          </div>
        ) : (
          <PressDepthTest />
        )}
      </div>
    </main>
  );
}

/** The original CSS press-depth test, kept intact. */
function PressDepthTest() {
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
    <div className="flex flex-col items-center justify-center p-6">
      <button
        onClick={triggerEffect}
        className="relative bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.35)] overflow-hidden"
      >
        <img
          src="/images/widebanner.webp"
          alt="Test"
          style={{ transformOrigin: origin }}
          className={`w-full max-w-3xl rounded-2xl inline-block ${
            active ? "press-depth-effect" : ""
          }`}
        />
      </button>

      <p className="text-zinc-400 mt-6">Click different parts of the image.</p>
    </div>
  );
}
