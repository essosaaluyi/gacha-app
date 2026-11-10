"use client";
import { useEffect, useRef, useState } from "react";
import { getPlayerCardAssetSet } from "@/lib/cards/cardAssets";
import { unlockSfx } from "@/lib/audio/sfxStore";
import type { Card3DLab as Lab, Card3DStats } from "@/lib/card-3d/runtime";

const FRONTS = ["SR1", "SSR2", "UR1"].map((id) => getPlayerCardAssetSet(id).frontImage);
const btn: React.CSSProperties = { background: "#1b2530", color: "#e9eef3", border: "1px solid #34424f", borderRadius: 6, padding: "6px 12px", font: "inherit", cursor: "pointer" };

export default function Card3DLab() {
  const host = useRef<HTMLDivElement>(null);
  const [lab, setLab] = useState<Lab | null>(null);
  const [stats, setStats] = useState<Card3DStats | null>(null);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let live = true, mounted: Lab | null = null;
    void import("@/lib/card-3d/runtime").then(({ mountCard3DLab }) => {
      if (!live || !host.current) return;
      mounted = mountCard3DLab(host.current, FRONTS, setStats);
      (window as unknown as { __card3d?: Lab }).__card3d = mounted;
      setLab(mounted);
    });
    return () => { live = false; mounted?.dispose(); setLab(null); };
  }, []);

  const act = (fn: (l: Lab) => void) => () => { unlockSfx(); if (lab) fn(lab); };
  return (
    <main style={{ minHeight: "100vh", background: "#05080c", color: "#e9eef3", font: "14px/1.5 system-ui, sans-serif", padding: 12, boxSizing: "border-box" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <strong style={{ marginRight: 8 }}>3D カード試作</strong>
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
      <div ref={host} style={{ width: "100%", aspectRatio: "16 / 9", maxHeight: "calc(100vh - 70px)", borderRadius: 8, overflow: "hidden", background: "#05080c" }} />
      <p style={{ color: "#8fa0b0", margin: "8px 0 0" }}>テーブルのカードをクリックすると、1枚ずつめくれます。</p>
    </main>
  );
}
