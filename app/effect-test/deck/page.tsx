"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import type { DeckFxHandle, Outcome } from "@/components/vfx/DeckFxStage";
import TopBar from "@/components/TopBar";

/**
 * three.js and the VFX layer are ~150 KB gzipped. Loading them lazily and
 * client-only keeps them off every other route, and the overlay touches WebGL
 * at construction so it must never be prerendered.
 */
const DeckFxStage = dynamic(() => import("@/components/vfx/DeckFxStage"), { ssr: false });

/** Seconds the card takes to travel from the deck to the table. */
const DEAL_SECONDS = 0.55;

const OUTCOMES: { key: Outcome; label: string; note: string }[] = [
  { key: "white", label: "White", note: "~2% · glow + glitter · 28% of draws" },
  { key: "blue", label: "Blue", note: "~5% · glow + glitter · 15% of draws" },
  { key: "green", label: "Green", note: "~35% · adds arcs · 1 in 30" },
  { key: "red", label: "Red", note: "90% · arcs · 1 in 94" },
  { key: "gold", label: "Gold", note: "certain · arcs · 1 in 741" },
  { key: "normal", label: "None", note: "no cue — the disc stays dark" },
];

type Phase = "idle" | "armed" | "dealing" | "landed";

export default function DeckEffectsPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<DeckFxHandle | null>(null);

  const [outcome, setOutcome] = useState<Outcome>("green");
  const [phase, setPhase] = useState<Phase>("idle");
  const [ready, setReady] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const note = (line: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()} — ${line}`, ...prev].slice(0, 6));

  /** First click: the deck may or may not light up. */
  const arm = () => {
    if (!ready || phase !== "idle") return;
    const shown = fxRef.current?.armDraw(outcome) ?? false;
    setPhase("armed");
    note(shown ? `Armed ${outcome}` : `Armed ${outcome} — disc stays dark`);
  };

  /** Second click: pull the card, then land it. */
  const draw = () => {
    if (!ready || phase !== "armed") return;
    setPhase("dealing");
    fxRef.current?.drawCard(outcome, DEAL_SECONDS);
    note(`Drew ${outcome}`);

    window.setTimeout(() => {
      setPhase("landed");
      fxRef.current?.cardLanded("chance");
      note(`Landed ${outcome}`);
    }, DEAL_SECONDS * 1000);
  };

  const reset = () => {
    setPhase("idle");
    fxRef.current?.clear();
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <TopBar />

        <div className="flex items-baseline justify-between gap-4 mb-1">
          <h1 className="text-2xl font-bold">Deck effects</h1>
          <Link href="/effect-test" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Reveal sandbox
          </Link>
        </div>
        <p className="text-zinc-400 text-sm mb-5 max-w-2xl">
          Each rung of the anticipation ladder, pinned. In the real cabinet the rung
          is rolled once per hand against the odds — see{" "}
          <code className="text-zinc-300">lib/battle-pixi/presentation/drawTell.ts</code> — and
          the percentage on each button is what that colour <em>means</em>, not how often it
          shows. Pick a rung, click <strong className="text-zinc-200">Arm</strong>, then{" "}
          <strong className="text-zinc-200">Draw</strong>.
        </p>

        {/* The board. Positions are measured against this, and it is what shakes. */}
        <div
          ref={hostRef}
          className="relative h-[430px] rounded-2xl border border-zinc-800 overflow-hidden mb-5"
          style={{
            background: "radial-gradient(120% 90% at 50% 115%, #17203a 0%, #0a0c14 62%)",
          }}
        >
          {/* The board the card lands on, top-left, with the deck below it. */}
          <div
            ref={targetRef}
            className="absolute left-12 top-8 w-[116px] h-[164px] rounded-xl border-2 border-dashed border-zinc-700/70"
          />

          {/*
            The dealt card, transform-only so it never triggers layout.

            Note that Tailwind v4 emits its translate utilities as the standalone
            `translate` property, which composes with `transform` rather than
            replacing it — so a translate class and an inline transform both
            apply, and the card ends up double-shifted.
          */}
          <div
            ref={cardRef}
            className="absolute left-12 top-8 w-[116px] h-[164px] rounded-xl bg-cover bg-center shadow-2xl transition-opacity"
            style={{
              backgroundImage: "url(/images/SSR1.png)",
              opacity: phase === "dealing" || phase === "landed" ? 1 : 0,
              transform:
                phase === "dealing" || phase === "landed"
                  ? "translateY(0) scale(1)"
                  : "translateY(210px) scale(0.85)",
              transitionProperty: "transform, opacity",
              transitionDuration: `${DEAL_SECONDS}s`,
              transitionTimingFunction: "cubic-bezier(0.16, 0.84, 0.34, 1)",
            }}
          />

          {/*
            The deck the player draws from — a stand-in for the real one, which
            lives in the game itself. Round, with a green and gold frame, sat
            below the board's top-left corner.

            Everything the effects need comes from getBoundingClientRect(), so
            swapping this for the real disc is a matter of pointing deckRef at
            it. The only thing that has to match is `deckShape`, which decides
            whether the aura hugs a circle or a rounded box.
          */}
          <div
            ref={deckRef}
            className="absolute left-10 bottom-10 w-[132px] h-[132px] rounded-full grid place-items-center"
            style={{
              background:
                "radial-gradient(circle at 38% 32%, #2e6f4e 0%, #1b4531 46%, #0e2a1e 100%)",
              border: "3px solid #d9b45b",
              boxShadow:
                "0 0 0 1px rgba(0,0,0,0.5), inset 0 0 22px rgba(0,0,0,0.55), 0 14px 34px rgba(0,0,0,0.55)",
            }}
          >
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[#d9b45b]">
              Deck
            </span>
          </div>

          <DeckFxStage
            hostRef={hostRef}
            deckRef={deckRef}
            targetRef={targetRef}
            handleRef={fxRef}
            deckShape="disc"
            glitterTone="gold"
            onReady={() => setReady(true)}
          />
        </div>

        <div className="grid md:grid-cols-[1fr_320px] gap-5">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {OUTCOMES.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setOutcome(o.key)}
                  disabled={phase !== "idle"}
                  className={`px-4 py-2.5 rounded-xl font-semibold disabled:opacity-40 ${
                    outcome === o.key ? "bg-blue-600" : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={arm}
                disabled={!ready || phase !== "idle"}
                className="px-5 py-3 rounded-xl font-semibold bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40"
              >
                Arm (first click)
              </button>
              <button
                onClick={draw}
                disabled={!ready || phase !== "armed"}
                className="px-5 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
              >
                Draw
              </button>
              <button
                onClick={reset}
                disabled={!ready}
                className="px-5 py-3 rounded-xl font-semibold bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40"
              >
                Reset
              </button>
            </div>

            <p className="text-xs text-zinc-500 mt-3">
              {OUTCOMES.find((o) => o.key === outcome)?.note}
            </p>
          </div>

          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h2 className="font-mono text-[11px] tracking-[0.14em] uppercase text-zinc-500 mb-3">
              Event log
            </h2>
            {log.length === 0 ? (
              <p className="text-zinc-500 text-sm">Nothing yet.</p>
            ) : (
              <ul className="space-y-1">
                {log.map((line, i) => (
                  <li key={i} className="font-mono text-[11px] text-zinc-400">
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
