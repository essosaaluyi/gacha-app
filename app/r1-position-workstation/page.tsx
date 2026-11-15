"use client";

import { useState, type FormEvent } from "react";
import { R1IdlePreview } from "@/components/battle/BattleSpawnScene";
import {
  DEFAULT_R1_IDLE_PLACEMENT,
  R1_IDLE_CONTROLS,
  R1_IDLE_PLACEMENT_KEY,
  readR1IdlePlacement,
} from "@/lib/battle-pixi/presentation/r1IdlePlacement";

export default function R1PositionWorkstation() {
  const [placement, setPlacement] = useState(readR1IdlePlacement);
  const [message, setMessage] = useState("");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      window.localStorage.setItem(R1_IDLE_PLACEMENT_KEY, JSON.stringify(placement));
      setMessage("保存しました。同じブラウザのバトル画面に反映されます。");
    } catch {
      setMessage("保存できませんでした。画面の調整値を控えてください。");
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "auto", padding: 24, color: "#e9ecef" }}>
      <h1>R1の位置・サイズ調整</h1>
      <p>Triplets Baby Dragonの待機ループを見ながら調整できます。</p>
      <div className="battle-cabinet-screen" style={{
        position: "relative", aspectRatio: "1250 / 618", overflow: "hidden",
        background: "#14211a url('/images/battle-assets/stage-day-field-cabinet.v2.webp') center / cover",
        border: "1px solid #74867c",
      }}>
        <div className="battle-spawn-scene">
          <div className="battle-spawn-camera"><R1IdlePreview placement={placement} /></div>
        </div>
      </div>
      <form onSubmit={save}>
        {R1_IDLE_CONTROLS.map(({ key, label, min, max }) => (
          <label key={key} style={{ display: "grid", marginBlock: 14 }}>
            {label}　{placement[key]}%
            <input type="range" min={min} max={max} value={placement[key]} onChange={event => {
              setPlacement({ ...placement, [key]: event.target.valueAsNumber });
              setMessage("");
            }} />
          </label>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
          <button type="submit">このブラウザのバトルに適用</button>
          <button type="button" onClick={() => { setPlacement(DEFAULT_R1_IDLE_PLACEMENT); setMessage(""); }}>初期値に戻す</button>
          <a href="/battle">バトルを開く</a>
        </div>
        <p role="status">{message}</p>
      </form>
    </main>
  );
}
