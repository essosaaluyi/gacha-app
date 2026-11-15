"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ALLY_PREVIEW_CHARACTERS, AllyPresentationPreview } from "@/components/battle/BattleSpawnScene";
import {
  DEFAULT_ALLY_PRESENTATION,
  ALLY_IDLE_CONTROLS,
  ALLY_PRESENTATION_KEY,
  ALLY_SUMMON_CONTROLS,
  readAllyPresentation,
} from "@/lib/battle-pixi/presentation/allyPresentation";

export default function AllyPresentationWorkstation() {
  const [placement, setPlacement] = useState(DEFAULT_ALLY_PRESENTATION);
  const [character, setCharacter] = useState("R1");
  const [preview, setPreview] = useState({ take: 0, animate: false });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPlacement(readAllyPresentation()));
    return () => cancelAnimationFrame(frame);
  }, []);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      window.localStorage.setItem(ALLY_PRESENTATION_KEY, JSON.stringify(placement));
      setMessage("保存しました。同じブラウザのバトル画面に反映されます。");
    } catch {
      setMessage("保存できませんでした。画面の調整値を控えてください。");
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "auto", padding: 24, color: "#e9ecef" }}>
      <h1>味方の待機位置・召喚調整</h1>
      <label style={{ display: "block", marginBlock: 12 }}>プレビューするキャラ　
        <select style={{ color: "CanvasText", background: "Canvas" }} value={character} onChange={event => {
          setCharacter(event.target.value);
          setPreview(previous => ({ ...previous, animate: false }));
        }}>
          {ALLY_PREVIEW_CHARACTERS.map(({ id, name }) => <option key={id} value={id}>{id} · {name}</option>)}
        </select>
      </label>
      <div className="battle-cabinet-screen" style={{
        position: "relative", aspectRatio: "1250 / 618", overflow: "hidden",
        background: "#14211a url('/images/battle-assets/stage-day-field-cabinet.v2.webp') center / cover",
        border: "1px solid #74867c",
      }}>
        <div className="battle-spawn-scene">
          <div className="battle-spawn-camera">
            <AllyPresentationPreview key={`${character}:${preview.take}`} character={character}
              placement={placement} animateSummon={preview.animate} />
          </div>
        </div>
      </div>
      <form onSubmit={save}>
        <h2 style={{ marginTop: 16 }}>待機位置とサイズ</h2>
        {ALLY_IDLE_CONTROLS.map(({ key, label, min, max }) => (
          <label key={key} style={{ display: "grid", marginBlock: 14 }}>
            {label}　{placement[key]}%
            <input type="range" min={min} max={max} value={placement[key]} onChange={event => {
              setPlacement({ ...placement, [key]: event.target.valueAsNumber });
              setMessage("");
            }} />
          </label>
        ))}
        <h2>召喚アニメーション</h2>
        <label>
          <input type="checkbox" checked={placement.summonEnabled} onChange={event => {
            setPlacement({ ...placement, summonEnabled: event.target.checked });
            setMessage("");
          }} /> 共通の召喚アニメーションをバトルで使う
        </label>
        {ALLY_SUMMON_CONTROLS.map(({ key, label, min, max, unit }) => (
          <label key={key} style={{ display: "grid", marginBlock: 14 }}>
            {label}　{placement[key]}{unit}
            <input type="range" min={min} max={max} value={placement[key]} onChange={event => {
              setPlacement({ ...placement, [key]: event.target.valueAsNumber });
              setMessage("");
            }} />
          </label>
        ))}
        <button type="button" style={{ marginBottom: 14 }} onClick={() =>
          setPreview(previous => ({ take: previous.take + 1, animate: true }))}>
          召喚を再生
        </button>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
          <button type="submit">このブラウザのバトルに適用</button>
          <button type="button" onClick={() => {
            setPlacement(DEFAULT_ALLY_PRESENTATION);
            setPreview(previous => ({ ...previous, animate: false }));
            setMessage("");
          }}>初期値に戻す</button>
          <a href="/battle">バトルを開く</a>
        </div>
        <p role="status">{message}</p>
      </form>
    </main>
  );
}
