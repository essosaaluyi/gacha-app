"use client";

import { useEffect, useRef, useState } from "react";
import { mountDrawButton3D, type DrawButton3D, type LampState, type LightingPreset } from "@/lib/button-3d/runtime";
import { mountPushButton3D } from "@/lib/button-3d/pushButton";
import type { SfxName } from "@/lib/audio/sfxStore";

type Phase = "ready" | "set" | "dealing";
const LABEL: Record<Phase, string> = {
  ready: "グレー（待機中：押すとカードをセット）",
  set: "スカイブルー（カードセット済み：次の押下待ち）",
  dealing: "消灯（カードを展開中）",
};
const LAMP: Record<Phase, LampState> = { ready: "gray", set: "sky", dealing: "off" };
/** Simulated landing times after the second press (ms); the real game will call this on its own last landing. */
const LANDINGS = [900, 1500, 2100];
/** Four lighting setups side by side, so the reflections can be compared. */
const LIGHTS: { id: LightingPreset; name: string; note: string }[] = [
  { id: "studio", name: "A：スタジオ（r6）", note: "帯状ライトを均等に配置 + 平行光" },
  { id: "room", name: "B：部屋", note: "RoomEnvironment + 半球光 + スポット" },
  { id: "hall", name: "C：ホール", note: "天井の小さなランプ・ネオンを不規則に配置 + スポット + 色付き点光源" },
  { id: "window", name: "D：窓", note: "ブラインド越しの窓 + 面光源 + 太陽光" },
];

export default function DrawButtonLab() {
  const hosts = useRef<(HTMLDivElement | null)[]>([]);
  const [api, setApi] = useState<{ buttons: DrawButton3D[]; reset(): void } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [landed, setLanded] = useState(0);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(true);
  const [shape, setShape] = useState<"round" | "push">("round");

  useEffect(() => {
    let state: Phase = "ready";
    let timers: number[] = [];
    let lastAt = -1e9, lastSfx: SfxName | null = null;
    const buttons: DrawButton3D[] = [];
    const go = (next: Phase) => { state = next; buttons.forEach((b) => b.setLamp(LAMP[next])); setPhase(next); };
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    // gray → press (card set) → sky → press (draw) → off while the cards deal → last card lands → gray.
    const advancePhase = (): SfxName | null => {
      if (state === "ready") { go("set"); setLanded(0); return "cardSetToDisk"; }
      if (state === "set") {
        go("dealing");
        timers = LANDINGS.map((at, i) => window.setTimeout(() => {
          setLanded(i + 1);
          if (i === LANDINGS.length - 1) go("ready");
        }, at));
        return "drawCard";
      }
      return null; // lamp off: the button does nothing while cards are dealt
    };
    // Pressing all four at once counts as one press.
    const onPress = () => {
      const now = performance.now();
      if (now - lastAt > 50) { lastAt = now; lastSfx = advancePhase(); }
      return lastSfx;
    };
    const mount = shape === "push" ? mountPushButton3D : mountDrawButton3D;
    LIGHTS.forEach((l, i) => {
      const host = hosts.current[i];
      if (!host) return;
      const b = mount(host, { lighting: l.id, onPress });
      b.setSound(i === 0 && soundRef.current); // one voice is enough
      buttons.push(b);
    });
    const reset = () => { clear(); setLanded(0); go("ready"); };
    const each = (f: (b: DrawButton3D) => void) => () => buttons.forEach(f);
    (window as unknown as { __button3d?: unknown }).__button3d = {
      press: each((b) => b.press()),
      setLamp: (s: LampState) => buttons.forEach((b) => b.setLamp(s)),
      vibrate: (ms?: number) => buttons.forEach((b) => b.vibrate(ms)),
      setPaused: (on: boolean) => buttons.forEach((b) => b.setPaused(on)),
      advance: (ms: number) => buttons.forEach((b) => b.advance(ms)),
      reset,
    };
    setApi({ buttons, reset });
    return () => { clear(); buttons.forEach((b) => b.dispose()); setApi(null); setPhase("ready"); setLanded(0); };
  }, [shape]);

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% 40%, #3a4456, #1b212c 70%)", color: "#e8eef8", display: "grid", placeItems: "center", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "grid", gap: 12, justifyItems: "center", width: "min(1000px, 100%)" }}>
        <h1 style={{ margin: 0, fontSize: 18, letterSpacing: ".12em" }}>DRAW BUTTON 3D（試作）ライト比較</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 10, width: "100%" }}>
          {LIGHTS.map((l, i) => (
            <figure key={l.id} style={{ margin: 0, display: "grid", gap: 4, justifyItems: "center" }}>
              <div ref={(el) => { hosts.current[i] = el; }} style={{ width: "100%", aspectRatio: "1 / 1" }} />
              <figcaption style={{ fontSize: 14, fontWeight: 700 }}>{l.name}</figcaption>
              <span style={{ fontSize: 11, opacity: .7, textAlign: "center" }}>{l.note}</span>
            </figure>
          ))}
        </div>
        <p data-phase={phase} style={{ margin: 0, fontSize: 15 }}>ランプ：{LABEL[phase]}</p>
        <div aria-label="テーブルに置かれたカード" style={{ display: "flex", gap: 8 }}>
          {LANDINGS.map((_, i) => (
            <span key={i} style={{ width: 34, height: 48, borderRadius: 4, border: "1px solid #8aa4c8", background: i < landed ? "#cfe3ff" : "transparent", transition: "background .2s" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" onClick={() => api?.buttons.forEach((b) => b.press())}>押す（4 つ同時）</button>
          <button type="button" onClick={() => api?.reset()}>リセット</button>
          <button type="button" onClick={() => api?.buttons.forEach((b) => b.vibrate())}>当たり確定バイブ（保管用）</button>
          <button type="button" onClick={() => setShape(shape === "round" ? "push" : "round")}>形：{shape === "round" ? "丸型" : "盾型（保管）"}</button>
          <button type="button" onClick={() => { const next = !sound; setSound(next); soundRef.current = next; api?.buttons[0]?.setSound(next); }}>効果音：{sound ? "ON" : "OFF"}</button>
        </div>
        <p style={{ margin: 0, fontSize: 12, opacity: .7, textAlign: "center" }}>
          ボタンをクリックしても押せます。グレー → 押す（カードセット）→ スカイブルー → 押す（ドロー）→ 消灯して展開 → 最後のカードが置かれたらグレー
        </p>
      </div>
    </main>
  );
}
