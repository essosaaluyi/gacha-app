"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import BattleInterruptCutIn from "@/components/battle/BattleInterruptCutIn";
import { playSfx, unlockSfx } from "@/lib/audio/sfxStore";

const DEFAULT_ASSET = "/images/cards/player/R1/card.webp";

// The battle cabinet screen these overlays actually render into.
const STAGE_W = 1250;
const STAGE_H = 618;

const ACCENTS = [
  { name: "white", value: "rgba(255,255,255,0.95)" },
  { name: "gold", value: "rgba(250,204,21,0.95)" },
  { name: "red", value: "rgba(248,113,113,0.95)" },
  { name: "blue", value: "rgba(147,197,253,0.95)" },
  { name: "violet", value: "rgba(216,180,254,0.95)" },
];

// Mirrors the keyframe breakpoints in globals.css (bicutBandOpen / bicutEdgeOpen).
const PHASES = [
  { at: 0, name: "slash" },
  { at: 6, name: "opening" },
  { at: 22, name: "hold" },
  { at: 74, name: "closing" },
  { at: 90, name: "collapse" },
];

const STAGE_BG = {
  checker: "checker",
  game: "radial-gradient(circle at 50% 40%, #1b2340, #05060c 70%)",
  black: "#000",
};

export default function CutInWorkstationPage() {
  const [playId, setPlayId] = useState(0);
  const [asset, setAsset] = useState<string | undefined>(DEFAULT_ASSET);
  const [assetPath, setAssetPath] = useState(DEFAULT_ASSET);
  const [duration, setDuration] = useState(2000);
  const [bandHeight, setBandHeight] = useState(45);
  const [accent, setAccent] = useState(ACCENTS[0].value);
  const [artScale, setArtScale] = useState(183);
  const [artX, setArtX] = useState(26);
  const [artY, setArtY] = useState(39);
  const [artFit, setArtFit] = useState<"cover" | "contain">("cover");
  const [bg, setBg] = useState<keyof typeof STAGE_BG>("checker");

  // Transport
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loop, setLoop] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Read inside the mount layout effect, which must not re-run when they change.
  const pausedRef = useRef(paused);
  const timeRef = useRef(time);
  pausedRef.current = paused;
  timeRef.current = time;

  const getAnims = useCallback(
    () => stageRef.current?.getAnimations({ subtree: true }) ?? [],
    []
  );

  const applySeek = useCallback(
    (ms: number) => {
      getAnims().forEach((a) => {
        a.pause();
        a.currentTime = ms;
      });
    },
    [getAnims]
  );

  const seekTo = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, Math.min(ms, duration));
      setPaused(true);
      setTime(clamped);
      applySeek(clamped);
    },
    [applySeek, duration]
  );

  const play = useCallback(() => {
    setTime(0);
    setPaused(false);
    setPlayId((id) => id + 1);
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
    getAnims().forEach((a) => a.play());
  }, [getAnims]);

  const pause = useCallback(() => {
    setPaused(true);
    getAnims().forEach((a) => a.pause());
  }, [getAnims]);

  // Drive the playhead while running. Every animation in the effect shares
  // --bicut-dur, so the first one is a faithful clock for all of them.
  useEffect(() => {
    if (paused) return;

    let raf = 0;
    const tick = () => {
      const anim = getAnims()[0];
      if (anim) {
        setTime(Math.min(Number(anim.currentTime) || 0, duration));
        if (anim.playState === "finished") {
          if (loop) {
            setPlayId((id) => id + 1);
            setTime(0);
          } else {
            setPaused(true);
            setTime(duration);
          }
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, playId, duration, loop, getAnims]);

  // A remount restarts the CSS animations, and they auto-play the instant the
  // nodes exist. Claim them in a layout effect — before the first paint — or
  // they run free for however long mount takes and the playhead lies.
  useLayoutEffect(() => {
    const anims = getAnims();
    if (!anims.length) return;

    if (pausedRef.current) {
      anims.forEach((a) => {
        a.pause();
        a.currentTime = timeRef.current;
      });
    } else {
      anims.forEach((a) => {
        a.currentTime = 0;
        a.play();
      });
    }
  }, [playId, getAnims]);

  // Retuning while parked rescales the timeline; hold the playhead in place.
  useLayoutEffect(() => {
    if (pausedRef.current) applySeek(Math.min(timeRef.current, duration));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, bandHeight, artScale, artX, artY, artFit, accent]);

  const step = (delta: number) => seekTo(time + delta);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        paused ? resume() : pause();
      } else if (e.code === "Enter") {
        e.preventDefault();
        play();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekTo(time - (e.shiftKey ? 100 : 16));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seekTo(time + (e.shiftKey ? 100 : 16));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, time, pause, resume, play, seekTo]);

  const loadFile = (file: File) => {
    setAsset(URL.createObjectURL(file));
    setAssetPath(file.name);
  };

  const pct = duration ? (time / duration) * 100 : 0;
  const phase =
    [...PHASES].reverse().find((p) => pct >= p.at)?.name ?? "slash";

  const checker =
    "repeating-conic-gradient(#2a2d36 0% 25%, #1a1c23 0% 50%) 50% / 24px 24px";

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-black tracking-wide">
        Interruption Cut-In Workstation
      </h1>
      <p className="-mt-3 text-xs text-zinc-500">
        Stage locked to the battle screen: {STAGE_W} × {STAGE_H}
      </p>

      <div
        ref={stageRef}
        className="relative w-full overflow-hidden rounded-lg border border-zinc-800"
        style={{
          // Matches the real cabinet screen in BattleScreen.tsx, so band height
          // and art framing read exactly as they will in game.
          maxWidth: STAGE_W,
          aspectRatio: `${STAGE_W} / ${STAGE_H}`,
          background: bg === "checker" ? checker : STAGE_BG[bg],
        }}
      >
        <BattleInterruptCutIn
          key={playId}
          asset={asset}
          accent={accent}
          bandPercent={bandHeight}
          artScale={artScale / 100}
          artOffsetX={`${artX}%`}
          artOffsetY={`${artY}%`}
          artFit={artFit}
          durationMs={duration}
        />
      </div>

      {/* ---- transport ---- */}
      <div
        className="w-full flex flex-col gap-1"
        style={{ maxWidth: STAGE_W }}
      >
        <div className="flex items-center gap-3">
          <span className="w-20 text-xs uppercase tracking-widest text-amber-400">
            {phase}
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            step={1}
            value={Math.round(time)}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="flex-1 accent-amber-500"
          />
          <span className="w-28 text-right text-xs tabular-nums text-amber-400">
            {Math.round(time)} ms · {pct.toFixed(0)}%
          </span>
        </div>

        {/* phase markers */}
        <div className="relative h-4 ml-[5.75rem] mr-[7.5rem]">
          {PHASES.slice(1).map((p) => (
            <div
              key={p.name}
              className="absolute top-0 flex flex-col items-center -translate-x-1/2"
              style={{ left: `${p.at}%` }}
            >
              <div className="w-px h-1.5 bg-zinc-600" />
              <span className="text-[9px] text-zinc-500">{p.at}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={play}
          className="px-5 py-2 rounded bg-white text-black font-black tracking-wide"
        >
          ⟲ RESTART
        </button>
        <button
          onClick={() => (paused ? resume() : pause())}
          className={`px-5 py-2 rounded font-black tracking-wide border ${
            paused
              ? "bg-emerald-500 border-emerald-500 text-black"
              : "bg-zinc-800 border-zinc-600"
          }`}
        >
          {paused ? "▶ PLAY" : "❚❚ PAUSE"}
        </button>
        <button
          onClick={() => setLoop((l) => !l)}
          className={`px-4 py-2 rounded border text-sm font-bold ${
            loop ? "bg-blue-600 border-blue-500" : "bg-zinc-900 border-zinc-700"
          }`}
        >
          LOOP
        </button>

        <div className="flex gap-1 ml-2">
          <button onClick={() => seekTo(0)} className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm">⏮</button>
          <button onClick={() => step(-100)} className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm">−100</button>
          <button onClick={() => step(-16)} className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm">−16</button>
          <button onClick={() => step(16)} className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm">+16</button>
          <button onClick={() => step(100)} className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm">+100</button>
          <button onClick={() => seekTo(duration)} className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm">⏭</button>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Space = play/pause · Enter = restart · ←/→ = step 16ms (Shift = 100ms)
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs uppercase tracking-widest text-zinc-500">
          Audio
        </span>
        <button
          onClick={() => {
            unlockSfx();
            play();
            playSfx("cutIn", { force: true });
          }}
          className="px-4 py-2 rounded bg-amber-500 text-black text-sm font-bold"
        >
          ▶ CUT-IN + SE
        </button>
        <button
          onClick={() => {
            unlockSfx();
            playSfx("cutIn", { force: true });
          }}
          className="px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm"
        >
          cut-in-se only
        </button>
        <button
          onClick={() => {
            unlockSfx();
            playSfx("chestOpenPoint", { force: true });
          }}
          className="px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm"
        >
          chest-open-point (bonus reveal)
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <label className="px-4 py-2 rounded border border-zinc-700 cursor-pointer text-sm">
          Load image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadFile(file);
            }}
          />
        </label>

        <input
          value={assetPath}
          onChange={(e) => {
            setAssetPath(e.target.value);
            setAsset(e.target.value || undefined);
          }}
          placeholder="/images/... (public path)"
          className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm w-72"
        />

        <select
          value={bg}
          onChange={(e) => setBg(e.target.value as keyof typeof STAGE_BG)}
          className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm"
        >
          <option value="checker">checker bg</option>
          <option value="game">game bg</option>
          <option value="black">black bg</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-zinc-400">Duration: {duration}ms</span>
          <input
            type="range"
            min={600}
            max={4000}
            step={50}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-zinc-400">Band height: {bandHeight}%</span>
          <input
            type="range"
            min={10}
            max={100}
            step={1}
            value={bandHeight}
            onChange={(e) => setBandHeight(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-zinc-400">Image scale: {artScale}%</span>
          <input
            type="range"
            min={20}
            max={300}
            step={1}
            value={artScale}
            onChange={(e) => setArtScale(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-zinc-400">Image fit</span>
          <select
            value={artFit}
            onChange={(e) => setArtFit(e.target.value as "cover" | "contain")}
            className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700"
          >
            <option value="cover">cover</option>
            <option value="contain">contain</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-zinc-400">Image X: {artX}%</span>
          <input
            type="range"
            min={-100}
            max={100}
            step={1}
            value={artX}
            onChange={(e) => setArtX(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-zinc-400">Image Y: {artY}%</span>
          <input
            type="range"
            min={-100}
            max={100}
            step={1}
            value={artY}
            onChange={(e) => setArtY(Number(e.target.value))}
          />
        </label>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-zinc-400">Accent</span>
          <div className="flex gap-2">
            {ACCENTS.map((option) => (
              <button
                key={option.name}
                onClick={() => setAccent(option.value)}
                className={`w-9 h-9 rounded-full border-2 ${
                  accent === option.value ? "border-white" : "border-zinc-700"
                }`}
                style={{ background: option.value }}
                aria-label={option.name}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
