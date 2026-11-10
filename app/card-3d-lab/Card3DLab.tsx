"use client";
import { useEffect, useRef, useState } from "react";
import { getPlayerCardAssetSet } from "@/lib/cards/cardAssets";
import { unlockSfx } from "@/lib/audio/sfxStore";
import { MEASURED_CABINET_GEOMETRY } from "@/lib/card-3d/gameGeometry";
import type { Card3DLab as Lab, Card3DStats } from "@/lib/card-3d/runtime";

const FRONTS = ["SR1", "SSR2", "UR1"].map((id) => getPlayerCardAssetSet(id).frontImage);
const GAME_URL = "/battle?fatal-preview=safe-clear&dock-preview=true";
const btn: React.CSSProperties = { background: "#1b2530", color: "#e9eef3", border: "1px solid #34424f", borderRadius: 6, padding: "6px 12px", font: "inherit", cursor: "pointer" };

export default function Card3DLab() {
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [lab, setLab] = useState<Lab | null>(null);
  const [stats, setStats] = useState<Card3DStats | null>(null);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState<"game" | "lab">("game");
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    let live = true, mounted: Lab | null = null;
    void import("@/lib/card-3d/runtime").then(({ mountCard3DLab }) => {
      if (!live || !host.current) return;
      mounted = mountCard3DLab(host.current, FRONTS, setStats, mode === "game" ? { mode: "game", geometry: MEASURED_CABINET_GEOMETRY } : { mode: "lab" });
      (window as unknown as { __card3d?: Lab }).__card3d = mounted;
      setLab(mounted);
    });
    return () => { live = false; mounted?.dispose(); setLab(null); };
  }, [mode]);

  // The real battle screen is laid out at 1920×1080 and scaled to the stage width.
  useEffect(() => {
    const el = host.current; if (!el) return;
    const fit = () => setScale(el.clientWidth / 1920);
    const o = new ResizeObserver(fit); o.observe(el); fit();
    return () => o.disconnect();
  }, [mode]);
  // Dismiss the battle's "click to start" overlay inside the background frame (no sound: synthetic click).
  const onFrameLoad = () => {
    const doc = frame.current?.contentDocument; if (!doc) return;
    window.setTimeout(() => (doc.elementFromPoint(960, 540) as HTMLElement | null)?.click(), 1500);
  };

  const act = (fn: (l: Lab) => void) => () => { unlockSfx(); if (lab) fn(lab); };
  return (
    <main style={{ minHeight: "100vh", background: "#05080c", color: "#e9eef3", font: "14px/1.5 system-ui, sans-serif", padding: 12, boxSizing: "border-box" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <strong style={{ marginRight: 8 }}>3D カード試作</strong>
        <select style={btn} value={mode} onChange={(e) => setMode(e.target.value as "game" | "lab")}>
          <option value="game">ゲーム画角（実際の筐体画面）</option>
          <option value="lab">試作用の画角</option>
        </select>
        <button style={btn} onClick={act((l) => l.draw1())}>DRAW 1（排出口にセット）</button>
        <button style={btn} onClick={act((l) => l.draw2())}>DRAW 2（テーブルへ）</button>
        <button style={btn} onClick={act((l) => l.revealAll())}>全部めくる</button>
        <button style={btn} onClick={act((l) => l.reset())}>リセット</button>
        <label>速度{" "}
          <select style={btn} value={speed} onChange={(e) => { const s = +e.target.value; setSpeed(s); lab?.setSpeed(s); }}>
            {[1, 0.5, 0.25, 0.1].map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
        <button style={btn} onClick={() => { setPaused(!paused); lab?.setPaused(!paused); }}>{paused ? "再開" : "一時停止"}</button>
        <button style={btn} onClick={act((l) => l.advance(1000 / 30))}>1コマ送り</button>
        <span style={{ color: "#8fa0b0", fontVariantNumeric: "tabular-nums" }}>
          {stats ? `${stats.fps} fps / 描画 ${stats.frameMs} ms / ${stats.phases.join(" · ")}` : "読み込み中…"}
        </span>
      </div>
      <div style={{ position: "relative", width: "100%", maxWidth: "calc((100vh - 80px) * 16 / 9)", aspectRatio: "16 / 9", borderRadius: 8, overflow: "hidden", background: "#05080c" }}>
        {mode === "game" && (
          <iframe ref={frame} src={GAME_URL} title="battle background" onLoad={onFrameLoad} tabIndex={-1}
            style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, border: 0, transform: `scale(${scale})`, transformOrigin: "0 0", pointerEvents: "none" }} />
        )}
        <div ref={host} key={mode} style={{ position: "absolute", inset: 0 }} />
      </div>
      <p style={{ color: "#8fa0b0", margin: "8px 0 0" }}>カードをクリックすると、1枚ずつめくれます。ゲーム画角では、背景は実際のバトル画面（操作不可）です。</p>
    </main>
  );
}
