"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LANDING, sampleCabinetManualReveal } from "@/lib/battle-pixi/presentation/cabinetManualReveal";
import { cardQuadCssMatrix, type CardQuad } from "@/lib/battle-pixi/presentation/cardQuadProjection";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";

const slot: CardQuad = [508, 156, 689, 156, 707, 292, 492, 292];
const controls = [
  { key: "floatMs", label: "浮く時間 (ms)", min: 0, max: 400 },
  { key: "dropMs", label: "落下時間 (ms)", min: 50, max: 400 },
  { key: "settleMs", label: "接地後に伏せる時間 (ms)", min: 30, max: 250 },
  { key: "lift", label: "浮き上がる高さ", min: 0, max: 30 },
  { key: "pitch", label: "接地時の奥側の浮き", min: 0, max: 50 },
] as const;

export default function CardLandingWorkstation() {
  const [settings, setSettings] = useState(DEFAULT_LANDING);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const duration = 320 + settings.floatMs + settings.dropMs + settings.settleMs;
  const sample = sampleCabinetManualReveal(slot, time, 1.787, 61, true, settings);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now();
    let frame: number;
    function tick(now: number) {
      const elapsed = Math.min(duration, (now - started) * (slow ? 0.25 : 1));
      setTime(elapsed);
      if (elapsed < duration) frame = requestAnimationFrame(tick);
      else setPlaying(false);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, slow, duration]);

  return (
    <main style={{ maxWidth: 960, margin: "auto", padding: 24, color: "#e8ecf2", background: "#141b23", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 26 }}>カード着地ワークステーション</h1>
      <p>バトルと同じ動きで再生します。調整値はこのページ内の試写に反映されます。</p>
      <div style={{ position: "relative", height: 260, overflow: "hidden", background: "#101a19", border: "1px solid #577369" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", width: 1200, marginLeft: -600, transform: "scale(.82,.46)", transformOrigin: "top center" }}>
          <div style={{ position: "absolute", top: 156, left: 492, width: 215, height: 136, background: "#273e35", border: "2px solid #7a8f71" }} />
          {/* eslint-disable-next-line @next/next/no-img-element -- The transform uses the same intrinsic card dimensions as the game. */}
          <img alt={sample.face ? "表向きのカード" : "裏向きのカード"} src={sample.face ? "/images/battle-symbols/soft-edge/attack.webp" : PLAYER_CARD_BACK_IMAGE}
            style={{ position: "absolute", top: 0, left: 0, width: 132, height: 198, transformOrigin: "0 0", transform: cardQuadCssMatrix(sample.quad) }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBlock: 16 }}>
        <button type="button" onClick={() => { setTime(0); setPlaying(true); }} disabled={playing}>再生</button>
        <label><input type="checkbox" checked={slow} onChange={event => setSlow(event.target.checked)} /> 1/4倍速</label>
        <button type="button" onClick={() => { setPlaying(false); setTime(0); setSettings(DEFAULT_LANDING); }}>バトルの初期値に戻す</button>
      </div>
      <label style={{ display: "grid" }}>再生位置 {Math.round(time)} / {duration} ms
        <input type="range" min={0} max={duration} value={Math.min(time, duration)} onChange={event => { setPlaying(false); setTime(event.target.valueAsNumber); }} />
      </label>
      {controls.map(({ key, label, min, max }) => (
        <label key={key} style={{ display: "grid", marginTop: 12 }}>{label}　{settings[key]}
          <input type="range" min={min} max={max} value={settings[key]} onChange={event => {
            setPlaying(false);
            setTime(0);
            setSettings({ ...settings, [key]: event.target.valueAsNumber });
          }} />
        </label>
      ))}
    </main>
  );
}
