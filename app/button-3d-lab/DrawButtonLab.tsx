"use client";

import { useEffect, useRef, useState } from "react";
import { mountDrawButton3D, type DrawButton3D, type LampState } from "@/lib/button-3d/runtime";
import { mountPushButton3D } from "@/lib/button-3d/pushButton";

type Phase = "ready" | "set" | "dealing";
const LABEL: Record<Phase, string> = {
  ready: "グレー（待機中：押すとカードをセット）",
  set: "スカイブルー（カードセット済み：次の押下待ち）",
  dealing: "消灯（カードを展開中）",
};
const LAMP: Record<Phase, LampState> = { ready: "gray", set: "sky", dealing: "off" };
/** Simulated landing times after the second press (ms); the real game will call this on its own last landing. */
const LANDINGS = [900, 1500, 2100];

export default function DrawButtonLab() {
  const host = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<{ button: DrawButton3D; reset(): void } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [landed, setLanded] = useState(0);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(true);
  const [shape, setShape] = useState<"push" | "round">("push");

  useEffect(() => {
    if (!host.current) return;
    let state: Phase = "ready";
    let timers: number[] = [];
    const go = (next: Phase) => { state = next; b.setLamp(LAMP[next]); setPhase(next); };
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    // gray → press (card set) → sky → press (draw) → off while the cards deal → last card lands → gray.
    const mount = shape === "push" ? mountPushButton3D : mountDrawButton3D;
    const b = mount(host.current, {
      onPress: () => {
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
      },
    });
    const reset = () => { clear(); setLanded(0); go("ready"); };
    (window as unknown as { __button3d?: unknown }).__button3d = { press: b.press, setLamp: b.setLamp, vibrate: b.vibrate, setPaused: b.setPaused, advance: b.advance, reset };
    setApi({ button: b, reset });
    b.setSound(soundRef.current);
    return () => { clear(); b.dispose(); setApi(null); setPhase("ready"); setLanded(0); };
  }, [shape]);

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% 40%, #3a4456, #1b212c 70%)", color: "#e8eef8", display: "grid", placeItems: "center", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "grid", gap: 14, justifyItems: "center", width: "min(720px, 100%)" }}>
        <h1 style={{ margin: 0, fontSize: 18, letterSpacing: ".12em" }}>DRAW BUTTON 3D（試作）</h1>
        <div ref={host} style={{ width: "min(640px, 100%)", aspectRatio: "1 / 1" }} />
        <p data-phase={phase} style={{ margin: 0, fontSize: 15 }}>ランプ：{LABEL[phase]}</p>
        <div aria-label="テーブルに置かれたカード" style={{ display: "flex", gap: 8 }}>
          {LANDINGS.map((_, i) => (
            <span key={i} style={{ width: 34, height: 48, borderRadius: 4, border: "1px solid #8aa4c8", background: i < landed ? "#cfe3ff" : "transparent", transition: "background .2s" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" onClick={() => api?.button.press()}>押す</button>
          <button type="button" onClick={() => api?.reset()}>リセット</button>
          <button type="button" onClick={() => setShape(shape === "push" ? "round" : "push")}>形：{shape === "push" ? "盾型（パチンコ風）" : "丸型（r6）"}</button>
          <button type="button" onClick={() => api?.button.vibrate()}>当たり確定バイブ（保管用）</button>
          <button type="button" onClick={() => { const next = !sound; setSound(next); soundRef.current = next; api?.button.setSound(next); }}>効果音：{sound ? "ON" : "OFF"}</button>
        </div>
        <p style={{ margin: 0, fontSize: 12, opacity: .7, textAlign: "center" }}>
          ドームをクリックしても押せます。グレー → 押す（カードセット）→ スカイブルー → 押す（ドロー）→ 消灯して展開 → 最後のカードが置かれたらグレー
        </p>
      </div>
    </main>
  );
}
