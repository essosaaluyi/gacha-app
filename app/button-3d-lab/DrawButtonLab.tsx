"use client";

import { useEffect, useRef, useState } from "react";
import { mountDrawButton3D, type DrawButton3D, type LampState } from "@/lib/button-3d/runtime";

const LABEL: Record<LampState, string> = {
  gray: "グレー（待機中：押すとカードをセット）",
  sky: "スカイブルー（カードセット済み：次の押下待ち）",
  off: "消灯（ドロー済み）",
};

export default function DrawButtonLab() {
  const host = useRef<HTMLDivElement>(null);
  const [button, setButton] = useState<DrawButton3D | null>(null);
  const [lamp, setLamp] = useState<LampState>("gray");
  const [sound, setSound] = useState(true);

  useEffect(() => {
    if (!host.current) return;
    let state: LampState = "gray";
    const go = (next: LampState) => { state = next; b.setLamp(next); setLamp(next); };
    // gray → (press: card set) → sky → (press: draw) → off. Pressing while off does nothing.
    const b = mountDrawButton3D(host.current, {
      onPress: () => {
        if (state === "gray") { go("sky"); return "cardSetToDisk"; }
        if (state === "sky") { go("off"); return "drawCard"; }
        return null;
      },
    });
    const reset = () => go("gray");
    (window as unknown as { __button3d?: unknown }).__button3d = { press: b.press, setLamp: (s: LampState) => go(s), reset };
    setButton({ ...b, setLamp: go });
    return () => { b.dispose(); setButton(null); };
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% 40%, #3a4456, #1b212c 70%)", color: "#e8eef8", display: "grid", placeItems: "center", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "grid", gap: 14, justifyItems: "center", width: "min(720px, 100%)" }}>
        <h1 style={{ margin: 0, fontSize: 18, letterSpacing: ".12em" }}>DRAW BUTTON 3D（試作）</h1>
        <div ref={host} style={{ width: "min(640px, 100%)", aspectRatio: "1 / 1" }} />
        <p data-lamp={lamp} style={{ margin: 0, fontSize: 15 }}>ランプ：{LABEL[lamp]}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" onClick={() => button?.press()}>押す</button>
          <button type="button" onClick={() => button?.setLamp("gray")}>リセット（グレーに戻す）</button>
          <button type="button" onClick={() => { const next = !sound; setSound(next); button?.setSound(next); }}>効果音：{sound ? "ON" : "OFF"}</button>
        </div>
        <p style={{ margin: 0, fontSize: 12, opacity: .7 }}>ドームをクリックしても押せます。グレー → 押す（カードセット）→ スカイブルー → 押す（ドロー）→ 消灯</p>
      </div>
    </main>
  );
}
